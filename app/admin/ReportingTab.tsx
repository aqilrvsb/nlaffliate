"use client";

import { Fragment, useState } from "react";
import { ChevronDown, Link2, TrendingUp, TrendingDown, Users, ShoppingBag, Timer, Wallet, CheckCircle2 } from "lucide-react";
import DateRangeFilter from "@/components/DateRangeFilter";
import SortTh, { useTableSort } from "@/components/SortableTable";
import {
  sumDurations, durationHours, commissionFor, durationToSeconds,
} from "@/lib/format";
import { profileName } from "@/lib/tiktok";

export type AdminLive = {
  booking_id: number; affiliate_id: number; affiliate: string;
  marketer: string | null;
  profile_id: number; profile_label: string;
  live_date: string; start_time: string; end_time: string | null; status: string;
  ads_budget: number | null; ad_spend: number | null;
  gross_revenue: number | null; roi: number | null;
  gmv: number | null; viewers: number | null; items_sold: number | null;
  duration_live: string | null;
};

export type AdminLink = {
  id: number; user_id: number; label: string; url: string;
  brand_name?: string | null;
  commission_type: "percent" | "hour" | null; commission_value: number | null;
};

export type AdminAffiliate = {
  id: number; name: string; email: string; phone: string | null;
  marketer_id: number | null; marketer_name: string | null;
};

function aggregate(lives: AdminLive[]) {
  const sum = (f: (l: AdminLive) => number | null) =>
    lives.reduce((s, l) => s + (f(l) || 0), 0);
  const spend = sum((l) => l.ad_spend);
  const gross = sum((l) => l.gross_revenue);
  return {
    gmv: sum((l) => l.gmv),
    viewers: sum((l) => l.viewers),
    items: sum((l) => l.items_sold),
    budget: sum((l) => l.ads_budget),
    spend, gross,
    // Only completed lives contribute airtime, matching the marketer console.
    duration: sumDurations(
      lives.filter((l) => l.status === "completed").map((l) => l.duration_live)
    ),
    // "6h 30m" sorts alphabetically as nonsense, so keep the raw seconds.
    durationSecs: lives
      .filter((l) => l.status === "completed")
      .reduce((sum, l) => sum + durationToSeconds(l.duration_live), 0),
    roi: spend > 0 ? Math.round((gross / spend) * 100) / 100 : null,
    hasBudget: lives.some((l) => l.ads_budget != null),
    hasSpend: lives.some((l) => l.ad_spend != null),
    hasGross: lives.some((l) => l.gross_revenue != null),
  };
}

/**
 * The marketer's Reporting Affiliate, for admin — across every marketer, with
 * a Marketer column so an affiliate's numbers can be traced back to whoever
 * manages them.
 */
export default function AdminReportingTab({
  affiliates, rows, links,
}: { affiliates: AdminAffiliate[]; rows: AdminLive[]; links: AdminLink[] }) {
  const [showSubs, setShowSubs] = useState(false);
  const [marketer, setMarketer] = useState("");

  const marketerNames = [...new Set(affiliates.map((a) => a.marketer_name).filter(Boolean))] as string[];

  const scoped = marketer
    ? affiliates.filter((a) => a.marketer_name === marketer)
    : affiliates;

  // Drop affiliates with nothing in range so the table isn't all-zero rows.
  const active = scoped.filter((a) => rows.some((l) => l.affiliate_id === a.id));

  function subsFor(a: AdminAffiliate) {
    const mine = rows.filter((l) => l.affiliate_id === a.id);
    const byProfile = new Map<number, AdminLive[]>();
    for (const l of mine) {
      const list = byProfile.get(l.profile_id) || [];
      list.push(l);
      byProfile.set(l.profile_id, list);
    }
    return [...byProfile.entries()].map(([pid, ls]) => {
      const agg = aggregate(ls);
      const link = links.find((x) => x.id === pid);
      // Paid on the duration actually streamed, not the booked slot.
      const hours = ls
        .filter((l) => l.status === "completed")
        .reduce((s, l) => s + durationHours(l.duration_live), 0);
      return {
        pid, agg, link, hours,
        commission: link ? commissionFor(link, agg.gmv, hours) : 0,
        label: link
          ? profileName(link.brand_name, link.url)
          : ls[0]?.profile_label ?? "—",
      };
    });
  }

  const totals = aggregate(rows.filter((l) => active.some((a) => a.id === l.affiliate_id)));

  // One flat row per affiliate so every column can sort — the sort key has to
  // sit beside the formatted value, hence durationSecs beside duration.
  const unsorted = active.map((a) => {
    const r = aggregate(rows.filter((l) => l.affiliate_id === a.id));
    const subs = subsFor(a);
    const income = subs.reduce((s, x) => s + x.commission, 0);
    return {
      a, r, subs, income,
      name: a.name, marketer: a.marketer_name,
      gmv: r.gmv, viewers: r.viewers, items: r.items,
      durationSecs: r.durationSecs,
      budget: r.hasBudget ? r.budget : null,
      spend: r.hasSpend ? r.spend : null,
      gross: r.hasGross ? r.gross : null,
      roi: r.roi,
    };
  });
  const { sorted: tableRows, sort, toggleSort } = useTableSort(unsorted);
  const totalCommission = tableRows.reduce((s, x) => s + x.income, 0);
  const rm = (n: number, has: boolean) => (has ? `RM${n.toFixed(2)}` : "—");

  return (
    <div className="space-y-5">
      <div>
        <h2 className="section-title">Reporting Affiliate</h2>
        <p className="text-sm text-muted-fg">
          Semua affiliate merentas semua marketer, dengan komisyen setiap link.
        </p>
      </div>

      <DateRangeFilter count={rows.length} defaultMode="month" />

      <div className="card flex flex-wrap items-end gap-3">
        <div className="min-w-[220px]">
          <label className="label" htmlFor="adm-marketer">Marketer</label>
          <select id="adm-marketer" className="input cursor-pointer !py-2 text-sm"
            value={marketer} onChange={(e) => setMarketer(e.target.value)}>
            <option value="">All Marketers</option>
            {marketerNames.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <p className="pb-2 text-xs text-muted-fg">
          {marketer ? "Menunjukkan satu marketer sahaja." : "Menunjukkan semua marketer."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi Icon={Users} label="Total Affiliate" value={active.length} />
        <Kpi Icon={TrendingUp} label="Affiliate Sales" value={`RM${totals.gmv.toFixed(2)}`} fill="yellow" />
        <Kpi Icon={Users} label="Affiliate Viewers" value={totals.viewers} />
        <Kpi Icon={ShoppingBag} label="Affiliate Items" value={totals.items} />
        <Kpi Icon={Timer} label="Affiliate Duration" value={totals.duration} />
        <Kpi Icon={Wallet} label="Affiliate Budget" value={rm(totals.budget, totals.hasBudget)} />
        <Kpi Icon={Wallet} label="Affiliate Spend" value={rm(totals.spend, totals.hasSpend)} fill="red" />
        <Kpi Icon={TrendingUp} label="Affiliate Gross Revenue" value={rm(totals.gross, totals.hasGross)} fill="emerald" />
        <Kpi Icon={(totals.roi ?? 0) >= 1 ? TrendingUp : TrendingDown} label="Affiliate ROI"
          value={totals.roi != null ? totals.roi : "—"} />
        <Kpi Icon={Wallet} label="Total Commission" value={`RM${totalCommission.toFixed(2)}`} fill="emerald" />
      </div>

      <div className="flex justify-end">
        <button onClick={() => setShowSubs((o) => !o)} className="btn-ghost !py-2 text-xs">
          <ChevronDown aria-hidden="true"
            className={`h-4 w-4 transition-transform duration-200 ${showSubs ? "rotate-180" : ""}`} />
          {showSubs ? "Sembunyi sub profile" : "Papar sub profile"}
        </button>
      </div>

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[1180px] text-sm">
          <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted-fg">
            <tr>
              <SortTh k="name" sort={sort} on={toggleSort}>Affiliate</SortTh>
              <SortTh k="marketer" sort={sort} on={toggleSort}>Marketer</SortTh>
              <SortTh k="gmv" sort={sort} on={toggleSort} right>Sales</SortTh>
              <SortTh k="viewers" sort={sort} on={toggleSort} right>Viewers</SortTh>
              <SortTh k="items" sort={sort} on={toggleSort} right>Items</SortTh>
              <SortTh k="durationSecs" sort={sort} on={toggleSort}>Duration</SortTh>
              <SortTh k="budget" sort={sort} on={toggleSort} right>Budget</SortTh>
              <SortTh k="spend" sort={sort} on={toggleSort} right>Spend</SortTh>
              <SortTh k="gross" sort={sort} on={toggleSort} right>Gross Rev.</SortTh>
              <SortTh k="roi" sort={sort} on={toggleSort} right>ROI</SortTh>
              <th className="px-4 py-3 font-semibold">Jenis Komisyen</th>
              <th className="px-4 py-3 text-right font-semibold">Rate</th>
              <SortTh k="income" sort={sort} on={toggleSort} right>Komisyen</SortTh>
            </tr>
          </thead>
          <tbody>
            {tableRows.map(({ a, r, subs, income }) => {
              return (
                <Fragment key={a.id}>
                  <tr className="border-t border-line bg-white/40">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink">{a.name}</div>
                      <div className="text-xs text-muted-fg">{a.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {a.marketer_name
                        ? <span className="chip bg-accent/10 text-accent">{a.marketer_name}</span>
                        : <span className="text-muted-fg/50">— Unassigned —</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">RM{r.gmv.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">{r.viewers}</td>
                    <td className="px-4 py-3 text-right">{r.items}</td>
                    <td className="px-4 py-3">{r.duration}</td>
                    <td className="px-4 py-3 text-right">{rm(r.budget, r.hasBudget)}</td>
                    <td className="px-4 py-3 text-right">{rm(r.spend, r.hasSpend)}</td>
                    <td className="px-4 py-3 text-right">{rm(r.gross, r.hasGross)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">{r.roi != null ? r.roi : "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-fg" colSpan={2}>Total Income</td>
                    <td className="px-4 py-3 text-right font-extrabold text-emerald-700">
                      RM{income.toFixed(2)}
                    </td>
                  </tr>

                  {showSubs && subs.map((s) => (
                    <tr key={`${a.id}-${s.pid}`} className="border-t border-line/40 text-[13px]">
                      <td className="py-2 pl-10 pr-4">
                        <span className="flex items-center gap-1.5 text-muted-fg">
                          <Link2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-2" />
                      <td className="px-4 py-2 text-right">RM{s.agg.gmv.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">{s.agg.viewers}</td>
                      <td className="px-4 py-2 text-right">{s.agg.items}</td>
                      <td className="px-4 py-2">
                        {s.agg.duration}
                        {s.link?.commission_type === "hour" && (
                          <span className="ml-1 text-[11px] text-muted-fg">({s.hours.toFixed(2)}j dibayar)</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">{rm(s.agg.budget, s.agg.hasBudget)}</td>
                      <td className="px-4 py-2 text-right">{rm(s.agg.spend, s.agg.hasSpend)}</td>
                      <td className="px-4 py-2 text-right">{rm(s.agg.gross, s.agg.hasGross)}</td>
                      <td className="px-4 py-2 text-right">{s.agg.roi != null ? s.agg.roi : "—"}</td>
                      <td className="px-4 py-2">
                        {s.link?.commission_type
                          ? <span className="chip bg-emerald-100 text-emerald-700">
                              {s.link.commission_type === "percent" ? "Percent" : "Hour"}
                            </span>
                          : <span className="text-muted-fg/50">—</span>}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {s.link?.commission_value != null
                          ? (s.link.commission_type === "percent"
                              ? `${s.link.commission_value}%`
                              : `RM${s.link.commission_value}/j`)
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-emerald-700">
                        {s.link?.commission_type ? `RM${s.commission.toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
            {active.length === 0 && (
              <tr><td colSpan={13} className="px-4 py-12 text-center text-muted-fg">
                Tiada live dalam julat ini.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ Icon, label, value, fill }: {
  Icon: typeof Users; label: string; value: React.ReactNode;
  fill?: "yellow" | "red" | "emerald";
}) {
  const bg = fill === "yellow"
    ? "bg-gradient-to-br from-amber-500 to-yellow-500 text-white"
    : fill === "red"
      ? "bg-gradient-to-br from-red-500 to-red-600 text-white"
      : fill === "emerald"
        ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"
        : "glass text-ink";
  return (
    <div className={`rounded-2xl p-4 shadow-lift ${bg}`}>
      <Icon className={`mb-2 h-4 w-4 ${fill ? "text-white/80" : "text-muted-fg"}`} aria-hidden="true" />
      <p className="text-xl font-extrabold leading-tight">{value}</p>
      <p className={`text-xs ${fill ? "text-white/90" : "text-muted-fg"}`}>{label}</p>
    </div>
  );
}
