"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useNavigate } from "@/lib/useNavigate";

export type TabDef = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  /** Colour of the pill when this tab is selected. */
  activeTone?: "primary" | "red" | "emerald";
};

/**
 * Tab pills driven by ?tab=. Mirrors the HCKCREA dashboard tab row
 * (icon + label + small count tag), restyled to the light rose system.
 */
export default function TabBar({
  tabs,
  active,
  param = "tab",
}: {
  tabs: TabDef[];
  active: string;
  /** Query key to drive. Override so a nested row doesn't fight ?tab=. */
  param?: string;
}) {
  const { navigate, prefetch, pending } = useNavigate();
  const pathname = usePathname();
  const params = useSearchParams();
  const [clicked, setClicked] = useState<string | null>(null);

  function hrefFor(key: string) {
    const next = new URLSearchParams(params.toString());
    if (key === tabs[0].key) next.delete(param);
    else next.set(param, key);
    next.delete("page"); // switching tabs starts at page 1
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function go(key: string) {
    setClicked(key);
    // scroll:false — switching tabs is an in-place swap. Next's default jump
    // to the top would throw the reader back above the KPI cards each click.
    navigate(hrefFor(key));
  }

  return (
    <div className="flex flex-wrap gap-2" role="tablist">
      {tabs.map((t) => {
        const Icon = t.icon;
        const on = t.key === active;
        const activeBg =
          t.activeTone === "red" ? "bg-red-600 text-white"
            : t.activeTone === "emerald" ? "bg-emerald-600 text-white"
            : "bg-primary text-primary-fg";
        const busy = pending && clicked === t.key;
        return (
          <button key={t.key} role="tab" aria-selected={on} aria-busy={busy || undefined}
            onClick={() => go(t.key)}
            onMouseEnter={() => prefetch(hrefFor(t.key))}
            onFocus={() => prefetch(hrefFor(t.key))}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200 ${
              on ? `${activeBg} shadow-lift` : "glass text-ink hover:bg-white"
            }`}>
            {busy
              ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              : <Icon className="h-4 w-4" />}
            {t.label}
            {typeof t.count === "number" && (
              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                on ? "bg-white/25 text-white" : "bg-muted text-muted-fg"
              }`}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
