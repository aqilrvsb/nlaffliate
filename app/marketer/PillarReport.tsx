"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Layers, Loader2, ListChecks, Target, TrendingUp, ChevronDown, Percent,
} from "lucide-react";
import DateRangeFilter from "@/components/DateRangeFilter";
import { resolveRange } from "@/lib/daterange";
import { fmtDate } from "@/lib/format";
import {
  PILLARS, PILLAR_COLUMNS, TOTAL_PILLAR_ITEMS, getPillar,
  type PillarColumnKey,
} from "@/lib/pillars";

type Entry = {
  id: number; level: number; item_no: number; entry_date: string;
  problem: string | null; solution: string | null;
  planning: string | null; execution: string | null;
};

const COL_DOT: Record<PillarColumnKey, string> = {
  problem: "bg-red-500", solution: "bg-amber-500",
  planning: "bg-sky-500", execution: "bg-emerald-500",
};
const COL_BAR: Record<PillarColumnKey, string> = {
  problem: "from-red-500 to-red-600", solution: "from-amber-500 to-amber-600",
  planning: "from-sky-500 to-sky-600", execution: "from-emerald-500 to-emerald-600",
};

export default function PillarReport() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<number | null>(null);

  const params = useSearchParams();
  const { from, to } = resolveRange(
    { from: params.get("from"), to: params.get("to"), all: params.get("all") },
    "month"
  );

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    const d = await fetch(`/api/pillars?${qs}`).then((r) => r.json());
    setEntries(d.entries || []);
    setLoading(false);
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    // A checklist item counts once per level no matter how many dates it was
    // touched on — otherwise daily updates would inflate coverage past 100%.
    const uniq = new Map<string, Entry>();
    for (const e of entries) uniq.set(`${e.level}:${e.item_no}`, e);
    const unique = [...uniq.values()];

    const perLevel = PILLARS.map((p) => {
      const mine = unique.filter((e) => e.level === p.level);
      const cols = Object.fromEntries(
        PILLAR_COLUMNS.map((c) => [
          c.key,
          mine.filter((e) => (e[c.key] || "").trim()).length,
        ])
      ) as Record<PillarColumnKey, number>;
      return {
        ...p,
        covered: mine.length,
        total: p.items.length,
        pct: Math.round((mine.length / p.items.length) * 100),
        cols,
      };
    });

    const colTotals = Object.fromEntries(
      PILLAR_COLUMNS.map((c) => [
        c.key,
        unique.filter((e) => (e[c.key] || "").trim()).length,
      ])
    ) as Record<PillarColumnKey, number>;

    return {
      perLevel,
      covered: unique.length,
      updates: entries.length,
      colTotals,
      pct: Math.round((unique.length / TOTAL_PILLAR_ITEMS) * 100),
      activeLevels: perLevel.filter((l) => l.covered > 0).length,
    };
  }, [entries]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="section-title">Reporting Pillar</h2>
        <p className="text-sm text-muted-fg">
          Liputan 10 pillar anda dalam julat tarikh yang dipilih.
        </p>
      </div>

      <DateRangeFilter count={entries.length} countNoun={["entri", "entri"]}
        defaultMode="month" />

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-fg">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Loading…
        </p>
      ) : (
        <>
          {/* Headline */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-gradient-to-br from-primary to-primary-hover p-5 text-white shadow-lift sm:col-span-2">
              <Percent className="mb-2 h-4 w-4 text-white/80" aria-hidden="true" />
              <p className="text-3xl font-extrabold leading-tight">{stats.pct}%</p>
              <p className="text-sm text-white/90">Liputan keseluruhan pillar</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/25">
                <div className="h-full rounded-full bg-white transition-all duration-500"
                  style={{ width: `${stats.pct}%` }} />
              </div>
              <p className="mt-2 text-xs text-white/75">
                {stats.covered} daripada {TOTAL_PILLAR_ITEMS} item diisi
              </p>
            </div>

            <Stat Icon={Layers} label="Level aktif" value={`${stats.activeLevels}/10`} />
            <Stat Icon={ListChecks} label="Item diisi" value={stats.covered} />
            <Stat Icon={TrendingUp} label="Jumlah kemaskini" value={stats.updates}
              sub="termasuk kemaskini berulang" className="sm:col-span-2" />
            <Stat Icon={Target} label="Item belum disentuh"
              value={TOTAL_PILLAR_ITEMS - stats.covered} className="sm:col-span-2" />
          </div>

          {/* Column coverage */}
          <div className="card">
            <h3 className="mb-3 font-bold text-ink">Liputan mengikut kolum</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PILLAR_COLUMNS.map((c) => {
                const n = stats.colTotals[c.key];
                const pct = Math.round((n / TOTAL_PILLAR_ITEMS) * 100);
                return (
                  <div key={c.key}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 font-semibold text-ink">
                        <span className={`h-2 w-2 rounded-full ${COL_DOT[c.key]}`} />
                        {c.emoji} {c.label}
                      </span>
                      <span className="text-muted-fg">{n}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full bg-gradient-to-r ${COL_BAR[c.key]} transition-all duration-500`}
                        style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-fg">{pct}% · {c.owner}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Per-level breakdown */}
          <div className="space-y-2">
            {stats.perLevel.map((l) => (
              <div key={l.level} className="card !p-0 overflow-hidden">
                <button
                  onClick={() => setOpen(open === l.level ? null : l.level)}
                  className="flex w-full cursor-pointer items-center gap-3 p-4 text-left transition-colors duration-200 hover:bg-white/50">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${
                    l.covered > 0 ? "bg-primary text-white" : "bg-muted text-muted-fg"
                  }`}>
                    {l.level}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-ink">{l.title}</span>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted">
                      <span className="block h-full rounded-full bg-gradient-to-r from-primary to-primary-hover transition-all duration-500"
                        style={{ width: `${l.pct}%` }} />
                    </span>
                  </span>

                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-extrabold text-ink">{l.pct}%</span>
                    <span className="block text-xs text-muted-fg">{l.covered}/{l.total}</span>
                  </span>

                  <ChevronDown aria-hidden="true"
                    className={`h-4 w-4 shrink-0 text-muted-fg transition-transform duration-200 ${
                      open === l.level ? "rotate-180" : ""
                    }`} />
                </button>

                {open === l.level && (
                  <LevelDetail level={l.level} entries={entries.filter((e) => e.level === l.level)} />
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function LevelDetail({ level, entries }: { level: number; entries: Entry[] }) {
  const pillar = getPillar(level)!;
  if (entries.length === 0)
    return (
      <p className="border-t border-line px-4 py-6 text-center text-sm text-muted-fg">
        Tiada item diisi untuk level ini dalam julat tarikh ini.
      </p>
    );

  return (
    <div className="border-t border-line overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted-fg">
          <tr>
            <th className="px-3 py-2 font-semibold">Item</th>
            <th className="px-3 py-2 font-semibold">Tarikh</th>
            {PILLAR_COLUMNS.map((c) => (
              <th key={c.key} className="px-3 py-2 font-semibold">{c.emoji} {c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-t border-line/60 align-top">
              <td className="px-3 py-2 font-semibold text-ink">
                {pillar.items.find((i) => i.no === e.item_no)?.name ?? `#${e.item_no}`}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-fg">
                {fmtDate(e.entry_date)}
              </td>
              {PILLAR_COLUMNS.map((c) => (
                <td key={c.key} className="px-3 py-2 text-muted-fg">
                  {(e[c.key] || "").trim() || <span className="text-muted-fg/40">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Stat({
  Icon, label, value, sub, className = "",
}: {
  Icon: typeof Layers;
  label: string;
  value: React.ReactNode;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={`glass rounded-2xl p-4 shadow-lift ${className}`}>
      <Icon className="mb-2 h-4 w-4 text-muted-fg" aria-hidden="true" />
      <p className="text-xl font-extrabold leading-tight text-ink">{value}</p>
      <p className="text-xs text-muted-fg">{label}</p>
      {sub && <p className="text-[11px] text-muted-fg/70">{sub}</p>}
    </div>
  );
}
