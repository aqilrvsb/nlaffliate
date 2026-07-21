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

/** `?` -> `$1, $2, ...` (ignores `?` inside quoted strings). */
function toPg(query: string): string {
  let i = 0;
  let out = "";
  let quote: string | null = null;
  for (let c = 0; c < query.length; c++) {
    const ch = query[c];
    if (quote) {
      if (ch === quote) quote = null;
      out += ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      out += ch;
      continue;
    }
    out += ch === "?" ? `$${++i}` : ch;
  }
  return out;
}

export type RunResult = {
  changes: number;
  /** Populated when the statement ends with `RETURNING id`. */
  lastInsertRowid: number | null;
};

function prepare(query: string) {
  const q = toPg(query);
  return {
    async get<T = any>(...params: any[]): Promise<T | undefined> {
      const rows = await client().unsafe(q, params);
      return rows[0] as T | undefined;
    },
    async all<T = any>(...params: any[]): Promise<T[]> {
      const rows = await client().unsafe(q, params);
      return rows as unknown as T[];
    },
    async run(...params: any[]): Promise<RunResult> {
      const rows: any = await client().unsafe(q, params);
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
