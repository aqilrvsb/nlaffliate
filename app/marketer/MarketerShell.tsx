"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Radio, LayoutDashboard, Users, Clock, CheckCircle2, LogOut,
  TrendingUp, ShoppingBag, Timer, CalendarDays, ExternalLink,
  Mail, Phone, MapPin, Link2, Menu, ChevronDown, List, Check, Loader2, Wallet,
  HelpCircle, Upload, ImagePlus, TrendingDown, Pencil, BarChart3,
  PackageSearch, FileSpreadsheet, ShoppingCart, Layers, Eye, MousePointerClick,
  Send,
} from "lucide-react";
import DateRangeFilter from "@/components/DateRangeFilter";
import Pagination from "@/components/Pagination";
import ImageModal from "@/components/ImageModal";
import { getPage, paginate } from "@/lib/pagination";
import { fmtDate, fmtTimeRange, sumDurations } from "@/lib/format";
import { resolveRange } from "@/lib/daterange";
import { useSearchParams } from "next/navigation";
import type { SessionUser } from "@/lib/session";

type TikTokLink = { id: number; label: string; url: string };
type Affiliate = {
  id: number; name: string; email: string;
  phone: string | null; address: string | null; links: TikTokLink[];
};
type Live = {
  booking_id: number; affiliate_id: number; affiliate: string; affiliate_email: string;
  profile_label: string; profile_url: string;
  live_date: string; start_time: string; end_time: string | null;
  note: string | null; status: string; post_url: string | null;
  ads_budget: number | null; affiliate_can_edit: number;
  ad_spend: number | null; gross_revenue: number | null; roi: number | null;
  live_title: string | null;
  gmv: number | null; viewers: number | null; items_sold: number | null;
  duration_live: string | null; screenshot_path: string | null;
};
type Unknown = {
  id: number; live_name: string | null; live_date: string | null;
  live_time: string | null; duration: string | null;
  ad_spend: number | null; gross_revenue: number | null; roi: number | null;
};
type Product = {
  id: number; report_date: string; campaign_id: string | null;
  campaign_name: string | null; spend: number | null; sku_orders: number | null;
  cost_per_order: number | null; gross_revenue: number | null; roi: number | null;
};
type Post = {
  id: number; affiliate_id: number; post_date: string; status: string;
};
type Overall = {
  id: number; report_date: string;
  cost: number | null; sku_orders: number | null; cost_per_order: number | null;
  gross_revenue: number | null; roi: number | null;
  gmv: number | null; visitors: number | null;
  product_impressions: number | null; product_clicks: number | null;
  img1_path: string | null; img2_path: string | null;
};

// Sidebar structure: a couple of top-level items + one expandable group.
const AFFILIATE_CHILDREN = [
  { key: "affiliates", label: "List Affiliate", icon: List },
  { key: "pending", label: "Pending Affiliate", icon: Clock },
  { key: "success", label: "Success Affiliate", icon: CheckCircle2 },
  { key: "posting", label: "Posting Affiliate", icon: Send },
  { key: "reporting", label: "Reporting Affiliate", icon: BarChart3 },
  { key: "unknown", label: "Unknown Affiliate", icon: HelpCircle },
] as const;

const TAB_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  affiliates: "List Affiliate",
  pending: "Pending Affiliate",
  success: "Success Affiliate",
  posting: "Posting Affiliate",
  reporting: "Reporting Affiliate",
  unknown: "Unknown Affiliate",
  "product-gmv": "Product GMV",
  overall: "Overall",
};

export default function MarketerShell({
  user, affiliates, lives, unknowns, products, overall, posts,
}: {
  user: SessionUser; affiliates: Affiliate[]; lives: Live[];
  unknowns: Unknown[]; products: Product[]; overall: Overall[]; posts: Post[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [navOpen, setNavOpen] = useState(false);

  const active = params.get("tab") || "dashboard";
  const inAffiliateGroup = AFFILIATE_CHILDREN.some((c) => c.key === active);
  const [groupOpen, setGroupOpen] = useState(true);

  function go(key: string) {
    const next = new URLSearchParams(params.toString());
    if (key === "dashboard") next.delete("tab");
    else next.set("tab", key);
    next.delete("page");
    const qs = next.toString();
    router.push(qs ? `/marketer?${qs}` : "/marketer");
    setNavOpen(false);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  // Default date range depends on the active tab:
  //   pending  -> today (the schedule the marketer manages now)
  //   success  -> current month (completed lives are past-dated)
  //   dashboard-> current month · unknown -> all
  const mode: "today" | "month" | "all" =
    active === "pending" ? "today"
      : active === "unknown" ? "all"
      : "month";
  const { from, to } = resolveRange(
    { from: params.get("from"), to: params.get("to"), all: params.get("all") },
    mode
  );
  const inRange = lives.filter((l) => {
    if (from && l.live_date < from) return false;
    if (to && l.live_date > to) return false;
    return true;
  });
  // Already newest-first from the SQL ORDER BY; the filter preserves order.
  const pending = inRange.filter((l) => l.status === "pending");
  const success = inRange.filter((l) => l.status === "completed");

  const activeLabel = TAB_LABELS[active] || "Dashboard";

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 transform border-r border-line bg-white/80 backdrop-blur transition-transform duration-200 md:static md:translate-x-0 ${
        navOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="flex h-full flex-col p-4">
          <div className="mb-6 flex items-center gap-2.5 px-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-fg shadow-lift">
              <Radio className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-base font-extrabold tracking-tight text-ink">LiveAffiliate</span>
          </div>

          <span className="mb-2 px-2 text-[11px] font-bold uppercase tracking-widest text-muted-fg">
            Marketer
          </span>
          <nav className="flex flex-1 flex-col gap-1">
            {/* Dashboard */}
            <button onClick={() => go("dashboard")}
              className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                active === "dashboard" ? "bg-primary text-primary-fg shadow-lift" : "text-ink hover:bg-primary/10"
              }`}>
              <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden="true" />
              Dashboard
            </button>

            {/* Affiliate group */}
            <button onClick={() => setGroupOpen((o) => !o)}
              className={`mt-1 flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                inAffiliateGroup ? "text-primary" : "text-ink hover:bg-primary/10"
              }`}
              aria-expanded={groupOpen}>
              <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1 text-left">Affiliate</span>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${groupOpen ? "" : "-rotate-90"}`}
                aria-hidden="true" />
            </button>

            {groupOpen && (
              <div className="ml-4 flex flex-col gap-1 border-l border-line pl-3">
                {AFFILIATE_CHILDREN.map((c) => {
                  const Icon = c.icon;
                  const on = c.key === active;
                  return (
                    <button key={c.key} onClick={() => go(c.key)}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                        on ? "bg-primary text-primary-fg shadow-lift" : "text-muted-fg hover:bg-primary/10 hover:text-ink"
                      }`}>
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Product GMV — its own main category */}
            <button onClick={() => go("product-gmv")}
              className={`mt-1 flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                active === "product-gmv" ? "bg-primary text-primary-fg shadow-lift" : "text-ink hover:bg-primary/10"
              }`}>
              <PackageSearch className="h-4 w-4 shrink-0" aria-hidden="true" />
              Product GMV
            </button>

            {/* Overall — its own main category */}
            <button onClick={() => go("overall")}
              className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                active === "overall" ? "bg-primary text-primary-fg shadow-lift" : "text-ink hover:bg-primary/10"
              }`}>
              <Layers className="h-4 w-4 shrink-0" aria-hidden="true" />
              Overall
            </button>
          </nav>

          <div className="mt-4 border-t border-line pt-4">
            <div className="mb-2 flex items-center gap-2 px-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                <p className="truncate text-xs text-muted-fg">{user.email}</p>
              </div>
            </div>
            <button onClick={logout} className="btn-ghost w-full !py-2">
              <LogOut className="h-4 w-4" aria-hidden="true" />Log out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {navOpen && (
        <div className="fixed inset-0 z-30 bg-ink/30 backdrop-blur-sm md:hidden"
          onClick={() => setNavOpen(false)} />
      )}

      {/* Main */}
      <main className="min-w-0 flex-1">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-white/80 px-4 py-3 backdrop-blur md:px-8">
          <button onClick={() => setNavOpen(true)}
            className="cursor-pointer rounded-lg p-2 text-ink hover:bg-primary/10 md:hidden"
            aria-label="Open menu">
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <h1 className="text-lg font-extrabold tracking-tight text-ink">{activeLabel}</h1>
        </div>

        <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
          {active === "dashboard" && (
            <DashboardTab affiliates={affiliates} inRange={inRange}
              pending={pending} success={success}
              products={products} overall={overall} from={from} to={to} />
          )}
          {active === "affiliates" && (
            <AffiliatesTab affiliates={affiliates} lives={lives} />
          )}
          {active === "pending" && (
            <ScheduleTab title="Pending lives" rows={pending} kind="pending"
              showUpload defaultMode="today" />
          )}
          {active === "success" && (
            <ScheduleTab title="Completed lives" rows={success} kind="success"
              defaultMode="month" />
          )}
          {active === "posting" && (
            <PostingTab affiliates={affiliates} posts={posts} />
          )}
          {active === "reporting" && (
            <ReportingTab affiliates={affiliates} lives={inRange} />
          )}
          {active === "unknown" && <UnknownTab rows={unknowns} />}
          {active === "product-gmv" && <ProductGmvTab products={products} />}
          {active === "overall" && <OverallTab overall={overall} />}
        </div>
      </main>
    </div>
  );
}

/* ── Dashboard ─────────────────────────────────────────── */

function DashboardTab({ affiliates, inRange, pending, success, products, overall, from, to }: {
  affiliates: Affiliate[]; inRange: Live[]; pending: Live[]; success: Live[];
  products: Product[]; overall: Overall[]; from: string; to: string;
}) {
  const t = aggregate(success);
  const rm = (n: number, has: boolean) => (has ? `RM${n.toFixed(2)}` : "—");

  const within = (d: string) => (!from || d >= from) && (!to || d <= to);
  const prod = products.filter((p) => within(p.report_date));
  const ovr = overall.filter((o) => within(o.report_date));

  const pSpend = prod.reduce((s, r) => s + (r.spend || 0), 0);
  const pGross = prod.reduce((s, r) => s + (r.gross_revenue || 0), 0);
  const pOrders = prod.reduce((s, r) => s + (r.sku_orders || 0), 0);
  const pRoi = pSpend > 0 ? Math.round((pGross / pSpend) * 100) / 100 : null;

  const oSum = (k: keyof Overall) => ovr.reduce((s, r) => s + ((r[k] as number) || 0), 0);
  const oCost = oSum("cost"), oGross = oSum("gross_revenue"), oGmv = oSum("gmv");
  const oRoi = oCost > 0 ? Math.round((oGross / oCost) * 100) / 100 : null;

  return (
    <>
      <DateRangeFilter count={inRange.length} defaultMode="month" />

      {/* 1) Overall */}
      <section>
        <h2 className="section-title mb-2">Summary — Overall</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Kpi Icon={TrendingUp} label="Overall GMV" value={money(oGmv)} fill="yellow" />
          <Kpi Icon={Wallet} label="Overall Spend" value={money(oCost)} fill="red" />
          <Kpi Icon={TrendingUp} label="Overall Gross Revenue" value={money(oGross)} fill="emerald" />
          <Kpi Icon={(oRoi ?? 0) >= 1 ? TrendingUp : TrendingDown} label="Overall ROI" value={oRoi ?? "—"} />
          <Kpi Icon={Users} label="Overall Visitors" value={int(oSum("visitors"))} />
        </div>
      </section>

      {/* 2) Success Live */}
      <section>
        <h2 className="section-title mb-2">Summary — Success Live</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Kpi Icon={CheckCircle2} label="Total Live" value={inRange.length}
            sub={`${pending.length} pending · ${success.length} done`} />
          <Kpi Icon={TrendingUp} label="Affiliate Sales" value={`RM${t.gmv.toFixed(2)}`} fill="yellow" />
          <Kpi Icon={Users} label="Affiliate Viewers" value={t.viewers} />
          <Kpi Icon={ShoppingBag} label="Affiliate Items" value={t.items} />
          <Kpi Icon={Timer} label="Affiliate Duration" value={t.duration} />
          <Kpi Icon={Wallet} label="Affiliate Budget" value={rm(t.budget, t.hasBudget)} />
          <Kpi Icon={Wallet} label="Affiliate Spend" value={rm(t.spend, t.hasSpend)} fill="red" />
          <Kpi Icon={TrendingUp} label="Affiliate Gross Revenue" value={rm(t.gross, t.hasGross)} fill="emerald" />
          <Kpi Icon={(t.roi ?? 0) >= 1 ? TrendingUp : TrendingDown} label="Affiliate ROI" value={t.roi != null ? t.roi : "—"} />
        </div>
      </section>

      {/* 3) Product GMV Max */}
      <section>
        <h2 className="section-title mb-2">Summary — Product GMV Max</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Kpi Icon={PackageSearch} label="Product Campaigns" value={prod.length} />
          <Kpi Icon={Wallet} label="Product Spend" value={money(pSpend)} fill="red" />
          <Kpi Icon={ShoppingCart} label="Product SKU Orders" value={int(pOrders)} />
          <Kpi Icon={TrendingUp} label="Product Gross Revenue" value={money(pGross)} fill="emerald" />
          <Kpi Icon={(pRoi ?? 0) >= 1 ? TrendingUp : TrendingDown} label="Product ROI" value={pRoi ?? "—"} />
        </div>
      </section>
    </>
  );
}

/* ── List Of Affiliate ─────────────────────────────────── */

function AffiliatesTab({ affiliates, lives }: { affiliates: Affiliate[]; lives: Live[] }) {
  if (affiliates.length === 0) {
    return <p className="card text-center text-sm text-muted-fg">
      No affiliates assigned to you yet. Ask your admin to assign affiliates.
    </p>;
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {affiliates.map((a) => (
        <div key={a.id} className="card flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-bold text-white">
              {a.name.charAt(0).toUpperCase()}
            </span>
            <p className="truncate font-bold text-ink">{a.name}</p>
          </div>

          <div className="space-y-1 text-xs text-muted-fg">
            <p className="flex items-center gap-1.5"><Mail className="h-3 w-3 shrink-0" aria-hidden="true" />{a.email}</p>
            {a.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3 shrink-0" aria-hidden="true" />{a.phone}</p>}
            {a.address && <p className="flex items-start gap-1.5"><MapPin className="mt-px h-3 w-3 shrink-0" aria-hidden="true" />{a.address}</p>}
          </div>

          <div className="border-t border-line pt-2">
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-fg">
              <Link2 className="h-3 w-3" aria-hidden="true" />
              TikTok Profiles ({a.links.length})
            </p>
            {a.links.length === 0 ? (
              <p className="text-xs text-muted-fg/70">No TikTok links added yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {a.links.map((l) => (
                  <li key={l.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-line bg-white/60 px-2.5 py-1.5">
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-ink">{l.label}</span>
                      <a href={l.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 truncate text-[11px] text-accent hover:underline">
                        <span className="truncate">{l.url}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                      </a>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Schedule (pending / success) ──────────────────────── */

function ScheduleTab({ title, rows, kind, showUpload, defaultMode = "today" }: {
  title: string; rows: Live[]; kind: "pending" | "success"; showUpload?: boolean;
  defaultMode?: "today" | "month" | "all";
}) {
  const params = useSearchParams();
  const page = getPage(params.get("page"));
  const pageRows = paginate(rows, page, 10);

  return (
    <>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-[280px] flex-1">
          <DateRangeFilter count={rows.length} defaultMode={defaultMode} />
        </div>
        {showUpload && <BulkUpload />}
      </div>

      {kind === "success" && <SuccessSummary rows={rows} />}
      {rows.length === 0 ? (
        <p className="card text-center text-sm text-muted-fg">No {title.toLowerCase()} in this range.</p>
      ) : (
        <>
          <div className="space-y-3">
            {pageRows.map((l) => <ScheduleCard key={l.booking_id} l={l} kind={kind} />)}
          </div>
          <Pagination page={page} total={rows.length} size={10} />
        </>
      )}
    </>
  );
}

function SuccessSummary({ rows }: { rows: Live[] }) {
  const t = aggregate(rows);
  const affCount = new Set(rows.map((l) => l.affiliate_id)).size;
  const rm = (n: number, has: boolean) => (has ? `RM${n.toFixed(2)}` : "—");
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Kpi Icon={CheckCircle2} label="Total Live" value={rows.length} />
      <Kpi Icon={Users} label="Total Affiliate" value={affCount} />
      <Kpi Icon={TrendingUp} label="Total Sales" value={`RM${t.gmv.toFixed(2)}`} fill="yellow" />
      <Kpi Icon={Users} label="Viewers" value={t.viewers} />
      <Kpi Icon={ShoppingBag} label="Items Sold" value={t.items} />
      <Kpi Icon={Timer} label="Duration" value={t.duration} />
      <Kpi Icon={Wallet} label="Budget" value={rm(t.budget, t.hasBudget)} />
      <Kpi Icon={Wallet} label="Spend" value={rm(t.spend, t.hasSpend)} fill="red" />
      <Kpi Icon={TrendingUp} label="Gross Revenue" value={rm(t.gross, t.hasGross)} fill="emerald" />
      <Kpi Icon={(t.roi ?? 0) >= 1 ? TrendingUp : TrendingDown} label="ROI"
        value={t.roi != null ? t.roi : "—"} />
    </div>
  );
}

/** Read-only version of the affiliate's scheduled-live card, with the
    affiliate's name added + marketer budget/lock controls on pending. */
function ScheduleCard({ l, kind }: { l: Live; kind: "pending" | "success" }) {
  const router = useRouter();
  const done = kind === "success";
  const hasProof = !!l.screenshot_path;

  const [budget, setBudget] = useState(l.ads_budget != null ? String(l.ads_budget) : "");
  const [canEdit, setCanEdit] = useState(l.affiliate_can_edit === 1);
  const [busy, setBusy] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  // Manual ad-results editor (pending only) — saving moves the live to Success.
  const [resultsOpen, setResultsOpen] = useState(false);
  const [spend, setSpend] = useState(l.ad_spend != null ? String(l.ad_spend) : "");
  const [gross, setGross] = useState(l.gross_revenue != null ? String(l.gross_revenue) : "");
  const [roi, setRoi] = useState(l.roi != null ? String(l.roi) : "");

  async function saveResults() {
    const d = await patch({ ad_spend: spend, gross_revenue: gross, roi });
    if (d) { setResultsOpen(false); router.refresh(); }
  }

  async function patch(payload: any) {
    setBusy(true);
    const res = await fetch(`/api/marketer/bookings/${l.booking_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) return data;
    return null;
  }

  async function saveBudget() {
    const d = await patch({ ads_budget: budget });
    if (d) {
      setCanEdit(d.affiliate_can_edit === 1);
      setSavedMsg("Saved");
      setTimeout(() => setSavedMsg(""), 1500);
      router.refresh();
    }
  }

  async function toggleEdit() {
    const next = !canEdit;
    setCanEdit(next);
    const d = await patch({ allow_edit: next });
    if (d) router.refresh();
  }

  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-xs font-bold text-white">
              {l.affiliate.charAt(0).toUpperCase()}
            </span>
            <span className="font-bold text-ink">{l.affiliate}</span>
            <span className={`chip ${done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {done ? <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> : <Clock className="h-3 w-3" aria-hidden="true" />}
              {done ? "Completed" : "Pending"}
            </span>
          </div>
          {l.live_title && (
            <p className="mt-1 text-sm font-bold text-ink">{l.live_title}</p>
          )}
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-fg">
            <a href={l.profile_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 font-medium text-accent hover:underline">
              {l.profile_label}<ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
            <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{fmtDate(l.live_date)}</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden="true" />{fmtTimeRange(l.start_time, l.end_time)}</span>
          </p>
          {l.note && <p className="mt-1 text-xs text-muted-fg">{l.note}</p>}
        </div>
      </div>

      {/* Marketer controls (pending only): ad budget + allow-edit toggle */}
      {!done && (
        <div className="mt-4 flex flex-wrap items-end gap-4 border-t border-line pt-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg"
              htmlFor={`bud-${l.booking_id}`}>Budget Ads (RM)</label>
            <div className="flex items-center gap-2">
              <input id={`bud-${l.booking_id}`} type="number" min="0" step="any"
                className="input !py-1.5 text-sm sm:w-40" placeholder="0.00"
                value={budget} onChange={(e) => setBudget(e.target.value)} />
              <button className="btn !py-1.5 text-xs" onClick={saveBudget} disabled={busy}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      : <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                Save
              </button>
              {savedMsg && <span className="text-xs font-medium text-emerald-600">{savedMsg}</span>}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 pb-1.5"
            htmlFor={`tog-${l.booking_id}`}>
            <button id={`tog-${l.booking_id}`} type="button" role="switch"
              aria-checked={canEdit} onClick={toggleEdit} disabled={busy}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${
                canEdit ? "bg-emerald-500" : "bg-gray-300"
              }`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                canEdit ? "translate-x-4" : "translate-x-0.5"
              }`} />
            </button>
            <span className="text-xs font-semibold text-ink">
              Affiliate can edit
              <span className="ml-1 font-normal text-muted-fg">{canEdit ? "(on)" : "(locked)"}</span>
            </span>
          </label>

          <button onClick={() => setResultsOpen((o) => !o)}
            className="btn-ghost ml-auto !py-1.5 text-xs" title="Enter results manually">
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Enter results
          </button>
        </div>
      )}

      {/* Manual ad-results entry — Spend / Gross Revenue / ROI. Saving
          moves the live to Success. */}
      {!done && resultsOpen && (
        <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-line bg-white/60 p-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg">Spend (RM)</label>
            <input type="number" min="0" step="any" className="input !py-1.5 text-sm"
              value={spend} onChange={(e) => setSpend(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg">Gross Revenue (RM)</label>
            <input type="number" min="0" step="any" className="input !py-1.5 text-sm"
              value={gross} onChange={(e) => setGross(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg">ROI</label>
            <input type="number" step="any" className="input !py-1.5 text-sm"
              value={roi} onChange={(e) => setRoi(e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <button className="btn !py-1.5 text-xs" onClick={saveResults} disabled={busy}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    : <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              Save &amp; complete
            </button>
          </div>
        </div>
      )}

      {hasProof && (
        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-line pt-4 sm:grid-cols-[140px_1fr]">
          <ImageModal src={l.screenshot_path!} title={l.live_title || "Live result"}
            className="self-start" />
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-ink">Live Results</p>
              {l.ads_budget != null && (
                <span className="chip bg-accent/10 text-accent">
                  <Wallet className="h-3 w-3" aria-hidden="true" />Budget RM{l.ads_budget}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <Stat Icon={TrendingUp} label="Total Sales" value={l.gmv != null ? `RM${l.gmv}` : "—"} />
              <Stat Icon={Users} label="Viewers" value={l.viewers ?? "—"} />
              <Stat Icon={ShoppingBag} label="Items Sold" value={l.items_sold ?? "—"} />
              <Stat Icon={Timer} label="Duration" value={l.duration_live ?? "—"} />
            </div>
            {(l.ads_budget != null || l.ad_spend != null || l.gross_revenue != null || l.roi != null) && (
              <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
                <Stat Icon={Wallet} label="Budget" value={l.ads_budget != null ? `RM${l.ads_budget}` : "—"} />
                <Stat Icon={Wallet} label="Spend" value={l.ad_spend != null ? `RM${l.ad_spend}` : "—"} />
                <Stat Icon={TrendingUp} label="Gross Revenue" value={l.gross_revenue != null ? `RM${l.gross_revenue}` : "—"} />
                <Stat Icon={(l.roi ?? 0) >= 1 ? TrendingUp : TrendingDown}
                  label="ROI" value={l.roi ?? "—"} />
              </div>
            )}
            {l.post_url && (
              <a href={l.post_url} target="_blank" rel="noopener noreferrer"
                className="mt-2 flex items-center gap-1 truncate text-xs text-accent hover:underline">
                <Link2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{l.post_url}</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ Icon, label, value }: { Icon: typeof Users; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-white/60 p-3 text-center">
      <Icon className="mx-auto mb-1 h-3.5 w-3.5 text-muted-fg" aria-hidden="true" />
      <p className="text-base font-extrabold leading-tight text-ink">{value}</p>
      <p className="text-[11px] text-muted-fg">{label}</p>
    </div>
  );
}

/* ── Bulk analytics upload ─────────────────────────────── */

function BulkUpload() {
  const router = useRouter();
  const [files, setFiles] = useState<(File | null)[]>([null, null, null]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ matched: number; unknown: number; total: number } | null>(null);
  const [error, setError] = useState("");

  function setSlot(i: number, f: File | null) {
    setFiles((prev) => prev.map((x, idx) => (idx === i ? f : x)));
    setResult(null); setError("");
  }

  const chosen = files.filter((f): f is File => !!f);

  async function submit() {
    if (chosen.length === 0) { setError("Attach at least one image."); return; }
    setBusy(true); setError(""); setResult(null);
    const fd = new FormData();
    chosen.forEach((f) => fd.append("images", f));
    const res = await fetch("/api/marketer/bulk-match", { method: "POST", body: fd });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || "Match failed");
    setResult({ matched: data.matched, unknown: data.unknown, total: data.total });
    setFiles([null, null, null]);
    router.refresh();
  }

  return (
    <div className="card w-full sm:w-auto">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-ink">
        <ImagePlus className="h-4 w-4 text-primary" aria-hidden="true" />
        Upload LIVE analytics
      </p>
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <label key={i}
            className={`flex h-14 w-14 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed text-xs font-bold transition-colors ${
              files[i] ? "border-emerald-400 bg-emerald-50 text-emerald-600" : "border-line text-muted-fg hover:border-primary hover:text-primary"
            }`}
            title={files[i]?.name || `Slot ${i + 1}`}>
            {files[i] ? <Check className="h-5 w-5" aria-hidden="true" /> : <>{i + 1}</>}
            <input type="file" accept="image/*" className="sr-only"
              onChange={(e) => setSlot(i, e.target.files?.[0] || null)} />
          </label>
        ))}
        <button onClick={submit} disabled={busy || chosen.length === 0} className="btn ml-1 !py-2.5">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                : <Upload className="h-4 w-4" aria-hidden="true" />}
          Submit
        </button>
      </div>
      {result && (
        <p className="mt-2 text-xs text-muted-fg">
          Read {result.total} rows — <span className="font-semibold text-emerald-600">{result.matched} matched</span>
          {result.unknown > 0 && <> · <span className="font-semibold text-amber-600">{result.unknown} unknown</span></>}
        </p>
      )}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}

/* ── Posting Affiliate ─────────────────────────────────── */

function PostingTab({ affiliates, posts }: { affiliates: Affiliate[]; posts: Post[] }) {
  const params = useSearchParams();
  const { from, to } = resolveRange(
    { from: params.get("from"), to: params.get("to"), all: params.get("all") },
    "month"
  );
  const rows = posts.filter((p) => {
    if (from && p.post_date < from) return false;
    if (to && p.post_date > to) return false;
    return true;
  });
  const totalPending = rows.filter((p) => p.status === "pending").length;
  const totalDone = rows.filter((p) => p.status === "done").length;

  return (
    <>
      <DateRangeFilter count={rows.length} defaultMode="month" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Kpi Icon={Send} label="Total Post" value={rows.length} />
        <Kpi Icon={Clock} label="Total Pending Post" value={totalPending} fill="red" />
        <Kpi Icon={CheckCircle2} label="Total Done Post" value={totalDone} fill="emerald" />
      </div>

      {affiliates.length === 0 ? (
        <p className="card text-center text-sm text-muted-fg">No affiliates assigned to you yet.</p>
      ) : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted-fg">
              <tr>
                <th className="px-4 py-3 font-semibold">Affiliate</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">No WhatsApp</th>
                <th className="px-4 py-3 text-right font-semibold">Total Pending Post</th>
                <th className="px-4 py-3 text-right font-semibold">Total Done Post</th>
              </tr>
            </thead>
            <tbody>
              {affiliates.map((a) => {
                const mine = rows.filter((p) => p.affiliate_id === a.id);
                const pend = mine.filter((p) => p.status === "pending").length;
                const done = mine.filter((p) => p.status === "done").length;
                return (
                  <tr key={a.id} className="border-t border-line/60 hover:bg-white/50">
                    <td className="px-4 py-3 font-semibold text-ink">{a.name}</td>
                    <td className="px-4 py-3 text-muted-fg">{a.email}</td>
                    <td className="px-4 py-3 text-muted-fg">{a.phone || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="chip bg-amber-100 text-amber-700">{pend}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="chip bg-emerald-100 text-emerald-700">{done}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ── Reporting Affiliate ───────────────────────────────── */

function aggregate(lives: Live[]) {
  const gmv = lives.reduce((s, l) => s + (l.gmv || 0), 0);
  const viewers = lives.reduce((s, l) => s + (l.viewers || 0), 0);
  const items = lives.reduce((s, l) => s + (l.items_sold || 0), 0);
  const budget = lives.reduce((s, l) => s + (l.ads_budget || 0), 0);
  const spend = lives.reduce((s, l) => s + (l.ad_spend || 0), 0);
  const gross = lives.reduce((s, l) => s + (l.gross_revenue || 0), 0);
  const duration = sumDurations(
    lives.filter((l) => l.status === "completed").map((l) => l.duration_live)
  );
  const roi = spend > 0 ? Math.round((gross / spend) * 100) / 100 : null;
  const hasBudget = lives.some((l) => l.ads_budget != null);
  const hasSpend = lives.some((l) => l.ad_spend != null);
  const hasGross = lives.some((l) => l.gross_revenue != null);
  return { gmv, viewers, items, budget, spend, gross, duration, roi, hasBudget, hasSpend, hasGross };
}

function ReportingTab({ affiliates, lives }: { affiliates: Affiliate[]; lives: Live[] }) {
  const t = aggregate(lives);
  const rm = (n: number, has: boolean) => (has ? `RM${n.toFixed(2)}` : "—");

  return (
    <>
      <DateRangeFilter count={lives.length} defaultMode="month" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi Icon={Users} label="Total Affiliate" value={affiliates.length} />
        <Kpi Icon={TrendingUp} label="Affiliate Sales" value={`RM${t.gmv.toFixed(2)}`} fill="yellow" />
        <Kpi Icon={Users} label="Affiliate Viewers" value={t.viewers} />
        <Kpi Icon={ShoppingBag} label="Affiliate Items" value={t.items} />
        <Kpi Icon={Timer} label="Affiliate Duration" value={t.duration} />
        <Kpi Icon={Wallet} label="Affiliate Budget" value={rm(t.budget, t.hasBudget)} />
        <Kpi Icon={Wallet} label="Affiliate Spend" value={rm(t.spend, t.hasSpend)} fill="red" />
        <Kpi Icon={TrendingUp} label="Affiliate Gross Revenue" value={rm(t.gross, t.hasGross)} fill="emerald" />
        <Kpi Icon={(t.roi ?? 0) >= 1 ? TrendingUp : TrendingDown} label="Affiliate ROI"
          value={t.roi != null ? t.roi : "—"} />
      </div>

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[1040px] text-sm">
          <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted-fg">
            <tr>
              <th className="px-4 py-3 font-semibold">Affiliate</th>
              <th className="px-4 py-3 text-right font-semibold">Affiliate Sales</th>
              <th className="px-4 py-3 text-right font-semibold">Affiliate Viewers</th>
              <th className="px-4 py-3 text-right font-semibold">Affiliate Items</th>
              <th className="px-4 py-3 font-semibold">Affiliate Duration</th>
              <th className="px-4 py-3 text-right font-semibold">Affiliate Budget</th>
              <th className="px-4 py-3 text-right font-semibold">Affiliate Spend</th>
              <th className="px-4 py-3 text-right font-semibold">Affiliate Gross Rev.</th>
              <th className="px-4 py-3 text-right font-semibold">Affiliate ROI</th>
            </tr>
          </thead>
          <tbody>
            {affiliates.map((a) => {
              const r = aggregate(lives.filter((l) => l.affiliate_id === a.id));
              return (
                <tr key={a.id} className="border-t border-line/60 hover:bg-white/50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">{a.name}</div>
                    <div className="text-xs text-muted-fg">{a.email}</div>
                    {a.phone && <div className="text-xs text-muted-fg">{a.phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-ink">RM{r.gmv.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">{r.viewers}</td>
                  <td className="px-4 py-3 text-right">{r.items}</td>
                  <td className="px-4 py-3">{r.duration}</td>
                  <td className="px-4 py-3 text-right">{rm(r.budget, r.hasBudget)}</td>
                  <td className="px-4 py-3 text-right">{rm(r.spend, r.hasSpend)}</td>
                  <td className="px-4 py-3 text-right">{rm(r.gross, r.hasGross)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-ink">{r.roi != null ? r.roi : "—"}</td>
                </tr>
              );
            })}
            {affiliates.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-fg">No affiliates assigned to you yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ── Product GMV ───────────────────────────────────────── */

const PRODUCT_COLUMNS = [
  "Campaign ID", "Campaign name", "Cost", "SKU orders",
  "Cost per order", "Gross revenue", "ROI",
];

function ProductImport() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    if (!file) return setError("Choose an .xlsx file.");
    if (!date) return setError("Pick the report date.");
    setBusy(true); setError(""); setMsg("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("report_date", date);
    const res = await fetch("/api/marketer/product-gmv/import", { method: "POST", body: fd });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || "Import failed");
    setMsg(`Imported ${data.imported} · skipped ${data.skipped} zero-cost`);
    setFile(null);
    router.refresh();
  }

  return (
    <div className="card space-y-3">
      <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
        <FileSpreadsheet className="h-4 w-4 text-primary" aria-hidden="true" />
        Import Product Campaign Data (.xlsx)
      </p>

      {/* Column reference so the marketer exports the right sheet */}
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-fg">
          Required columns (in this order)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PRODUCT_COLUMNS.map((c) => (
            <span key={c} className="rounded-md border border-line bg-white/70 px-2 py-1 font-mono text-[11px] text-ink">
              {c}
            </span>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-muted-fg">
          TikTok Ads → Product campaign data export. <b>Cost</b> is shown as <b>Product Spend</b>. Zero-cost rows are skipped.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg">Report date</label>
          <input type="date" className="input cursor-pointer !py-2 text-sm"
            value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg">File</label>
          <label className="btn-ghost cursor-pointer !py-2">
            {file ? <><Check className="h-4 w-4" aria-hidden="true" />{file.name.slice(0, 20)}</>
                  : <><Upload className="h-4 w-4" aria-hidden="true" />Choose .xlsx</>}
            <input type="file" accept=".xlsx,.xls" className="sr-only"
              onChange={(e) => { setFile(e.target.files?.[0] || null); setError(""); setMsg(""); }} />
          </label>
        </div>
        <button className="btn !py-2.5" onClick={submit} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
          Submit
        </button>
        {msg && <span className="text-xs font-medium text-emerald-600">{msg}</span>}
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    </div>
  );
}

function ProductGmvTab({ products }: { products: Product[] }) {
  const params = useSearchParams();
  const { from, to } = resolveRange(
    { from: params.get("from"), to: params.get("to"), all: params.get("all") },
    "month"
  );
  const rows = products.filter((p) => {
    if (from && p.report_date < from) return false;
    if (to && p.report_date > to) return false;
    return true;
  });

  const spend = rows.reduce((s, r) => s + (r.spend || 0), 0);
  const orders = rows.reduce((s, r) => s + (r.sku_orders || 0), 0);
  const gross = rows.reduce((s, r) => s + (r.gross_revenue || 0), 0);
  const roi = spend > 0 ? Math.round((gross / spend) * 100) / 100 : null;
  const cpo = orders > 0 ? Math.round((spend / orders) * 100) / 100 : null;

  const page = getPage(params.get("page"));
  const pageRows = paginate(rows, page, 20);

  return (
    <>
      <ProductImport />
      <DateRangeFilter count={rows.length} defaultMode="month" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi Icon={PackageSearch} label="Product Campaigns" value={rows.length} />
        <Kpi Icon={Wallet} label="Product Spend" value={`RM${spend.toFixed(2)}`} fill="red" />
        <Kpi Icon={ShoppingCart} label="Product SKU Orders" value={orders} />
        <Kpi Icon={Wallet} label="Product Cost / Order" value={cpo != null ? `RM${cpo}` : "—"} />
        <Kpi Icon={TrendingUp} label="Product Gross Revenue" value={`RM${gross.toFixed(2)}`} fill="emerald" />
        <Kpi Icon={(roi ?? 0) >= 1 ? TrendingUp : TrendingDown} label="Product ROI"
          value={roi != null ? roi : "—"} />
      </div>

      {rows.length === 0 ? (
        <p className="card text-center text-sm text-muted-fg">
          No product campaigns in this range. Import an .xlsx above.
        </p>
      ) : (
        <>
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted-fg">
                <tr>
                  <th className="px-4 py-3 font-semibold">Product Campaign</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 text-right font-semibold">Product Spend</th>
                  <th className="px-4 py-3 text-right font-semibold">Product SKU Orders</th>
                  <th className="px-4 py-3 text-right font-semibold">Product Cost / Order</th>
                  <th className="px-4 py-3 text-right font-semibold">Product Gross Revenue</th>
                  <th className="px-4 py-3 text-right font-semibold">Product ROI</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.id} className="border-t border-line/60 hover:bg-white/50">
                    <td className="px-4 py-3">
                      <div className="max-w-[360px] truncate font-semibold text-ink" title={r.campaign_name || ""}>
                        {r.campaign_name || "—"}
                      </div>
                      <div className="font-mono text-[11px] text-muted-fg">{r.campaign_id}</div>
                    </td>
                    <td className="px-4 py-3 text-ink">{fmtDate(r.report_date)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">{r.spend != null ? `RM${r.spend}` : "—"}</td>
                    <td className="px-4 py-3 text-right">{r.sku_orders ?? "—"}</td>
                    <td className="px-4 py-3 text-right">{r.cost_per_order != null ? `RM${r.cost_per_order}` : "—"}</td>
                    <td className="px-4 py-3 text-right">{r.gross_revenue != null ? `RM${r.gross_revenue}` : "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">{r.roi ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={rows.length} size={20} />
        </>
      )}
    </>
  );
}

/* ── Overall ───────────────────────────────────────────── */

const money = (n: number | null) => (n != null ? `RM${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—");
const int = (n: number | null) => (n != null ? n.toLocaleString() : "—");

function OverallImport() {
  const router = useRouter();
  const [img1, setImg1] = useState<File | null>(null);
  const [img2, setImg2] = useState<File | null>(null);
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    if (!img1 && !img2) return setError("Attach at least one screenshot.");
    if (!date) return setError("Pick the report date.");
    setBusy(true); setError(""); setMsg("");
    const fd = new FormData();
    if (img1) fd.append("image1", img1);
    if (img2) fd.append("image2", img2);
    fd.append("report_date", date);
    const res = await fetch("/api/marketer/overall/import", { method: "POST", body: fd });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || "Import failed");
    setMsg("Saved");
    setImg1(null); setImg2(null);
    router.refresh();
  }

  const slot = (n: 1 | 2, label: string, file: File | null, set: (f: File | null) => void) => (
    <label className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-3 text-center text-xs font-semibold transition-colors ${
      file ? "border-emerald-400 bg-emerald-50 text-emerald-600" : "border-line text-muted-fg hover:border-primary hover:text-primary"
    }`}>
      {file ? <Check className="h-5 w-5" aria-hidden="true" /> : <ImagePlus className="h-5 w-5" aria-hidden="true" />}
      <span>Image {n}</span>
      <span className="font-normal opacity-70">{label}</span>
      <input type="file" accept="image/*" className="sr-only"
        onChange={(e) => { set(e.target.files?.[0] || null); setError(""); setMsg(""); }} />
    </label>
  );

  return (
    <div className="card space-y-3">
      <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
        <ImagePlus className="h-4 w-4 text-primary" aria-hidden="true" />
        Import Overall — GMV Max screenshots
      </p>
      <div className="flex flex-wrap items-stretch gap-3">
        {slot(1, "Overview panel", img1, setImg1)}
        {slot(2, "Key metrics panel", img2, setImg2)}
        <div className="flex flex-col justify-end gap-2">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg">Report date</label>
            <input type="date" className="input cursor-pointer !py-2 text-sm"
              value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <button className="btn !py-2.5" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
            Submit
          </button>
        </div>
      </div>
      <p className="text-[11px] text-muted-fg">
        Image 1 = GMV Max <b>Overview</b> (Cost, SKU orders, Cost/order, Gross revenue, ROI).
        Image 2 = <b>Key metrics</b> (GMV, Visitors, Product impressions, Product clicks). Read by Gemini 2.5 Flash.
      </p>
      {msg && <span className="text-xs font-medium text-emerald-600">{msg}</span>}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}

function OverallTab({ overall }: { overall: Overall[] }) {
  const params = useSearchParams();
  const { from, to } = resolveRange(
    { from: params.get("from"), to: params.get("to"), all: params.get("all") },
    "month"
  );
  const rows = overall.filter((o) => {
    if (from && o.report_date < from) return false;
    if (to && o.report_date > to) return false;
    return true;
  });

  const sum = (k: keyof Overall) => rows.reduce((s, r) => s + ((r[k] as number) || 0), 0);
  const cost = sum("cost"), gross = sum("gross_revenue"), gmv = sum("gmv");
  const roi = cost > 0 ? Math.round((gross / cost) * 100) / 100 : null;

  return (
    <>
      <OverallImport />
      <DateRangeFilter count={rows.length} defaultMode="month" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi Icon={TrendingUp} label="Overall GMV" value={money(gmv)} fill="yellow" />
        <Kpi Icon={Wallet} label="Overall Spend" value={money(cost)} fill="red" />
        <Kpi Icon={TrendingUp} label="Overall Gross Revenue" value={money(gross)} fill="emerald" />
        <Kpi Icon={(roi ?? 0) >= 1 ? TrendingUp : TrendingDown} label="Overall ROI" value={roi ?? "—"} />
        <Kpi Icon={ShoppingCart} label="Overall SKU Orders" value={int(sum("sku_orders"))} />
        <Kpi Icon={Users} label="Overall Visitors" value={int(sum("visitors"))} />
        <Kpi Icon={Eye} label="Product Impressions" value={int(sum("product_impressions"))} />
        <Kpi Icon={MousePointerClick} label="Product Clicks" value={int(sum("product_clicks"))} />
      </div>

      {rows.length === 0 ? (
        <p className="card text-center text-sm text-muted-fg">
          No overall reports in this range. Import the two GMV-Max screenshots above.
        </p>
      ) : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[1040px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted-fg">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 text-right font-semibold">Overall GMV</th>
                <th className="px-4 py-3 text-right font-semibold">Overall Spend</th>
                <th className="px-4 py-3 text-right font-semibold">Gross Revenue</th>
                <th className="px-4 py-3 text-right font-semibold">ROI</th>
                <th className="px-4 py-3 text-right font-semibold">SKU Orders</th>
                <th className="px-4 py-3 text-right font-semibold">Visitors</th>
                <th className="px-4 py-3 text-right font-semibold">Impressions</th>
                <th className="px-4 py-3 text-right font-semibold">Clicks</th>
                <th className="px-4 py-3 font-semibold">Proof</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-t border-line/60 hover:bg-white/50">
                  <td className="px-4 py-3 font-semibold text-ink">{fmtDate(o.report_date)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-ink">{money(o.gmv)}</td>
                  <td className="px-4 py-3 text-right">{money(o.cost)}</td>
                  <td className="px-4 py-3 text-right">{money(o.gross_revenue)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-ink">{o.roi ?? "—"}</td>
                  <td className="px-4 py-3 text-right">{int(o.sku_orders)}</td>
                  <td className="px-4 py-3 text-right">{int(o.visitors)}</td>
                  <td className="px-4 py-3 text-right">{int(o.product_impressions)}</td>
                  <td className="px-4 py-3 text-right">{int(o.product_clicks)}</td>
                  <td className="px-4 py-3">
                    <span className="flex gap-1">
                      {o.img1_path && <a href={o.img1_path} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-accent hover:underline">1</a>}
                      {o.img2_path && <a href={o.img2_path} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-accent hover:underline">2</a>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ── Unknown Affiliate ─────────────────────────────────── */

function UnknownTab({ rows }: { rows: Unknown[] }) {
  if (rows.length === 0)
    return (
      <p className="card text-center text-sm text-muted-fg">
        No unmatched analytics rows. When a bulk row can&apos;t be matched to a pending live, it appears here.
      </p>
    );
  return (
    <div className="glass overflow-x-auto rounded-2xl">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted-fg">
          <tr>
            <th className="px-4 py-3 font-semibold">Live name</th>
            <th className="px-4 py-3 font-semibold">Date / Time</th>
            <th className="px-4 py-3 font-semibold">Duration</th>
            <th className="px-4 py-3 text-right font-semibold">Spend</th>
            <th className="px-4 py-3 text-right font-semibold">Gross Revenue</th>
            <th className="px-4 py-3 text-right font-semibold">ROI</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-line/60">
              <td className="px-4 py-3 font-semibold text-ink">{r.live_name || "—"}</td>
              <td className="px-4 py-3">
                <div className="text-ink">{r.live_date ? fmtDate(r.live_date) : "—"}</div>
                <div className="text-xs text-muted-fg">{r.live_time || ""}</div>
              </td>
              <td className="px-4 py-3">{r.duration || "—"}</td>
              <td className="px-4 py-3 text-right">{r.ad_spend != null ? `RM${r.ad_spend}` : "—"}</td>
              <td className="px-4 py-3 text-right">{r.gross_revenue != null ? `RM${r.gross_revenue}` : "—"}</td>
              <td className="px-4 py-3 text-right font-semibold text-ink">{r.roi ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── shared bits ───────────────────────────────────────── */

function Kpi({ Icon, label, value, tone, fill, sub, className = "" }: {
  Icon: typeof Users; label: string; value: React.ReactNode;
  tone?: "amber" | "emerald"; fill?: "yellow" | "red" | "emerald";
  sub?: string; className?: string;
}) {
  const solid = !!fill;
  const bg = fill === "yellow"
    ? "bg-gradient-to-br from-amber-500 to-yellow-500 text-white"
    : fill === "red"
      ? "bg-gradient-to-br from-red-500 to-red-600 text-white"
      : fill === "emerald"
        ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"
        : "glass text-ink";
  const iconTone = solid ? "text-white/80"
    : tone === "amber" ? "text-amber-600"
      : tone === "emerald" ? "text-emerald-600" : "text-muted-fg";
  return (
    <div className={`rounded-2xl p-4 shadow-lift ${bg} ${className}`}>
      <Icon className={`mb-2 h-4 w-4 ${iconTone}`} aria-hidden="true" />
      <p className="text-xl font-extrabold leading-tight">{value}</p>
      <p className={`text-xs ${solid ? "text-white/90" : "text-muted-fg"}`}>{label}</p>
      {sub && <p className={`text-[11px] ${solid ? "text-white/75" : "text-muted-fg/70"}`}>{sub}</p>}
    </div>
  );
}

