"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Click-to-sort for a table. Third click clears back to the tab's own default
 * order, so sorting is always escapable. Nulls sink to the bottom in both
 * directions — an empty cell is not a value, and floating them to the top
 * buries the rows you asked to see.
 */
export function useTableSort<T>(rows: T[]) {
  const [sort, setSort] = useState<{ k: string; dir: 1 | -1 } | null>(null);

  const sorted = sort
    ? [...rows].sort((a: any, b: any) => {
        const x = a[sort.k], y = b[sort.k];
        if (x == null && y == null) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        return (typeof x === "number" && typeof y === "number"
          ? x - y
          : String(x).localeCompare(String(y))) * sort.dir;
      })
    : rows;

  function toggleSort(k: string) {
    setSort((cur) =>
      cur && cur.k === k ? (cur.dir === 1 ? { k, dir: -1 } : null) : { k, dir: 1 }
    );
  }

  return { sorted, sort, toggleSort };
}

export default function SortTh({
  k, sort, on, right, children,
}: {
  k: string;
  sort: { k: string; dir: 1 | -1 } | null;
  on: (k: string) => void;
  right?: boolean;
  children: React.ReactNode;
}) {
  const active = sort?.k === k;
  return (
    <th className={`px-4 py-3 font-semibold ${right ? "text-right" : ""}`}>
      <button onClick={() => on(k)}
        aria-sort={active ? (sort!.dir === 1 ? "ascending" : "descending") : "none"}
        className={`inline-flex cursor-pointer items-center gap-1 uppercase tracking-wide transition-colors duration-200 hover:text-ink ${
          active ? "text-ink" : ""
        } ${right ? "flex-row-reverse" : ""}`}>
        {children}
        <ChevronDown aria-hidden="true"
          className={`h-3 w-3 shrink-0 transition-transform duration-200 ${
            active ? (sort!.dir === 1 ? "rotate-180" : "") : "opacity-25"
          }`} />
      </button>
    </th>
  );
}
