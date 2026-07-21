/**
 * Minimal type declarations for Node's built-in `node:sqlite`.
 * @types/node@20 doesn't ship these yet (the module landed in Node 22.5+
 * and is unflagged from Node 24), so the production build can't resolve it.
 * Only the surface this app uses is declared.
 */
declare module "node:sqlite" {
  export interface StatementResultingChanges {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
  }

  export interface StatementSync {
    run(...params: any[]): StatementResultingChanges;
    get(...params: any[]): any;
    all(...params: any[]): any[];
  }

  export class DatabaseSync {
    constructor(location: string, options?: { open?: boolean; readOnly?: boolean });
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
