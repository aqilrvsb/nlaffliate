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

  globalForDb._sql = postgres(url, {
    // Supabase's transaction pooler doesn't support prepared statements.
    prepare: false,
    // Serverless: keep the footprint tiny and don't hold sockets open.
    max: 1,
    idle_timeout: 20,
    connect_timeout: 15,
    // A frozen serverless container wakes with a socket the pooler has long
    // since dropped. Keep-alive makes TCP notice the death instead of writing
    // queries into a black hole.
    keep_alive: 10,
    connection: {
      // Server-side backstop: if the query does arrive, it cannot run forever.
      statement_timeout: 20_000,
      idle_in_transaction_session_timeout: 20_000,
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
 * How long any single query may take before we give up on it.
 *
 * postgres.js has no client-side query timeout: if the socket is dead but
 * still open — which is what a thawed serverless container hands you — the
 * query is written and awaited forever. Vercel then kills the whole render at
 * its own limit, which is how a healthy database produced 300-second page
 * timeouts. Failing here instead turns a five-minute hang into a fast error.
 */
const QUERY_TIMEOUT_MS = 12_000;

async function withTimeout<T>(work: Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          // Drop the cached client so the next request dials a fresh socket
          // rather than inheriting the broken one.
          const dead = globalForDb._sql;
          globalForDb._sql = undefined;
          dead?.end({ timeout: 0 }).catch(() => {});
          reject(new Error(`Database query timed out after ${QUERY_TIMEOUT_MS}ms`));
        }, QUERY_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function prepare(query: string) {
  const q = toPg(query);
  return {
    async get<T = any>(...params: any[]): Promise<T | undefined> {
      const rows = await withTimeout(client().unsafe(q, params));
      return rows[0] as T | undefined;
    },
    async all<T = any>(...params: any[]): Promise<T[]> {
      const rows = await withTimeout(client().unsafe(q, params));
      return rows as unknown as T[];
    },
    async run(...params: any[]): Promise<RunResult> {
      const rows: any = await withTimeout(client().unsafe(q, params));
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
