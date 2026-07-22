"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Radio, LayoutDashboard, Users, Clock, CheckCircle2, LogOut,
  TrendingUp, ShoppingBag, Timer, CalendarDays, ExternalLink,
  Mail, Phone, MapPin, Link2, Menu, ChevronDown, List, Check, Loader2, Wallet,
  HelpCircle, Upload, ImagePlus, TrendingDown, Pencil, BarChart3,
  PackageSearch, FileSpreadsheet, ShoppingCart, Layers, Eye, MousePointerClick,
  Send, Boxes, ClipboardList, Tag, CalendarPlus, Trash2, AlertCircle, Settings, Plus,
} from "lucide-react";
import { AffiliateModal, AffiliateActions, type ManagedAffiliate } from "./AffiliateManager";
import BrandsTab, { BrandSelect, BrandFilterCard } from "./BrandsTab";
import ProfileBrandPicker from "@/components/ProfileBrandPicker";
import Modal from "@/components/Modal";
import ExampleHint from "@/components/ExampleHint";
import CommissionEditor, { commissionLabel } from "@/components/CommissionEditor";
import DurationInput from "@/components/DurationInput";
import { compressScreenshot } from "@/lib/image";
import PillarCreate from "./PillarCreate";
import PillarReport from "./PillarReport";
import DateRangeFilter from "@/components/DateRangeFilter";
import Pagination from "@/components/Pagination";
import ImageModal from "@/components/ImageModal";
import { getPage, paginate } from "@/lib/pagination";
import {
  fmtDate, fmtTime, fmtTimeRange, sumDurations,
  scheduledHours, commissionFor,
} from "@/lib/format";
import { resolveRange } from "@/lib/daterange";
import { useNavigate } from "@/lib/useNavigate";
import { useSearchParams } from "next/navigation";
import type { SessionUser } from "@/lib/session";

type TikTokLink = {
  brand_id?: number | null;
  id: number; label: string; url: string;
  commission_type: "percent" | "hour" | null; commission_value: number | null;
};
type Affiliate = {
  id: number; name: string; email: string;
  phone: string | null; address: string | null; links: TikTokLink[];
};
type Live = {
  booking_id: number; affiliate_id: number; affiliate: string; affiliate_email: string;
  profile_id: number; profile_label: string; profile_url: string;
  live_date: string; start_time: string; end_time: string | null;
  note: string | null; status: string; post_url: string | null;
  ads_budget: number | null; affiliate_can_edit: number;
  ad_spend: number | null; gross_revenue: number | null; roi: number | null;
  brand_id: number | null; brand_name: string | null; source: string;
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
  id: number; report_date: string;
  brand_id: number | null; brand_name: string | null;
  campaign_id: string | null;
  campaign_name: string | null; spend: number | null; sku_orders: number | null;
  cost_per_order: number | null; gross_revenue: number | null; roi: number | null;
};
type Post = {
  id: number; affiliate_id: number; post_date: string; status: string;
};
type Overall = {
  id: number; report_date: string;
  brand_id: number | null; brand_name: string | null;
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

const PILLAR_CHILDREN = [
  { key: "pillar-create", label: "Create Pillar", icon: ClipboardList },
  { key: "pillar-report", label: "Reporting Pillar", icon: BarChart3 },
] as const;

const TAB_LABELS: Record<string, string> = {
  brand: "Brand",
  "pillar-create": "Create Pillar",
  "pillar-report": "Reporting Pillar",
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
  const { navigate, prefetch, pending: navPending } = useNavigate();
  const params = useSearchParams();
  const [navOpen, setNavOpen] = useState(false);
  const [navKey, setNavKey] = useState<string | null>(null);

  const active = params.get("tab") || "dashboard";
  const inAffiliateGroup = AFFILIATE_CHILDREN.some((c) => c.key === active);
  const [groupOpen, setGroupOpen] = useState(true);
  const inPillarGroup = PILLAR_CHILDREN.some((c) => c.key === active);
  const [pillarOpen, setPillarOpen] = useState(true);

  function go(key: string) {
    const next = new URLSearchParams(params.toString());
    if (key === "dashboard") next.delete("tab");
    else next.set("tab", key);
    next.delete("page");
    const qs = next.toString();
    setNavKey(key);
    navigate(qs ? `/marketer?${qs}` : "/marketer");
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
            <span className="text-base font-extrabold tracking-tight text-ink">NL Affiliate Army</span>
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
              <NavIcon Icon={LayoutDashboard} busy={navPending && navKey === "dashboard"} />
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
                      onMouseEnter={() => prefetch(`/marketer?tab=${c.key}`)}
                      aria-busy={(navPending && navKey === c.key) || undefined}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                        on ? "bg-primary text-primary-fg shadow-lift" : "text-muted-fg hover:bg-primary/10 hover:text-ink"
                      }`}>
                      {navPending && navKey === c.key
                        ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
                        : <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                      {c.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Brand — everything below is scoped by it, so it leads. */}
            <button onClick={() => go("brand")}
              className={`mt-1 flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                active === "brand" ? "bg-primary text-primary-fg shadow-lift" : "text-ink hover:bg-primary/10"
              }`}>
              <NavIcon Icon={Tag} busy={navPending && navKey === "brand"} />
              Brand
            </button>

            {/* Product GMV — its own main category */}
            <button onClick={() => go("product-gmv")}
              className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                active === "product-gmv" ? "bg-primary text-primary-fg shadow-lift" : "text-ink hover:bg-primary/10"
              }`}>
              <NavIcon Icon={PackageSearch} busy={navPending && navKey === "product-gmv"} />
              Product GMV
            </button>

            {/* Overall — its own main category */}
            <button onClick={() => go("overall")}
              className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                active === "overall" ? "bg-primary text-primary-fg shadow-lift" : "text-ink hover:bg-primary/10"
              }`}>
              <NavIcon Icon={Layers} busy={navPending && navKey === "overall"} />
              Overall
            </button>

            {/* Pillar group */}
            <button onClick={() => setPillarOpen((o) => !o)}
              className={`mt-1 flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                inPillarGroup ? "text-primary" : "text-ink hover:bg-primary/10"
              }`}
              aria-expanded={pillarOpen}>
              <Boxes className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1 text-left">Pillar</span>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${pillarOpen ? "" : "-rotate-90"}`}
                aria-hidden="true" />
            </button>

            {pillarOpen && (
              <div className="ml-4 flex flex-col gap-1 border-l border-line pl-3">
                {PILLAR_CHILDREN.map((c) => {
                  const Icon = c.icon;
                  const on = c.key === active;
                  return (
                    <button key={c.key} onClick={() => go(c.key)}
                      onMouseEnter={() => prefetch(`/marketer?tab=${c.key}`)}
                      aria-busy={(navPending && navKey === c.key) || undefined}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                        on ? "bg-primary text-primary-fg shadow-lift" : "text-muted-fg hover:bg-primary/10 hover:text-ink"
                      }`}>
                      {navPending && navKey === c.key
                        ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
                        : <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                      {c.label}
                    </button>
                  );
                })}
              </div>
            )}
          </nav>

          <div className="mt-4 border-t border-line pt-4">
            {/* The whole identity block is the way into settings — clicking
                your own name is where people look for it. */}
            <Link href="/profile"
              className="mb-2 flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 transition-colors duration-200 hover:bg-primary/10"
              title="Profile & settings">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                <p className="truncate text-xs text-muted-fg">{user.email}</p>
              </div>
              <Settings className="h-3.5 w-3.5 shrink-0 text-muted-fg" aria-hidden="true" />
            </Link>
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
              showUpload affiliates={affiliates} defaultMode="today" />
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
          {active === "brand" && <BrandsTab />}
          {active === "overall" && <OverallTab overall={overall} />}
          {active === "pillar-create" && <PillarCreate />}
          {active === "pillar-report" && <PillarReport />}
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
  const rm = (n: number, has: boolean) => (has ? `RM${n.toFixed(2)}` : "—");

  // "" = All Brands, the default. Every summary respects it — a scheduled
  // live now carries the brand it was booked against.
  const [brand, setBrand] = useState("");
  const inBrand = (id: number | null) => !brand || String(id ?? "") === brand;

  const within = (d: string) => (!from || d >= from) && (!to || d <= to);
  const prod = products.filter((p) => within(p.report_date) && inBrand(p.brand_id));
  const ovr = overall.filter((o) => within(o.report_date) && inBrand(o.brand_id));

  const livesB = inRange.filter((l) => inBrand(l.brand_id));
  const pendingB = pending.filter((l) => inBrand(l.brand_id));
  const successB = success.filter((l) => inBrand(l.brand_id));
  const t = aggregate(successB);

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

      <BrandFilterCard id="dash-brand" value={brand} onChange={setBrand} />

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
          <Kpi Icon={CheckCircle2} label="Total Live" value={livesB.length}
            sub={`${pendingB.length} pending · ${successB.length} done`} />
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
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedAffiliate | null>(null);

  const openAdd = () => { setEditing(null); setOpen(true); };
  const openEdit = (a: Affiliate) => {
    setEditing({ id: a.id, name: a.name, email: a.email, phone: a.phone, address: a.address });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="section-title">List Affiliate</h2>
          <p className="text-sm text-muted-fg">
            Affiliate di bawah anda. Yang anda daftar sendiri terus boleh login.
          </p>
        </div>
        <button className="btn !py-2" onClick={openAdd}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Affiliate
        </button>
      </div>

      {affiliates.length === 0 ? (
        <p className="card text-center text-sm text-muted-fg">
          Belum ada affiliate — klik Add Affiliate, atau minta admin assign kepada anda.
        </p>
      ) : (
      <div className="grid gap-3 md:grid-cols-2">
      {affiliates.map((a) => (
        <div key={a.id} className="card flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-bold text-white">
              {a.name.charAt(0).toUpperCase()}
            </span>
            <p className="min-w-0 flex-1 truncate font-bold text-ink">{a.name}</p>
            <AffiliateActions
              affiliate={{ id: a.id, name: a.name, email: a.email, phone: a.phone, address: a.address }}
              onEdit={() => openEdit(a)} />
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
                    className="rounded-lg border border-line bg-white/60 px-2.5 py-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-ink">{l.label}</span>
                        <a href={l.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 truncate text-[11px] text-accent hover:underline">
                          <span className="truncate">{l.url}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                        </a>
                      </span>
                      {commissionLabel(l) && (
                        <span className="chip shrink-0 bg-emerald-100 text-emerald-700">
                          {commissionLabel(l)}
                        </span>
                      )}
                    </div>
                    {/* Commission is per link — one creator can run one account
                        on a percentage and another on an hourly rate. */}
                    <CommissionEditor profileId={l.id} initial={l} />
                    {/* The brand decides which WhatsApp group the affiliate
                        sees against this account. */}
                    <ProfileBrandPicker profileId={l.id} initial={l.brand_id} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ))}
      </div>
      )}

      <AffiliateModal open={open} affiliate={editing} onClose={() => setOpen(false)} />
    </div>
  );
}

/* ── Schedule (pending / success) ──────────────────────── */

function ScheduleTab({ title, rows, kind, showUpload, affiliates, defaultMode = "today" }: {
  title: string; rows: Live[]; kind: "pending" | "success"; showUpload?: boolean;
  affiliates?: Affiliate[];
  defaultMode?: "today" | "month" | "all";
}) {
  const params = useSearchParams();
  // "" = All Brands, the default.
  const [brand, setBrand] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const shown = rows.filter((l) => !brand || String(l.brand_id ?? "") === brand);

  const page = getPage(params.get("page"));
  const pageRows = paginate(shown, page, 10);

  return (
    <>
      <DateRangeFilter count={shown.length} defaultMode={defaultMode} />

      {showUpload && (
        <div className="flex justify-end">
          <button className="btn !py-2" onClick={() => setAddOpen(true)}>
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            Add Schedule
          </button>
        </div>
      )}

      {/* Check Schedule + Upload LIVE analytics are hidden on this tab for now.
          Both components are kept below so surfacing them again is a one-line
          change rather than a rewrite. */}

      <BrandFilterCard id={`sched-brand-${kind}`} value={brand} onChange={setBrand} />

      {kind === "success" && <SuccessSummary rows={shown} />}
      {shown.length === 0 ? (
        <p className="card text-center text-sm text-muted-fg">No {title.toLowerCase()} in this range.</p>
      ) : (
        <>
          <div className="space-y-3">
            {pageRows.map((l) => <ScheduleCard key={l.booking_id} l={l} kind={kind} />)}
          </div>
          <Pagination page={page} total={shown.length} size={10} />
        </>
      )}

      <AddScheduleModal open={addOpen} affiliates={affiliates ?? []}
        onClose={() => setAddOpen(false)} />
    </>
  );
}

/**
 * Marketer books a live for an affiliate.
 *
 * Planning a week shouldn't require waiting on each affiliate to schedule
 * their own — and one who is locked out would otherwise block the plan.
 */
function AddScheduleModal({
  open, affiliates, onClose,
}: { open: boolean; affiliates: Affiliate[]; onClose: () => void }) {
  const router = useRouter();
  const [profileId, setProfileId] = useState("");
  const [brand, setBrand] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [budget, setBudget] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setProfileId(""); setBrand(""); setDate(""); setStart("");
    setEnd(""); setBudget(""); setNote(""); setError("");
  }, [open]);

  // One dropdown identifies both affiliate and account. Inhouse is offered
  // as a fixed choice rather than a listed profile, because the bucket
  // account is created on first use — it may not exist yet.
  const options = affiliates
    .filter((a) => a.name !== "Inhouse")
    .flatMap((a) =>
      (a.links || []).map((p) => ({ id: String(p.id), label: `${a.name} — ${p.label}` }))
    );

  async function save() {
    setBusy(true); setError("");
    const res = await fetch("/api/marketer/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile_id: profileId, brand_id: brand, live_date: date,
        start_time: start, end_time: end || null,
        ads_budget: budget, note,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) return setError(d.error || "Could not create.");
    onClose(); router.refresh();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Schedule"
      subtitle="Waktu Malaysia (GMT+8). Jadual baru bermula sebagai Pending.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="as-profile">Affiliate / profile</label>
          <select id="as-profile" className="input cursor-pointer" value={profileId}
            onChange={(e) => setProfileId(e.target.value)} required>
            <option value="">— Pilih profile —</option>
            {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            <option value="inhouse">Inhouse (bukan affiliate)</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="as-brand">Brand</label>
          <BrandSelect id="as-brand" value={brand} onChange={setBrand} />
        </div>
        <div>
          <label className="label" htmlFor="as-date">Date</label>
          <input id="as-date" type="date" className="input cursor-pointer"
            value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="as-start">Start</label>
          <input id="as-start" type="time" className="input cursor-pointer"
            value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="as-end">End</label>
          <input id="as-end" type="time" className="input cursor-pointer"
            value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="as-budget">Budget Ads (RM)</label>
          <input id="as-budget" type="number" min="0" step="any" className="input"
            value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <label className="label" htmlFor="as-note">Nota</label>
          <input id="as-note" className="input" value={note}
            onChange={(e) => setNote(e.target.value)} placeholder="optional" />
        </div>
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-danger">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />{error}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn" onClick={save} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                : <CalendarPlus className="h-4 w-4" aria-hidden="true" />}
          Add Schedule
        </button>
      </div>
    </Modal>
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
  // Results can exist without a screenshot now (entered by hand), so the
  // panel keys off the figures rather than the image.
  const hasResults =
    l.gmv != null || l.viewers != null || l.items_sold != null || !!l.duration_live;

  const [budget, setBudget] = useState(l.ads_budget != null ? String(l.ads_budget) : "");
  const [canEdit, setCanEdit] = useState(l.affiliate_can_edit === 1);
  const [busy, setBusy] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  // Manual ad-results editor (pending only) — saving moves the live to Success.
  // Reschedule / re-tag (pending only).
  const [editWhen, setEditWhen] = useState(false);
  const [eDate, setEDate] = useState(l.live_date);
  const [eStart, setEStart] = useState(l.start_time || "");
  const [eEnd, setEEnd] = useState(l.end_time || "");
  const [eBrand, setEBrand] = useState(l.brand_id != null ? String(l.brand_id) : "");
  const [whenErr, setWhenErr] = useState("");
  const [brandMsg, setBrandMsg] = useState("");

  async function removeLive() {
    if (!confirm(`Padam jadual ${l.affiliate} — ${fmtDate(l.live_date)}?`)) return;
    let r = await fetch(`/api/marketer/bookings/${l.booking_id}`, { method: "DELETE" });
    let d = await r.json();
    if (r.status === 409 && d.needsConfirm) {
      if (!confirm(`${d.error}

Teruskan?`)) return;
      r = await fetch(`/api/marketer/bookings/${l.booking_id}?force=1`, { method: "DELETE" });
      d = await r.json();
    }
    if (r.ok) router.refresh();
  }

  async function saveBrand(next: string) {
    setEBrand(next);
    setBrandMsg("");
    const d = await patch({ brand_id: next });
    if (d) {
      setBrandMsg("Saved");
      setTimeout(() => setBrandMsg(""), 1500);
      router.refresh();
    }
  }

  async function saveWhen() {
    setWhenErr("");
    const res = await fetch(`/api/marketer/bookings/${l.booking_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        live_date: eDate, start_time: eStart, end_time: eEnd || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) return setWhenErr(data.error || "Could not save.");
    setEditWhen(false);
    router.refresh();
  }

  const [resultsOpen, setResultsOpen] = useState(false);
  const [spend, setSpend] = useState(l.ad_spend != null ? String(l.ad_spend) : "");
  const [gross, setGross] = useState(l.gross_revenue != null ? String(l.gross_revenue) : "");
  const [dur, setDur] = useState(l.duration_live ?? "");

  // ROI = Gross Revenue / Spend, to 2 dp. Derived rather than typed: it is a
  // definition, so a hand-entered value could only ever disagree with the two
  // numbers sitting next to it.
  const roi = (() => {
    const sp = Number(spend), gr = Number(gross);
    if (!Number.isFinite(sp) || !Number.isFinite(gr) || sp <= 0) return "";
    return (Math.round((gr / sp) * 100) / 100).toFixed(2);
  })();

  async function saveResults() {
    const d = await patch({
      ad_spend: spend, gross_revenue: gross, roi, duration_live: dur,
    });
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
            {/* Always show the brand slot — an unset brand is a gap to fix,
                not something to hide. */}
            <span className={`chip ${
              l.brand_name ? "bg-primary/10 text-primary" : "bg-muted text-muted-fg"
            }`}>
              <Tag className="h-3 w-3" aria-hidden="true" />
              {l.brand_name || "Tiada brand"}
            </span>
            {l.source === "inhouse" && (
              <span className="chip bg-violet-100 text-violet-700"
                title="Dari import Creator Live Performance — tiada jadual sepadan">
                Inhouse
              </span>
            )}
          </div>
          {l.live_title && (
            <p className="mt-1 text-sm font-bold text-ink">{l.live_title}</p>
          )}

          {editWhen ? (
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg"
                  htmlFor={`ed-${l.booking_id}`}>Date</label>
                <input id={`ed-${l.booking_id}`} type="date" className="input cursor-pointer !py-1.5 text-sm"
                  value={eDate} onChange={(e) => setEDate(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg"
                  htmlFor={`es-${l.booking_id}`}>Start</label>
                <input id={`es-${l.booking_id}`} type="time" className="input cursor-pointer !py-1.5 text-sm"
                  value={eStart} onChange={(e) => setEStart(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg"
                  htmlFor={`ee-${l.booking_id}`}>End</label>
                <input id={`ee-${l.booking_id}`} type="time" className="input cursor-pointer !py-1.5 text-sm"
                  value={eEnd} onChange={(e) => setEEnd(e.target.value)} />
              </div>
              <div className="flex items-center gap-2 sm:col-span-3">
                <button className="btn !py-1.5 text-xs" onClick={saveWhen}>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />Save
                </button>
                <button className="btn-ghost !py-1.5 text-xs" onClick={() => {
                  setEditWhen(false); setWhenErr("");
                  setEDate(l.live_date); setEStart(l.start_time || "");
                  setEEnd(l.end_time || "");
                }}>Cancel</button>
                {whenErr && <span className="text-xs text-danger">{whenErr}</span>}
              </div>
            </div>
          ) : (
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-fg">
              <a href={l.profile_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 font-medium text-accent hover:underline">
                {l.profile_label}<ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
              <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{fmtDate(l.live_date)}</span>
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden="true" />{fmtTimeRange(l.start_time, l.end_time)}</span>
              {!done && (
                <button onClick={() => setEditWhen(true)}
                  className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-accent hover:underline">
                  <Pencil className="h-3 w-3" aria-hidden="true" />Edit
                </button>
              )}
            </p>
          )}
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

          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setResultsOpen((o) => !o)}
              className="btn-ghost !py-1.5 text-xs" title="Enter results manually">
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Enter results
            </button>
            <button onClick={removeLive} title="Padam jadual" aria-label="Padam jadual"
              className="cursor-pointer rounded-lg p-1.5 text-muted-fg transition-colors duration-200 hover:bg-danger/10 hover:text-danger">
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Brand is editable on Pending AND Success. Re-tagging does not touch
          the figures, and lives booked before brands existed can only be
          categorised after the fact — which is often once they're complete. */}
      <div className={`flex flex-wrap items-end gap-3 ${
        done ? "mt-4 border-t border-line pt-4" : "mt-3"
      }`}>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg"
            htmlFor={`br-${l.booking_id}`}>Brand</label>
          <div className="flex items-center gap-2">
            <BrandSelect id={`br-${l.booking_id}`} value={eBrand}
              onChange={saveBrand} className="!py-1.5 text-sm sm:w-48" />
            {brandMsg && <span className="text-xs font-medium text-emerald-600">{brandMsg}</span>}
          </div>
        </div>
      </div>

      {/* Manual ad-results entry — Spend / Gross Revenue / ROI. Saving
          moves the live to Success. */}
      {!done && resultsOpen && (
        <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-line bg-white/60 p-3 sm:grid-cols-5">
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
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg">
              ROI <span className="font-normal normal-case opacity-70">(auto)</span>
            </label>
            <input readOnly tabIndex={-1} aria-readonly="true"
              className="input !py-1.5 text-sm cursor-not-allowed bg-muted/40"
              value={roi} placeholder="—"
              title="Gross Revenue ÷ Spend" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg"
              htmlFor={`dur-${l.booking_id}-h`}>Duration</label>
            <DurationInput idPrefix={`dur-${l.booking_id}`} value={dur}
              onChange={setDur} compact />
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

      {(hasProof || hasResults) && (
        <div className={`mt-4 grid grid-cols-1 gap-4 border-t border-line pt-4 ${
          hasProof ? "sm:grid-cols-[140px_1fr]" : ""
        }`}>
          {hasProof && (
            <ImageModal src={l.screenshot_path!} title={l.live_title || "Live result"}
              className="self-start" />
          )}
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

/** Currently not rendered — see the note in ScheduleTab. */
function BulkUpload() {
  const router = useRouter();
  const [files, setFiles] = useState<(File | null)[]>([null, null, null]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ matched: number; unknown: number; total: number } | null>(null);
  const [error, setError] = useState("");

  // Shrink before upload: these are phone screenshots that also get base64'd
  // for Gemini, so raw files are slow on the wire and can trip Vercel's 4.5MB
  // request cap when three are attached at once.
  async function setSlot(i: number, f: File | null) {
    setResult(null); setError("");
    const out = f ? (await compressScreenshot(f)).file : null;
    setFiles((prev) => prev.map((x, idx) => (idx === i ? out : x)));
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
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-extrabold text-white">2</span>
          <ImagePlus className="h-4 w-4 text-primary" aria-hidden="true" />
          Upload LIVE analytics
        </p>
        <ExampleHint
          src="/examples/bulk-live-analytics.jpeg"
          alt="Contoh screenshot LIVE analytics"
          caption="Senarai live dari TikTok. Setiap baris perlu ada: nama live, tarikh & masa, tempoh, spend, gross revenue, ROI. Boleh muat naik sehingga 3 gambar."
        />
      </div>
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

/**
 * Step 1 — Creator Live Performance (.xlsx).
 *
 * The export carries no creator column, so the marketer names the TikTok
 * profile it belongs to. Rows that match an existing schedule fill in its
 * figures; rows with no schedule are created as Inhouse so the live is not
 * lost, and the marketer can tag the brand afterwards on the card.
 */
/** Currently not rendered — see the note in ScheduleTab. */
function LivePerformanceImport() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function submit() {
    if (!file) return setError("Choose the .xlsx export.");
    setBusy(true); setError(""); setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/marketer/live-performance/import", { method: "POST", body: fd });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || "Check failed");
    setResult(data);
    setFile(null);
    router.refresh();
  }

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-extrabold text-white">1</span>
          <FileSpreadsheet className="h-4 w-4 text-primary" aria-hidden="true" />
          Check Schedule (.xlsx)
        </p>
        <a href="/examples/creator-live-performance-sample.xlsx" download
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline">
          <FileSpreadsheet className="h-3 w-3" aria-hidden="true" />
          Muat turun contoh
        </a>
      </div>

      <p className="text-[11px] text-muted-fg">
        Semak live yang benar-benar berjalan melawan jadual affiliate. Yang
        padan akan diisi automatik; yang <b>tiada jadual</b> akan dibuka di
        bawah <b>Inhouse</b> supaya tiada live tercicir.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <label className="btn-ghost cursor-pointer !py-2">
          {file ? <><Check className="h-4 w-4" aria-hidden="true" />{file.name.slice(0, 22)}</>
                : <><Upload className="h-4 w-4" aria-hidden="true" />Choose .xlsx</>}
          <input type="file" accept=".xlsx,.xls" className="sr-only"
            onChange={(e) => { setFile(e.target.files?.[0] || null); setError(""); setResult(null); }} />
        </label>
        <button className="btn !py-2.5" onClick={submit} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                : <Check className="h-4 w-4" aria-hidden="true" />}
          Check
        </button>
      </div>

      {result && (
        <div className="space-y-2 rounded-xl border border-line bg-white/60 p-3">
          <p className="text-xs text-muted-fg">
            {result.total} live disemak —{" "}
            <span className="font-semibold text-emerald-600">{result.matched} ada jadual</span>
            {result.inhouse > 0 && (
              <> · <span className="font-semibold text-violet-600">{result.inhouse} tiada jadual → Inhouse</span></>
            )}
            {result.skipped > 0 && <> · {result.skipped} dilangkau</>}
          </p>
          {/* Name the lives that had no schedule — that is the whole point of
              the check, and a bare count would leave the marketer guessing. */}
          {result.inhouseList?.length > 0 && (
            <ul className="space-y-0.5">
              {result.inhouseList.map((x: any, i: number) => (
                <li key={i} className="text-[11px] text-muted-fg">
                  <span className="font-semibold text-violet-700">Tiada jadual</span>{" "}
                  {fmtDate(x.date)} · {fmtTime(x.time)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
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
  // "" = All Brands, the default.
  const [brand, setBrand] = useState("");
  // Sub-profiles start collapsed: the main rows are the summary, and the
  // per-link breakdown is detail you opt into.
  const [showSubs, setShowSubs] = useState(false);
  const shown = lives.filter((l) => !brand || String(l.brand_id ?? "") === brand);

  const t = aggregate(shown);
  const rm = (n: number, has: boolean) => (has ? `RM${n.toFixed(2)}` : "—");

  // Narrowing to a brand should also drop affiliates who ran nothing for it,
  // otherwise the table fills with all-zero rows.
  const active = brand
    ? affiliates.filter((a) => shown.some((l) => l.affiliate_id === a.id))
    : affiliates;

  /** Per-link breakdown for one affiliate, with what each link earned. */
  function subsFor(a: Affiliate) {
    const mine = shown.filter((l) => l.affiliate_id === a.id);
    const byProfile = new Map<number, Live[]>();
    for (const l of mine) {
      const list = byProfile.get(l.profile_id) || [];
      list.push(l);
      byProfile.set(l.profile_id, list);
    }
    return [...byProfile.entries()].map(([pid, ls]) => {
      const agg = aggregate(ls);
      const link = a.links.find((x) => x.id === pid);
      // Hourly pay follows the booked slot, not the streamed duration, and
      // only for lives that actually completed — a pending slot has not been
      // verified as having happened.
      const hours = ls
        .filter((l) => l.status === "completed")
        .reduce((s, l) => s + scheduledHours(l.start_time, l.end_time), 0);
      const commission = link ? commissionFor(link, agg.gmv, hours) : 0;
      return {
        pid, agg, link, hours, commission,
        label: link?.label ?? ls[0]?.profile_label ?? "—",
      };
    });
  }

  // What every affiliate is owed in this range, together.
  const totalCommission = active.reduce(
    (s, a) => s + subsFor(a).reduce((x, sub) => x + sub.commission, 0),
    0
  );

  return (
    <>
      <DateRangeFilter count={shown.length} defaultMode="month" />

      <BrandFilterCard id="rep-brand" value={brand} onChange={setBrand} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi Icon={Users} label="Total Affiliate" value={active.length} />
        <Kpi Icon={TrendingUp} label="Affiliate Sales" value={`RM${t.gmv.toFixed(2)}`} fill="yellow" />
        <Kpi Icon={Users} label="Affiliate Viewers" value={t.viewers} />
        <Kpi Icon={ShoppingBag} label="Affiliate Items" value={t.items} />
        <Kpi Icon={Timer} label="Affiliate Duration" value={t.duration} />
        <Kpi Icon={Wallet} label="Affiliate Budget" value={rm(t.budget, t.hasBudget)} />
        <Kpi Icon={Wallet} label="Affiliate Spend" value={rm(t.spend, t.hasSpend)} fill="red" />
        <Kpi Icon={TrendingUp} label="Affiliate Gross Revenue" value={rm(t.gross, t.hasGross)} fill="emerald" />
        <Kpi Icon={(t.roi ?? 0) >= 1 ? TrendingUp : TrendingDown} label="Affiliate ROI"
          value={t.roi != null ? t.roi : "—"} />
        <Kpi Icon={Wallet} label="Total Commission"
          value={`RM${totalCommission.toFixed(2)}`} fill="emerald" />
      </div>

      <div className="flex justify-end">
        <button onClick={() => setShowSubs((o) => !o)} className="btn-ghost !py-2 text-xs">
          <ChevronDown aria-hidden="true"
            className={`h-4 w-4 transition-transform duration-200 ${showSubs ? "rotate-180" : ""}`} />
          {showSubs ? "Sembunyi sub profile" : "Papar sub profile"}
        </button>
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
              <th className="px-4 py-3 font-semibold">Jenis Komisyen</th>
              <th className="px-4 py-3 text-right font-semibold">Rate</th>
              <th className="px-4 py-3 text-right font-semibold">Komisyen</th>
            </tr>
          </thead>
          <tbody>
            {active.map((a) => {
              const r = aggregate(shown.filter((l) => l.affiliate_id === a.id));
              const subs = subsFor(a);
              const totalIncome = subs.reduce((s, x) => s + x.commission, 0);

              return (
                <Fragment key={a.id}>
                  <tr className="border-t border-line bg-white/40">
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
                    <td className="px-4 py-3 text-xs text-muted-fg" colSpan={2}>Total Income</td>
                    <td className="px-4 py-3 text-right font-extrabold text-emerald-700">
                      RM{totalIncome.toFixed(2)}
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
                      <td className="px-4 py-2 text-right">RM{s.agg.gmv.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">{s.agg.viewers}</td>
                      <td className="px-4 py-2 text-right">{s.agg.items}</td>
                      <td className="px-4 py-2">
                        {s.agg.duration}
                        {s.link?.commission_type === "hour" && (
                          <span className="ml-1 text-[11px] text-muted-fg">
                            ({s.hours}j jadual)
                          </span>
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
              <tr><td colSpan={12} className="px-4 py-12 text-center text-muted-fg">
                {affiliates.length === 0
                  ? "No affiliates assigned to you yet."
                  : "No affiliate ran a live for this brand in this range."}
              </td></tr>
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
  const [brand, setBrand] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    if (!file) return setError("Choose an .xlsx file.");
    if (!brand) return setError("Pick a brand.");
    if (!date) return setError("Pick the report date.");
    setBusy(true); setError(""); setMsg("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("report_date", date);
    fd.append("brand_id", brand);
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
        <a href="/examples/product-campaign-data-sample.xlsx" download
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline">
          <FileSpreadsheet className="h-3 w-3" aria-hidden="true" />
          Muat turun contoh .xlsx
        </a>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px]">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg"
            htmlFor="pg-brand">Brand</label>
          <BrandSelect id="pg-brand" value={brand} onChange={setBrand}
            className="!py-2 text-sm" />
        </div>
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
  // "" = All Brands, the default.
  const [brand, setBrand] = useState("");
  // Click a header to sort; click again to reverse. Default newest-first is
  // preserved as the null state so the tab opens as it always has.
  const [sort, setSort] = useState<{ k: string; dir: 1 | -1 } | null>(null);
  const rows = products.filter((p) => {
    if (from && p.report_date < from) return false;
    if (to && p.report_date > to) return false;
    if (brand && String(p.brand_id ?? "") !== brand) return false;
    return true;
  });

  if (sort) {
    const { k, dir } = sort;
    rows.sort((a: any, b: any) => {
      const x = a[k], y = b[k];
      // Nulls sink to the bottom either way — an empty cell is not a value.
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return (typeof x === "number" && typeof y === "number"
        ? x - y
        : String(x).localeCompare(String(y))) * dir;
    });
  }

  function toggleSort(k: string) {
    setSort((cur) =>
      cur && cur.k === k ? (cur.dir === 1 ? { k, dir: -1 } : null) : { k, dir: 1 }
    );
  }

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
      <DateRangeFilter count={rows.length} countNoun={["campaign", "campaigns"]}
        defaultMode="month" />

      <BrandFilterCard id="pg-filter-brand" value={brand} onChange={setBrand} />

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
                  <SortTh k="campaign_name" sort={sort} on={toggleSort}>Product Campaign</SortTh>
                  <SortTh k="brand_name" sort={sort} on={toggleSort}>Brand</SortTh>
                  <SortTh k="report_date" sort={sort} on={toggleSort}>Date</SortTh>
                  <SortTh k="spend" sort={sort} on={toggleSort} right>Product Spend</SortTh>
                  <SortTh k="sku_orders" sort={sort} on={toggleSort} right>Product SKU Orders</SortTh>
                  <SortTh k="cost_per_order" sort={sort} on={toggleSort} right>Product Cost / Order</SortTh>
                  <SortTh k="gross_revenue" sort={sort} on={toggleSort} right>Product Gross Revenue</SortTh>
                  <SortTh k="roi" sort={sort} on={toggleSort} right>Product ROI</SortTh>
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
                    <td className="px-4 py-3">
                      {r.brand_name
                        ? <span className="chip bg-primary/10 text-primary">{r.brand_name}</span>
                        : <span className="text-muted-fg/50">—</span>}
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
  const [brand, setBrand] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    // Both panels are required: Overview carries Cost/Orders/Revenue/ROI and
    // Key metrics carries GMV/Visitors/Impressions/Clicks. One alone leaves
    // half the report blank.
    if (!img1 || !img2) return setError("Attach both Image 1 and Image 2.");
    if (!brand) return setError("Pick a brand.");
    if (!date) return setError("Pick the report date.");
    setBusy(true); setError(""); setMsg("");
    const fd = new FormData();
    if (img1) fd.append("image1", img1);
    if (img2) fd.append("image2", img2);
    fd.append("report_date", date);
    fd.append("brand_id", brand);
    const res = await fetch("/api/marketer/overall/import", { method: "POST", body: fd });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || "Import failed");
    setMsg("Saved");
    setImg1(null); setImg2(null);
    router.refresh();
  }

  async function pick(f: File | null, set: (f: File | null) => void) {
    setError(""); setMsg("");
    set(f ? (await compressScreenshot(f)).file : null);
  }

  const slot = (
    n: 1 | 2, label: string, file: File | null,
    set: (f: File | null) => void, example: string
  ) => (
    <div className="flex flex-1 flex-col gap-1">
      <label className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-3 text-center text-xs font-semibold transition-colors ${
        file ? "border-emerald-400 bg-emerald-50 text-emerald-600" : "border-line text-muted-fg hover:border-primary hover:text-primary"
      }`}>
        {file ? <Check className="h-5 w-5" aria-hidden="true" /> : <ImagePlus className="h-5 w-5" aria-hidden="true" />}
        <span>Image {n} <span className="text-danger">*</span></span>
        <span className="font-normal opacity-70">{label}</span>
        <input type="file" accept="image/*" className="sr-only"
          onChange={(e) => pick(e.target.files?.[0] || null, set)} />
      </label>
      <div className="text-center">
        <ExampleHint src={example} alt={`Contoh — ${label}`}
          caption="Screenshot dari TikTok Ads Manager → GMV Max." />
      </div>
    </div>
  );

  return (
    <div className="card space-y-3">
      <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
        <ImagePlus className="h-4 w-4 text-primary" aria-hidden="true" />
        Import Overall — GMV Max screenshots
      </p>
      <div className="flex flex-wrap items-stretch gap-3">
        {slot(1, "Overview panel", img1, setImg1, "/examples/overall-overview.jpeg")}
        {slot(2, "Key metrics panel", img2, setImg2, "/examples/overall-key-metrics.jpeg")}
        <div className="flex flex-col justify-end gap-2">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg"
              htmlFor="ov-brand">Brand</label>
            <BrandSelect id="ov-brand" value={brand} onChange={setBrand}
              className="!py-2 text-sm" />
          </div>
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
  // "" = All Brands, the default.
  const [brand, setBrand] = useState("");
  const rows = overall.filter((o) => {
    if (from && o.report_date < from) return false;
    if (to && o.report_date > to) return false;
    if (brand && String(o.brand_id ?? "") !== brand) return false;
    return true;
  });

  const sum = (k: keyof Overall) => rows.reduce((s, r) => s + ((r[k] as number) || 0), 0);
  const cost = sum("cost"), gross = sum("gross_revenue"), gmv = sum("gmv");
  const roi = cost > 0 ? Math.round((gross / cost) * 100) / 100 : null;

  return (
    <>
      <OverallImport />
      <DateRangeFilter count={rows.length} countNoun={["report", "reports"]}
        defaultMode="month" />

      <BrandFilterCard id="ov-filter-brand" value={brand} onChange={setBrand} />

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
                <th className="px-4 py-3 font-semibold">Brand</th>
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
                  <td className="px-4 py-3">
                    {o.brand_name
                      ? <span className="chip bg-primary/10 text-primary">{o.brand_name}</span>
                      : <span className="text-muted-fg/50">—</span>}
                  </td>
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
  const router = useRouter();
  const [convert, setConvert] = useState<Unknown | null>(null);

  async function discard(r: Unknown) {
    if (!confirm(`Buang baris ini? (${r.live_name || "tiada nama"})`)) return;
    await fetch(`/api/marketer/unknown/${r.id}`, { method: "DELETE" });
    router.refresh();
  }

  if (rows.length === 0)
    return (
      <p className="card text-center text-sm text-muted-fg">
        Tiada baris tertunggak — Unknown kosong. Baris analytics yang tidak
        padan dengan mana-mana jadual akan muncul di sini.
      </p>
    );

  return (
    <>
      <p className="card mb-3 text-sm text-muted-fg">
        Baris di sini belum ada jadual. Tekan <b>Create schedule</b> untuk
        bukanya di bawah <b>Inhouse</b> supaya ia masuk ke Pending/Success —
        atau buang jika ia bukan live anda. Sasaran: Unknown sentiasa kosong.
      </p>

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted-fg">
            <tr>
              <th className="px-4 py-3 font-semibold">Live name</th>
              <th className="px-4 py-3 font-semibold">Date / Time</th>
              <th className="px-4 py-3 font-semibold">Duration</th>
              <th className="px-4 py-3 text-right font-semibold">Spend</th>
              <th className="px-4 py-3 text-right font-semibold">Gross Revenue</th>
              <th className="px-4 py-3 text-right font-semibold">ROI</th>
              <th className="px-4 py-3 font-semibold">Action</th>
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
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button className="btn !py-1.5 text-xs" onClick={() => setConvert(r)}>
                      <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
                      Create schedule
                    </button>
                    <button onClick={() => discard(r)} aria-label="Buang baris"
                      className="cursor-pointer rounded-lg p-1.5 text-muted-fg transition-colors duration-200 hover:bg-danger/10 hover:text-danger">
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConvertUnknownModal row={convert} onClose={() => setConvert(null)}
        onDone={() => { setConvert(null); router.refresh(); }} />
    </>
  );
}

/**
 * Book an Unknown row as an Inhouse schedule.
 *
 * Everything is prefilled from the row, because the usual case is "yes, this
 * really happened — file it". The fields stay editable so a misread time or
 * figure can be corrected before it becomes a schedule.
 */
function ConvertUnknownModal({
  row, onClose, onDone,
}: { row: Unknown | null; onClose: () => void; onDone: () => void }) {
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [dur, setDur] = useState("");
  const [brand, setBrand] = useState("");
  const [budget, setBudget] = useState("");
  const [spend, setSpend] = useState("");
  const [gross, setGross] = useState("");
  const [roi, setRoi] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!row) return;
    setDate(row.live_date || "");
    setStart((row.live_time || "").slice(0, 5));
    setEnd("");
    setDur(row.duration || "");
    setBrand("");
    setBudget("");
    setSpend(row.ad_spend != null ? String(row.ad_spend) : "");
    setGross(row.gross_revenue != null ? String(row.gross_revenue) : "");
    setRoi(row.roi != null ? String(row.roi) : "");
    setError("");
  }, [row]);

  async function save() {
    if (!row) return;
    setBusy(true); setError("");
    const res = await fetch(`/api/marketer/unknown/${row.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        live_date: date, start_time: start, end_time: end || null,
        duration_live: dur, brand_id: brand,
        ads_budget: budget, ad_spend: spend, gross_revenue: gross, roi,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || "Could not create.");
    onDone();
  }

  const field = (label: string, node: React.ReactNode) => (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg">
        {label}
      </label>
      {node}
    </div>
  );

  return (
    <Modal open={!!row} onClose={onClose}
      title="Create schedule (Inhouse)"
      subtitle={row?.live_name || "Baris tanpa jadual"}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {field("Date", <input type="date" className="input !py-1.5 text-sm"
          value={date} onChange={(e) => setDate(e.target.value)} />)}
        {field("Start", <input type="time" className="input !py-1.5 text-sm"
          value={start} onChange={(e) => setStart(e.target.value)} />)}
        {field("End (optional)", <input type="time" className="input !py-1.5 text-sm"
          value={end} onChange={(e) => setEnd(e.target.value)} />)}

        <div className="sm:col-span-3">
          {field("Duration", <DurationInput idPrefix={`unk-${row?.id ?? 0}`}
            value={dur} onChange={setDur} compact />)}
        </div>

        {field("Brand (optional)", <BrandSelect id={`unk-brand-${row?.id ?? 0}`}
          value={brand} onChange={setBrand} className="!py-1.5 text-sm" />)}
        {field("Budget (RM)", <input type="number" min="0" step="any" className="input !py-1.5 text-sm"
          value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0.00" />)}
        {field("Spend (RM)", <input type="number" min="0" step="any" className="input !py-1.5 text-sm"
          value={spend} onChange={(e) => setSpend(e.target.value)} />)}
        {field("Gross Revenue (RM)", <input type="number" min="0" step="any" className="input !py-1.5 text-sm"
          value={gross} onChange={(e) => setGross(e.target.value)} />)}
        {field("ROI", <input type="number" step="any" className="input !py-1.5 text-sm"
          value={roi} onChange={(e) => setRoi(e.target.value)} />)}
      </div>

      <p className="mt-3 text-[11px] text-muted-fg">
        Ia akan dibuka di bawah <b>Inhouse</b>. Jika Budget + Spend + Gross +
        ROI lengkap, ia terus masuk <b>Success</b>.
      </p>

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-danger">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />{error}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn" onClick={save} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                : <CalendarPlus className="h-4 w-4" aria-hidden="true" />}
          Create schedule
        </button>
      </div>
    </Modal>
  );
}

/** Sidebar icon that becomes a spinner while that destination is loading. */
function NavIcon({ Icon, busy }: { Icon: typeof Users; busy: boolean }) {
  return busy
    ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
    : <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />;
}

/** Clickable table header: asc -> desc -> back to the default order. */
function SortTh({
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

