"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useNavigate } from "@/lib/useNavigate";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PAGE_SIZE } from "@/lib/pagination";

export default function Pagination({
  page,
  total,
  size = PAGE_SIZE,
}: {
  page: number;
  total: number;
  size?: number;
}) {
  const { navigate, prefetch, pending } = useNavigate();
  const pathname = usePathname();
  const params = useSearchParams();

  const totalPages = Math.max(1, Math.ceil(total / size));
  if (totalPages <= 1) return null;

  const current = Math.min(page, totalPages);

  function go(p: number) {
    const next = new URLSearchParams(params.toString());
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    const qs = next.toString();
    navigate(qs ? `${pathname}?${qs}` : pathname);
  }

  // Compact window of page numbers around the current page.
  const pages: number[] = [];
  const start = Math.max(1, Math.min(current - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) pages.push(i);

  const first = (current - 1) * size + 1;
  const last = Math.min(current * size, total);

  return (
    <nav className="mt-4 flex flex-wrap items-center justify-between gap-3" aria-label="Pagination">
      <p className="text-xs text-muted-fg">
        Showing <span className="font-semibold text-ink">{first}–{last}</span> of{" "}
        <span className="font-semibold text-ink">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        <button onClick={() => go(current - 1)} disabled={current === 1}
          className="btn-ghost !px-2 !py-2 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        {start > 1 && <span className="px-1 text-xs text-muted-fg">…</span>}

        {pages.map((p) => (
          <button key={p} onClick={() => go(p)}
            aria-current={p === current ? "page" : undefined}
            className={`min-w-[36px] cursor-pointer rounded-xl px-2.5 py-2 text-sm font-semibold transition-colors duration-200 ${
              p === current
                ? "bg-primary text-primary-fg shadow-lift"
                : "border border-line bg-white/70 text-ink hover:bg-white"
            }`}>
            {p}
          </button>
        ))}

        {end < totalPages && <span className="px-1 text-xs text-muted-fg">…</span>}

        <button onClick={() => go(current + 1)} disabled={current === totalPages}
          className="btn-ghost !px-2 !py-2 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next page">
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
