import postgres from "postgres";

/**
 * Postgres (Supabase) data layer.
 *
 * Keeps the same `db.prepare(sql).get/all/run(...)` shape the app already
 * uses — but every call is now async, and SQLite-style `?` placeholders are
 * rewritten to Postgres `$1..$n` so the existing SQL strings work unchanged.
 *
 * The connection is created lazily (never at module import) so `next build`
 * can collect page data without a live database, and so each serverless
 * invocation opens at most one pooled connection.
 */

const globalForDb = globalThis as unknown as { _sql?: postgres.Sql };

function client(): postgres.Sql {
  if (globalForDb._sql) return globalForDb._sql;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");

  // No await between this check and the assignment below, so concurrent
  // callers after a reset all observe the same freshly-built client rather
  // than each spinning up their own.
  globalForDb._sql = postgres(url, {
    // Supabase's transaction pooler doesn't support prepared statements.
    prepare: false,
    /**
     * One connection per instance, because serverless scales by instance.
     *
     * A burst spins up roughly an instance per concurrent request, so the
     * pooler sees max × instances. Raising this to 3 — never mind 8 — pushed
     * a hundred concurrent users straight through Supavisor's 200-client
     * ceiling and it began refusing clients outright (EMAXCONN), which is far
     * worse than queueing.
     *
     * One apiece keeps the total at roughly the instance count. The
     * serialisation this once caused was really the timeout handler tearing
     * down the shared client; with that fixed, queries simply queue for the
     * few milliseconds these take.
     */
    max: 2,
    idle_timeout: 5,
    connect_timeout: 15,
    // A frozen serverless container wakes with a socket the pooler has long
    // since dropped. Keep-alive makes TCP notice the death instead of writing
    // queries into a black hole.
    keep_alive: 10,
    connection: {
      // Server-side backstop, kept under the 20s function limit so a runaway
      // query aborts here (releasing the pooled connection) instead of being
      // guillotined mid-flight by the platform.
      statement_timeout: 12_000,
      idle_in_transaction_session_timeout: 12_000,
    } as Record<string, number>,
    types: {
      // int8/bigint would otherwise arrive as strings, which silently breaks
      // arithmetic (0 + "12" === "012"). Ids and COUNT()s become numbers.
      bigint: {
        to: 20,
        from: [20],
        serialize: (v: any) => String(v),
        parse: (v: string) => Number(v),
      },
    },
  });
  return globalForDb._sql;
}

/**
 * `?` -> `$1, $2, ...`, ignoring `?` inside quoted strings and comments.
 *
 * Comments matter as much as quotes: an apostrophe in a `-- marketer's copy`
 * comment used to flip the scanner into string mode, so every placeholder
 * after it was left as a literal `?` and Postgres rejected the statement.
 */
function toPg(query: string): string {
  let i = 0;
  let out = "";
  let quote: string | null = null;
  let comment: "line" | "block" | null = null;

  for (let c = 0; c < query.length; c++) {
    const ch = query[c];
    const next = query[c + 1];

    if (comment === "line") {
      out += ch;
      if (ch === "\n") comment = null;
      continue;
    }
    if (comment === "block") {
      out += ch;
      if (ch === "*" && next === "/") { out += next; c++; comment = null; }
      continue;
    }
    if (quote) {
      if (ch === quote) quote = null;
      out += ch;
      continue;
    }

    if (ch === "-" && next === "-") { comment = "line"; out += ch; continue; }
    if (ch === "/" && next === "*") { comment = "block"; out += ch; continue; }
    if (ch === "'" || ch === '"') { quote = ch; out += ch; continue; }

    out += ch === "?" ? `$${++i}` : ch;
  }
  return out;
}

export type RunResult = {
  changes: number;
  /** Populated when the statement ends with `RETURNING id`. */
  lastInsertRowid: number | null;
};

/**
 * How long any single query may take before we treat the socket as dead.
 *
 * postgres.js has no client-side query timeout: if the socket is dead but
 * still open — which is what a thawed serverless container hands you — the
 * query is written and awaited forever. This MUST stay under the page's
 * `maxDuration` (60s) so it can actually fire, but it also has to be generous
 * enough that a legitimate cold connect — a Supabase compute resume can take
 * several seconds — is NOT mistaken for a dead socket and killed mid-handshake.
 * A warm query here is ~20ms; this window is pure headroom for a cold start,
 * and only a genuinely wedged socket ever reaches it. Two attempts (18s each)
 * plus overhead still sit comfortably inside the 60s function budget.
 */
const QUERY_TIMEOUT_MS = 18_000;

async function withTimeout<T>(work: Promise<T>, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`db-timeout:${label}`)),
          QUERY_TIMEOUT_MS
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Discard a client we believe is wedged so the next query reconnects fresh.
 *
 * Guarded on identity: when a whole page's worth of queries all time out on
 * the same dead socket at once, only the first discards it — the rest are
 * no-ops, and the very next `client()` builds a single replacement they all
 * share. The dead one is drained in the background; we never await it.
 */
function discard(stale: postgres.Sql) {
  if (globalForDb._sql === stale) {
    globalForDb._sql = undefined;
    stale.end({ timeout: 3 }).catch(() => {});
  }
}

/**
 * Run one query, and if it stalls on a dead pooled socket, reset the client
 * and try exactly once more on a fresh connection. A thawed serverless
 * container routinely hands you a socket the pooler dropped long ago; the
 * first write vanishes into it, the retry lands on a live connection and
 * returns in milliseconds. Without this, a poisoned warm instance timed out
 * every request until it was recycled.
 */
async function runQuery(q: string, params: any[]): Promise<any> {
  const first = client();
  try {
    return await withTimeout(first.unsafe(q, params), "1");
  } catch (e: any) {
    discard(first);
    // Retry once on a guaranteed-fresh client. If this also fails, it is a
    // genuine fault (bad SQL, DB down) and the error propagates.
    const second = client();
    return await withTimeout(second.unsafe(q, params), "2");
  }
}

function prepare(query: string) {
  const q = toPg(query);
  return {
    async get<T = any>(...params: any[]): Promise<T | undefined> {
      const rows = await runQuery(q, params);
      return rows[0] as T | undefined;
    },
    async all<T = any>(...params: any[]): Promise<T[]> {
      const rows = await runQuery(q, params);
      return rows as unknown as T[];
    },
    async run(...params: any[]): Promise<RunResult> {
      const rows: any = await runQuery(q, params);
      return {
        changes: typeof rows.count === "number" ? rows.count : rows.length ?? 0,
        lastInsertRowid: rows?.[0]?.id != null ? Number(rows[0].id) : null,
      };
    },
  };
}

export const db = {
  prepare,
  async exec(query: string): Promise<void> {
    await client().unsafe(query);
  },
};

export default db;
