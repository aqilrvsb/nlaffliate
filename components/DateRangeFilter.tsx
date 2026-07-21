"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CalendarRange, Link2 } from "lucide-react";
import { resolveRange, todayKL, monthRangeKL } from "@/lib/daterange";

type ProfileOption = { id: number; label: string; url?: string };

/**
 * Filter bar driven by URL params:
 *   ?from=YYYY-MM-DD&to=YYYY-MM-DD&profile=<id>
 * Server pages read the same params from searchParams; client pages
 * read them with useSearchParams. Pass `profiles` to show the
 * "Link Profile" dropdown (All + each TikTok link).
 */
export default function DateRangeFilter({
  count,
  countNoun = ["live", "lives"],
  profiles,
  defaultMode = "today",
}: {
  count?: number;
  /** [singular, plural] for the count label — not every page counts lives. */
  countNoun?: [string, string];
  profiles?: ProfileOption[];
  defaultMode?: "today" | "month" | "all";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // Default range depends on the tab's mode (today / month / all).
  const { from, to, showAll } = resolveRange(
    { from: params.get("from"), to: params.get("to"), all: params.get("all") },
    defaultMode
  );
  const profile = params.get("profile") || "";

  // Which quick-range (if any) is currently active.
  const today = todayKL();
  const month = monthRangeKL();
  const isToday = !showAll && from === today && to === today;
  const isMonth = !showAll && from === month.from && to === month.to;

  function update(key: "from" | "to" | "profile", value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    // Editing a date leaves "all" mode; changing a filter returns to page 1.
    if (key !== "profile") next.delete("all");
    next.delete("page");
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  /** Today only. Sets the dates explicitly so it works regardless of the
      tab's default mode (month/all). */
  function resetToday() {
    const t = todayKL();
    const next = new URLSearchParams(params.toString());
    next.set("from", t);
    next.set("to", t);
    next.delete("all");
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  /** Whole of the current month. */
  function thisMonth() {
    const m = monthRangeKL();
    const next = new URLSearchParams(params.toString());
    next.set("from", m.from);
    next.set("to", m.to);
    next.delete("all");
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="card mb-4 flex flex-wrap items-end gap-3">
      <div className="flex items-center gap-2 self-center pr-1">
        <CalendarRange className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-sm font-bold text-ink">Filter by date</span>
      </div>

      <div className="min-w-[150px] flex-1 sm:flex-none">
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg"
          htmlFor="from">Start date</label>
        <input id="from" type="date" className="input cursor-pointer !py-2"
          value={from} max={to || undefined}
          onChange={(e) => update("from", e.target.value)} />
      </div>

      <div className="min-w-[150px] flex-1 sm:flex-none">
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg"
          htmlFor="to">End date</label>
        <input id="to" type="date" className="input cursor-pointer !py-2"
          value={to} min={from || undefined}
          onChange={(e) => update("to", e.target.value)} />
      </div>

      {profiles && profiles.length > 0 && (
        <div className="min-w-[190px] flex-1 sm:flex-none">
          <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-fg"
            htmlFor="profile">
            <Link2 className="h-3 w-3" aria-hidden="true" />
            Link Profile
          </label>
          <select id="profile" className="input cursor-pointer !py-2"
            value={profile} onChange={(e) => update("profile", e.target.value)}>
            <option value="">All profiles</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-2 self-end">
        <button onClick={resetToday}
          className={`!py-2 ${isToday ? "btn" : "btn-ghost"}`} title="Show today only">
          Today
        </button>
        <button onClick={thisMonth}
          className={`!py-2 ${isMonth ? "btn" : "btn-ghost"}`} title="Show the current month">
          <CalendarRange className="h-4 w-4" aria-hidden="true" />Monthly
        </button>
      </div>

      {typeof count === "number" && (
        <span className="self-center text-xs text-muted-fg">
          {count} {count === 1 ? countNoun[0] : countNoun[1]}
          {showAll ? " total" : " in range"}
        </span>
      )}
    </div>
  );
}
