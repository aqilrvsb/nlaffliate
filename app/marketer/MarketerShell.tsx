"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Radio, LayoutDashboard, Users, Clock, CheckCircle2, LogOut,
  TrendingUp, ShoppingBag, Timer, CalendarDays, ExternalLink,
  Mail, Phone, MapPin, Link2, Menu, ChevronDown, List, Check, Loader2, Wallet,
  IdCard,
  HelpCircle, Upload, ImagePlus, TrendingDown, Pencil, BarChart3,
  PackageSearch, FileSpreadsheet, ShoppingCart, Layers, Eye, MousePointerClick,
  Send, Boxes, ClipboardList, Tag, CalendarPlus, Trash2, AlertCircle, Settings, Plus,
  Package, ListChecks, CreditCard, Download, X, UserPlus,
} from "lucide-react";
import { AffiliateModal, AffiliateActions, ActivateAffiliate, type ManagedAffiliate } from "./AffiliateManager";
import BrandsTab, { BrandSelect, BrandFilterCard } from "./BrandsTab";
import AdminBrandsTab from "@/app/admin/BrandsTab";
import ProfileBrandPicker from "@/components/ProfileBrandPicker";
import {
  BrandCommissionModal, CommissionSummary, CommissionButton, rateLabel,
  type LinkBrand,
} from "@/components/BrandCommission";
import AddProfileLink, { DeleteProfileLink } from "@/components/AddProfileLink";
import AffiliatePosts from "./AffiliatePosts";
import SortTh, { useTableSort } from "@/components/SortableTable";
import SopButton from "@/components/SopButton";
import Modal from "@/components/Modal";
import ExampleHint from "@/components/ExampleHint";
import DurationInput from "@/components/DurationInput";
import { compressScreenshot } from "@/lib/image";
import ProductsTab from "@/app/admin/ProductsTab";
import PillarCreate from "./PillarCreate";
import PillarReport from "./PillarReport";
import { EditContext, useCanEdit } from "./edit-context";
import { MarketerScopeContext, useMarketerScope } from "./team-context";
import DateRangeFilter from "@/components/DateRangeFilter";
import Pagination from "@/components/Pagination";
import ImageModal from "@/components/ImageModal";
import { getPage, paginate } from "@/lib/pagination";
import {
  fmtDate, fmtTime, fmtTimeRange, sumDurations,
  durationHours, commissionFor, durationToSeconds, fmtRM, fmtNum, fmtRMor, parseNum,
} from "@/lib/format";
import { DEFAULT_IDR_RATE } from "@/lib/currency";
import { resolveRange } from "@/lib/daterange";
import { useNavigate } from "@/lib/useNavigate";
import { useSearchParams } from "next/navigation";
import type { SessionUser } from "@/lib/session";
import { confirmDialog } from "@/lib/swal";
import { handleFromUrl } from "@/lib/tiktok";

type TikTokLink = {
  brand_id?: number | null;
  brand_ids?: number[] | null;
  brand_names?: string[] | null;
  brands?: LinkBrand[] | null;
  brand_name?: string | null;
  id: number; label: string; url: string;
  commission_type: "percent" | "hour" | null; commission_value: number | null;
};
type Affiliate = {
  id: number; name: string; email: string | null; staff_id: string | null;
  phone: string | null; address: string | null; activated: boolean; links: TikTokLink[];
};
type Live = {
  booking_id: number; affiliate_id: number; affiliate: string;
  profile_id: number; profile_label: string; profile_url: string;
  profile_brand: string | null;
  link_brands?: LinkBrand[] | null;
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
type SalesLive = {
  id: number; report_date: string;
  brand_id: number | null; brand_name: string | null;
  cost: number | null; net_cost: number | null; gross_revenue: number | null;
  roi: number | null; sku_orders: number | null; cost_per_order: number | null;
  live_views: number | null; current_budget: number | null;
};
type SalesProduct = {
  id: number; report_date: string;
  brand_id: number | null; brand_name: string | null;
  cost: number | null; net_cost: number | null; current_budget: number | null;
  sku_orders: number | null; cost_per_order: number | null;
  gross_revenue: number | null; roi: number | null;
};
type SalesCard = {
  id: number; report_date: string;
  brand_id: number | null; brand_name: string | null;
  cost: number | null; sku_orders: number | null; cost_per_order: number | null;
  gross_revenue: number | null; roi: number | null;
};
type SalesCampaign = {
  id: number; report_date: string;
  brand_id: number | null; brand_name: string | null;
  campaign_id: string | null; campaign_name: string | null;
  cost: number | null; net_cost: number | null; gross_revenue: number | null; roi: number | null;
  sku_orders: number | null; cost_per_order: number | null;
  live_views?: number | null; current_budget?: number | null;
};
type SpendTtm = {
  id: number; report_date: string;
  brand_id: number | null; brand_name: string | null;
  ttm_cost: number | null; ttm_gross_revenue: number | null;
};
type ReportingSheetRow = {
  id: number; report_date: string;
  brand_id: number | null; brand_name: string | null;
  ord: number; sesi: string | null; masa: string | null;
  c_viewers: number | null; r_target: number | null; g_revenue: number | null;
  cost: number | null; v_boost: number | null; cv_boost: number | null; d_time: string | null;
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
  gmv_live: number | null; gmv_live_creator: number | null; gmv_live_seller: number | null;
  gmv_video: number | null; gmv_video_creator: number | null; gmv_video_seller: number | null;
  gmv_product_cards: number | null;
};
type CreatorReport = {
  id: number; report_date: string;
  brand_id: number | null; brand_name: string | null;
  post_gross_revenue: number | null; post_with_links: number | null;
  post_authorized: number | null; post_creators_mass_auth: number | null;
  creative_gross_revenue: number | null; creative_authorized: number | null;
  creative_total_creators: number | null; creative_creators_mass_auth: number | null;
  img1_path: string | null; img2_path: string | null;
};
type LiveUser = { id: number; name: string; user_type: string; phone: string | null; tiktok_link: string | null };
type LiveSession = {
  id: number; live_user_id: number; brand_id: number | null;
  live_date: string; start_time: string | null; end_time: string | null;
  status: string; note: string | null;
  ads_budget: number | null; ad_spend: number | null; gross_revenue: number | null; roi: number | null;
  gmv: number | null; viewers: number | null; items_sold: number | null; duration_live: string | null;
  attachment_path: string | null;
  live_user_name: string; user_type: string; brand_name: string | null;
};
const LIVE_USER_TYPES = ["KOL", "Affiliate Special", "Founder", "HQ"] as const;
type DataQuality = {
  id: number; report_date: string;
  brand_id: number | null; brand_name: string | null;
  product_id: number | null; product_name: string | null;
  inque: number; learning: number; delivering: number;
  exploring: number; explored: number; outstanding: number; performing: number;
};

// Sidebar structure: a couple of top-level items + one expandable group.
const AFFILIATE_CHILDREN = [
  { key: "affiliates", label: "List Affiliate", icon: List },
  { key: "pending", label: "Pending Affiliate", icon: Clock },
  { key: "success", label: "Success Affiliate", icon: CheckCircle2 },
  { key: "posting", label: "Posting Affiliate", icon: Send },
  { key: "reporting", label: "Reporting Affiliate", icon: BarChart3 },
  // Unknown is hidden for now. The tab body is still routed, so ?tab=unknown
  // reaches it and putting the entry back is a one-line change.
] as const;

const PILLAR_CHILDREN = [
  { key: "pillar-create", label: "Create Pillar", icon: ClipboardList },
  { key: "pillar-report", label: "Reporting Pillar", icon: BarChart3 },
] as const;

// Live Session — a parallel schedule for non-login live users (KOL, Founder…).
const LIVE_CHILDREN = [
  { key: "live-users", label: "List Live User", icon: List },
  { key: "live-pending", label: "Pending Live", icon: Clock },
  { key: "live-success", label: "Success Live", icon: CheckCircle2 },
  { key: "live-reporting", label: "Reporting Live User", icon: BarChart3 },
] as const;

// Sales: two TikTok campaign-data exports plus manual Card entry, each with a
// daily view and a per-campaign detail view.
const SALES_CHILDREN = [
  { key: "sales-live", label: "Live", icon: Radio },
  { key: "sales-live-campaign", label: "Live · Campaign", icon: List },
  { key: "sales-product", label: "Product", icon: PackageSearch },
  { key: "sales-product-campaign", label: "Product · Campaign", icon: List },
  { key: "sales-card", label: "Product Card", icon: CreditCard },
] as const;

const TAB_LABELS: Record<string, string> = {
  brand: "Brand",
  "pillar-create": "Create Pillar",
  "pillar-report": "Reporting Pillar",
  dashboard: "Dashboard",
  team: "List Marketer",
  affiliates: "List Affiliate",
  pending: "Pending Affiliate",
  success: "Success Affiliate",
  posting: "Posting Affiliate",
  reporting: "Reporting Affiliate",
  unknown: "Unknown Affiliate",
  product: "Product",
  "sales-live": "Sales · Live",
  "sales-live-campaign": "Sales · Live Campaign",
  "sales-product": "Sales · Product",
  "sales-product-campaign": "Sales · Product Campaign",
  "sales-card": "Sales · Product Card",
  overall: "Overall",
  creator: "Creator Quantity",
  "live-users": "List Live User",
  "live-pending": "Pending Live",
  "live-success": "Success Live",
  "live-reporting": "Reporting Live User",
  "data-quality": "Data Quality",
  spend: "TTAM",
  "reporting-sheet": "Reporting Sheet",
};

export default function MarketerShell({
  user, affiliates, lives, unknowns, salesLive, salesProduct, overall, posts, creatorReports,
  liveUsers, liveSessions, dataQuality, salesCard, spendTtm, reportingSheet,
  salesLiveCampaign, salesProductCampaign, marketers = [], leaders = [],
  pendingAffiliates = [], overseer = "", viewValue = "", canEdit = true,
  teamAvailable = false, teamMode = false,
}: {
  user: SessionUser; affiliates: Affiliate[]; lives: Live[];
  unknowns: Unknown[]; salesLive: SalesLive[]; salesProduct: SalesProduct[];
  overall: Overall[]; posts: Post[]; creatorReports: CreatorReport[];
  liveUsers: LiveUser[]; liveSessions: LiveSession[]; dataQuality: DataQuality[];
  salesCard: SalesCard[]; spendTtm: SpendTtm[]; reportingSheet: ReportingSheetRow[];
  salesLiveCampaign: SalesCampaign[]; salesProductCampaign: SalesCampaign[];
  marketers?: { id: number; name: string; staff_id: string | null; leader_id?: number | null }[];
  /** Director-only: the leaders they can drill into (per-team option groups). */
  leaders?: { id: number; name: string; staff_id: string | null }[];
  /** Unassigned affiliates any marketer may grab. */
  pendingAffiliates?: { id: number; name: string; staff_id: string | null; phone: string | null }[];
  /** Which oversight role is viewing, if any. */
  overseer?: "leader" | "director" | "";
  /** The switcher's current <option> value ("" = Saya, "all", "team-<id>", "<id>"). */
  viewValue?: string;
  /** False when monitoring someone else — the workspace is read-only. */
  canEdit?: boolean;
  /** Plain-marketer "All Team" scope: whether it's offered, and whether it's on. */
  teamAvailable?: boolean;
  teamMode?: boolean;
}) {
  const router = useRouter();
  const { navigate, prefetch, pending: navPending } = useNavigate();
  const params = useSearchParams();
  const [navOpen, setNavOpen] = useState(false);
  const [navKey, setNavKey] = useState<string | null>(null);
  // Drill-down from Posting Affiliate into one affiliate's post grid.
  const [postsFor, setPostsFor] = useState<
    { a: Affiliate; status: "pending" | "done" } | null
  >(null);

  const active = params.get("tab") || "dashboard";
  const inAffiliateGroup = AFFILIATE_CHILDREN.some((c) => c.key === active);
  const [groupOpen, setGroupOpen] = useState(true);
  const inPillarGroup = PILLAR_CHILDREN.some((c) => c.key === active);
  const [pillarOpen, setPillarOpen] = useState(true);
  const inSalesGroup = SALES_CHILDREN.some((c) => c.key === active);
  const [salesOpen, setSalesOpen] = useState(true);
  const inLiveGroup = LIVE_CHILDREN.some((c) => c.key === active);
  const [liveOpen, setLiveOpen] = useState(true);

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

  // Leader-only: switch scope. "" = Saya (own, editable), "all" = whole team
  // aggregate, a numeric id = one teammate. Keeps the current tab and filters.
  function goMarketer(val: string) {
    const next = new URLSearchParams(params.toString());
    if (val) next.set("m", val); else next.delete("m");
    next.delete("page");
    const qs = next.toString();
    navigate(qs ? `/marketer?${qs}` : "/marketer");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  // Stop managing a marketer and return to the manager's own dashboard.
  async function exitManage() {
    await fetch("/api/leader/act-as", { method: "DELETE" });
    window.location.href = user.impersonatorRole === "admin" ? "/admin" : "/marketer";
  }

  // Enter "manage as" for the marketer currently in the switcher.
  async function manageCurrent() {
    if (typeof viewValue !== "string" || !/^\d+$/.test(viewValue)) return;
    const res = await fetch("/api/leader/act-as", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marketer_id: Number(viewValue) }),
    });
    if (res.ok) window.location.href = "/marketer";
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

  // Product already includes Card in the TikTok export, so everything downstream
  // works with Product-only = imported − Card (in-memory, no query).
  const salesProductAdj = adjustProductByCard(salesProduct, salesCard);

  return (
    <MarketerScopeContext.Provider value={{ teamAvailable, teamMode }}>
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

            {/* Leader-only: manage the marketers under this leader. */}
            {user.role === "leader" && (
              <button onClick={() => go("team")}
                className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                  active === "team" ? "bg-primary text-primary-fg shadow-lift" : "text-ink hover:bg-primary/10"
                }`}>
                <NavIcon Icon={Users} busy={navPending && navKey === "team"} />
                List Marketer
              </button>
            )}

            {/* Brand & Product: view-only. Admin creates + assigns; the
                marketer only sees the ones that are theirs. */}
            <button onClick={() => go("brand")}
              className={`mt-1 flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                active === "brand" ? "bg-primary text-primary-fg shadow-lift" : "text-ink hover:bg-primary/10"
              }`}>
              <NavIcon Icon={Tag} busy={navPending && navKey === "brand"} />
              Brand
            </button>
            <button onClick={() => go("product")}
              className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                active === "product" ? "bg-primary text-primary-fg shadow-lift" : "text-ink hover:bg-primary/10"
              }`}>
              <NavIcon Icon={Package} busy={navPending && navKey === "product"} />
              Product
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

            {/* Live Session group — non-login live users (KOL/Founder/HQ/…) */}
            <button onClick={() => setLiveOpen((o) => !o)}
              className={`mt-1 flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                inLiveGroup ? "text-primary" : "text-ink hover:bg-primary/10"
              }`}
              aria-expanded={liveOpen}>
              <Radio className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1 text-left">Live Session</span>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${liveOpen ? "" : "-rotate-90"}`}
                aria-hidden="true" />
            </button>

            {liveOpen && (
              <div className="ml-4 flex flex-col gap-1 border-l border-line pl-3">
                {LIVE_CHILDREN.map((c) => {
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

            {/* Sales group — one campaign-data upload, three views:
                Live (campaign overview) · Product (Video) · Card (Product card) */}
            <button onClick={() => setSalesOpen((o) => !o)}
              className={`mt-1 flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                inSalesGroup ? "text-primary" : "text-ink hover:bg-primary/10"
              }`}
              aria-expanded={salesOpen}>
              <BarChart3 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1 text-left">Sales</span>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${salesOpen ? "" : "-rotate-90"}`}
                aria-hidden="true" />
            </button>

            {salesOpen && (
              <div className="ml-4 flex flex-col gap-1 border-l border-line pl-3">
                {SALES_CHILDREN.map((c) => {
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

            {/* Overall — its own main category */}
            <button onClick={() => go("overall")}
              className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                active === "overall" ? "bg-primary text-primary-fg shadow-lift" : "text-ink hover:bg-primary/10"
              }`}>
              <NavIcon Icon={Layers} busy={navPending && navKey === "overall"} />
              Overall
            </button>

            {/* Beg Kuning + Creator — its own main category */}
            <button onClick={() => go("creator")}
              className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                active === "creator" ? "bg-primary text-primary-fg shadow-lift" : "text-ink hover:bg-primary/10"
              }`}>
              <NavIcon Icon={ShoppingBag} busy={navPending && navKey === "creator"} />
              Creator Quantity
            </button>

            {/* Data Quality — its own main category */}
            <button onClick={() => go("data-quality")}
              className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                active === "data-quality" ? "bg-primary text-primary-fg shadow-lift" : "text-ink hover:bg-primary/10"
              }`}>
              <NavIcon Icon={ListChecks} busy={navPending && navKey === "data-quality"} />
              Data Quality
            </button>

            {/* Spend — TTAM + GMV (Live/Product/Card) combined */}
            <button onClick={() => go("spend")}
              className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                active === "spend" ? "bg-primary text-primary-fg shadow-lift" : "text-ink hover:bg-primary/10"
              }`}>
              <NavIcon Icon={Wallet} busy={navPending && navKey === "spend"} />
              TTAM
            </button>

            {/* Reporting Sheet — per-time-slot daily live sheet */}
            <button onClick={() => go("reporting-sheet")}
              className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                active === "reporting-sheet" ? "bg-primary text-primary-fg shadow-lift" : "text-ink hover:bg-primary/10"
              }`}>
              <NavIcon Icon={FileSpreadsheet} busy={navPending && navKey === "reporting-sheet"} />
              Reporting Sheet
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
                <p className="truncate text-xs font-mono text-muted-fg">{user.staff_id}</p>
              </div>
              <Settings className="h-3.5 w-3.5 shrink-0 text-muted-fg" aria-hidden="true" />
            </Link>
            {/* Admin runs the marketer console to cover an absent marketer;
                give them a one-click way back to their own dashboard. Shown
                whether they came here directly or via "manage as". */}
            {(user.role === "admin" || user.impersonatorRole === "admin") && (
              <Link href="/admin"
                className="mb-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary transition-colors duration-200 hover:bg-primary/10">
                <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden="true" />Admin Dashboard
              </Link>
            )}
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
          {/* Panduan halaman semasa, di tempat soalan itu timbul. */}
          <SopButton role="marketer" tab={active} />
        </div>

        <EditContext.Provider value={canEdit}>
        <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
          {user.impersonatorId != null && (
            <div className="card flex flex-wrap items-center gap-3 border-indigo-200 bg-indigo-50/70">
              <span className="flex items-center gap-2 text-sm text-indigo-800">
                <Pencil className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span><b>Mod Urus</b> — anda menguruskan <b>{user.name}</b> sebagai {user.impersonatorRole === "admin" ? "admin" : "leader"}. Apa yang anda tambah disimpan bawah marketer ini.</span>
              </span>
              <button onClick={exitManage}
                className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-700">
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Keluar Mod Urus
              </button>
            </div>
          )}
          {overseer !== "" && (
            <div className={`card flex flex-wrap items-center gap-3 ${canEdit ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/60"}`}>
              <span className={`flex items-center gap-2 text-sm ${canEdit ? "text-emerald-800" : "text-amber-800"}`}>
                {canEdit
                  ? <><Pencil className="h-4 w-4 shrink-0" aria-hidden="true" /><b>Workspace saya</b> — boleh edit.</>
                  : <><Eye className="h-4 w-4 shrink-0" aria-hidden="true" /><b>{user.role === "admin" ? "Admin" : overseer === "director" ? "Director" : "Monitor"}</b> — read-only.</>}
              </span>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <label className={`shrink-0 text-[11px] font-bold uppercase tracking-wide ${canEdit ? "text-emerald-800" : "text-amber-800"}`} htmlFor="ldr-mkt">Papar</label>
                <div className="relative min-w-0 flex-1 sm:flex-none">
                  <select id="ldr-mkt" disabled={navPending}
                    className="input w-full max-w-full cursor-pointer !py-1.5 pr-8 text-sm transition disabled:cursor-wait disabled:opacity-60 sm:!w-72"
                    value={viewValue}
                    onChange={(e) => goMarketer(e.target.value)}>
                    {overseer === "leader" ? (
                      <>
                        <option value="">Saya (workspace saya)</option>
                        {marketers.length > 0 && <option value="all">Semua Team (jumlah)</option>}
                        {marketers.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}{m.staff_id ? ` (${m.staff_id})` : ""}</option>
                        ))}
                      </>
                    ) : (
                      <>
                        <option value="all">Semua Syarikat (jumlah)</option>
                        {leaders.length > 0 && (
                          <optgroup label="Team Leader">
                            {leaders.map((l) => (
                              <option key={`t${l.id}`} value={`team-${l.id}`}>Team {l.staff_id || l.name}</option>
                            ))}
                          </optgroup>
                        )}
                        {marketers.length > 0 && (
                          <optgroup label="Marketer">
                            {marketers.map((m) => (
                              <option key={m.id} value={m.id}>{m.name}{m.staff_id ? ` (${m.staff_id})` : ""}</option>
                            ))}
                          </optgroup>
                        )}
                      </>
                    )}
                  </select>
                  {navPending && (
                    <Loader2 className={`pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin ${canEdit ? "text-emerald-600" : "text-amber-600"}`} aria-hidden="true" />
                  )}
                </div>
              </div>
              <span className={`flex items-center gap-1.5 text-xs transition-opacity ${canEdit ? "text-emerald-800/80" : "text-amber-800/80"}`}>
                {navPending ? "Memuatkan…"
                  : overseer === "director"
                    ? (viewValue === "all" ? "Semua syarikat digabungkan."
                      : viewValue.startsWith("team-") ? "Team leader (leader + marketernya) digabungkan."
                      : "Menunjukkan seorang.")
                    : viewValue === "" ? "Data marketer anda sendiri."
                    : viewValue === "all" ? "Semua team digabungkan."
                    : "Menunjukkan satu marketer team."}
              </span>
              {(overseer === "leader" || user.role === "admin") && marketers.some((m) => String(m.id) === viewValue) && (
                <button onClick={manageCurrent}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg shadow-lift transition hover:opacity-90"
                  title="Urus marketer ini — tambah/edit bagi pihak mereka">
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Urus marketer ini
                </button>
              )}
            </div>
          )}
          {active === "dashboard" && (
            <DashboardTab affiliates={affiliates} inRange={inRange}
              pending={pending} success={success}
              overall={overall} from={from} to={to} />
          )}
          {active === "affiliates" && (
            <AffiliatesTab affiliates={affiliates} lives={lives} pending={pendingAffiliates} />
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
            postsFor ? (
              <AffiliatePosts affiliateId={postsFor.a.id} affiliateName={postsFor.a.name}
                status={postsFor.status} onBack={() => setPostsFor(null)} />
            ) : (
              <PostingTab affiliates={affiliates} posts={posts}
                onOpen={(a, status) => setPostsFor({ a, status })} />
            )
          )}
          {active === "reporting" && (
            <ReportingTab affiliates={affiliates} lives={inRange} />
          )}
          {active === "unknown" && <UnknownTab rows={unknowns} />}
          {active === "sales-live" && <SalesLiveTab rows={salesLive} />}
          {active === "sales-product" && <SalesProductTab rows={salesProduct} cards={salesCard} />}
          {active === "sales-live-campaign" && <SalesCampaignTab rows={salesLiveCampaign} kind="live" />}
          {active === "sales-product-campaign" && <SalesCampaignTab rows={salesProductCampaign} kind="product" />}
          {active === "sales-card" && <SalesCardTab rows={salesCard} />}
          {/* Brand: the director (HQNL) gets the full admin catalogue tab
              (create / edit / delete / assign) — same as admin. Marketer &
              leader stay view-only; admin creates and assigns for them. */}
          {active === "brand" && (
            user.role === "director"
              ? <AdminBrandsTab />
              : <EditContext.Provider value={false}><BrandsTab /></EditContext.Provider>
          )}
          {active === "product" && (
            <EditContext.Provider value={false}><ProductsTab /></EditContext.Provider>
          )}
          {active === "overall" && <OverallTab overall={overall} salesLive={salesLive} salesProduct={salesProductAdj} salesCard={salesCard} spendTtm={spendTtm} />}
          {active === "creator" && <CreatorTab reports={creatorReports} />}
          {active === "live-users" && <ListLiveUserTab liveUsers={liveUsers} />}
          {active === "live-pending" && <LiveScheduleTab sessions={liveSessions} liveUsers={liveUsers} kind="pending" />}
          {active === "live-success" && <LiveScheduleTab sessions={liveSessions} liveUsers={liveUsers} kind="success" />}
          {active === "live-reporting" && <LiveReportingTab sessions={liveSessions} liveUsers={liveUsers} />}
          {active === "data-quality" && <DataQualityTab rows={dataQuality} />}
          {active === "spend" && <SpendTab spendTtm={spendTtm} salesLive={salesLive} salesProduct={salesProductAdj} salesCard={salesCard} />}
          {active === "reporting-sheet" && <ReportingSheetTab rows={reportingSheet} userName={user.name} />}
          {active === "pillar-create" && <PillarCreate />}
          {active === "pillar-report" && <PillarReport />}
          {active === "team" && user.role === "leader" && (
            <LeaderTeamTab team={marketers} onView={(id) => goMarketer(String(id))} />
          )}
        </div>
        </EditContext.Provider>
      </main>
    </div>
    </MarketerScopeContext.Provider>
  );
}

/* ── List Marketer (leader) ────────────────────────────── */

/**
 * A leader's team roster. Shows the marketers assigned to them, and lets the
 * leader claim ("COP") another marketer by staff ID. The server refuses a
 * marketer already held by a different leader, so two leaders can't share one.
 */
function LeaderTeamTab({ team, onView }: {
  team: { id: number; name: string; staff_id: string | null }[];
  onView: (id: number) => void;
}) {
  const { refresh } = useNavigate();
  const [staffId, setStaffId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function claim(e: React.FormEvent) {
    e.preventDefault();
    const id = staffId.trim().toUpperCase();
    if (!id) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/leader/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_id: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: data.error || "Gagal COP marketer." });
      } else {
        setMsg({ ok: true, text: `${data.name || id} kini dalam team anda.` });
        setStaffId("");
        refresh();
      }
    } catch {
      setMsg({ ok: false, text: "Ralat rangkaian." });
    } finally {
      setBusy(false);
    }
  }

  // Enter "manage as" mode: the whole dashboard becomes this marketer's, fully
  // editable. A hard reload picks up the new (impersonated) session cleanly.
  async function manage(id: number, name: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/leader/act-as", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketer_id: id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMsg({ ok: false, text: data.error || "Gagal urus." });
        setBusy(false);
        return;
      }
      window.location.href = "/marketer";
    } catch {
      setMsg({ ok: false, text: "Ralat rangkaian." });
      setBusy(false);
    }
  }

  async function release(id: number, name: string) {
    if (!confirm(`Keluarkan ${name} dari team anda?`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/leader/claim", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketer_id: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setMsg({ ok: false, text: data.error || "Gagal keluarkan." });
      else { setMsg({ ok: true, text: `${name} dikeluarkan dari team.` }); refresh(); }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* COP box */}
      <div className="card space-y-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
            <Plus className="h-5 w-5 text-primary" aria-hidden="true" /> COP Marketer
          </h2>
          <p className="mt-1 text-sm text-muted-fg">
            Masukkan ID Staff marketer (cth. <span className="font-mono">MNL-007</span>) untuk letak dia bawah jagaan anda.
          </p>
        </div>
        <form onSubmit={claim} className="flex flex-wrap items-center gap-2">
          <input className="input font-mono w-full sm:w-56" placeholder="MNL-001"
            value={staffId} onChange={(e) => setStaffId(e.target.value)}
            autoCapitalize="characters" spellCheck={false} />
          <button className="btn" disabled={busy || !staffId.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
            COP
          </button>
        </form>
        {msg && (
          <p className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm ${msg.ok ? "bg-emerald-500/10 text-emerald-700" : "bg-danger/10 text-danger"}`}>
            {msg.ok ? <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
            {msg.text}
          </p>
        )}
      </div>

      {/* Roster */}
      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Marketer bawah jagaan</h2>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-semibold text-primary">{team.length}</span>
        </div>
        {team.length === 0 ? (
          <p className="rounded-xl bg-surface-2 px-4 py-8 text-center text-sm text-muted-fg">
            Belum ada marketer. COP satu di atas untuk mula memantau.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted-fg">
                  <th className="py-2 pr-3 font-semibold">Nama</th>
                  <th className="py-2 pr-3 font-semibold">ID Staff</th>
                  <th className="py-2 pr-3 text-right font-semibold">Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {team.map((m) => (
                  <tr key={m.id} className="border-b border-line/60 last:border-0">
                    <td className="py-2.5 pr-3 font-medium text-ink">{m.name}</td>
                    <td className="py-2.5 pr-3 font-mono text-muted-fg">{m.staff_id || "—"}</td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => manage(m.id, m.name)} disabled={busy}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-fg shadow-lift transition hover:opacity-90 disabled:opacity-50"
                          title="Urus marketer ini — tambah/edit data bagi pihak mereka">
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Urus
                        </button>
                        <button onClick={() => onView(m.id)}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20">
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Monitor
                        </button>
                        <button onClick={() => release(m.id, m.name)} disabled={busy}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-danger/10 px-2.5 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger/20 disabled:opacity-50">
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Keluar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Dashboard ─────────────────────────────────────────── */

function DashboardTab({ affiliates, inRange, pending, success, overall, from, to }: {
  affiliates: Affiliate[]; inRange: Live[]; pending: Live[]; success: Live[];
  overall: Overall[]; from: string; to: string;
}) {
  const rm = (n: number, has: boolean) => (has ? fmtRM(n) : "—");

  // "" = All Brands, the default. Every summary respects it — a scheduled
  // live now carries the brand it was booked against.
  const [brand, setBrand] = useState("");
  const inBrand = (id: number | null) => !brand || String(id ?? "") === brand;

  const within = (d: string) => (!from || d >= from) && (!to || d <= to);
  const ovr = overall.filter((o) => within(o.report_date) && inBrand(o.brand_id));

  const livesB = inRange.filter((l) => inBrand(l.brand_id));
  const pendingB = pending.filter((l) => inBrand(l.brand_id));
  const successB = success.filter((l) => inBrand(l.brand_id));
  const t = aggregate(successB);

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
          <Kpi Icon={TrendingUp} label="Affiliate Sales" value={fmtRM(t.gmv)} fill="yellow" />
          <Kpi Icon={Users} label="Affiliate Viewers" value={t.viewers} />
          <Kpi Icon={ShoppingBag} label="Affiliate Items" value={t.items} />
          <Kpi Icon={Timer} label="Affiliate Duration" value={t.duration} />
          <Kpi Icon={Wallet} label="Affiliate Budget" value={rm(t.budget, t.hasBudget)} />
          <Kpi Icon={Wallet} label="Affiliate Spend" value={rm(t.spend, t.hasSpend)} fill="red" />
          <Kpi Icon={TrendingUp} label="Affiliate Gross Revenue" value={rm(t.gross, t.hasGross)} fill="emerald" />
          <Kpi Icon={(t.roi ?? 0) >= 1 ? TrendingUp : TrendingDown} label="Affiliate ROI" value={t.roi != null ? t.roi : "—"} />
        </div>
      </section>
    </>
  );
}

/* ── List Of Affiliate ─────────────────────────────────── */

function AffiliatesTab({ affiliates, lives, pending = [] }: {
  affiliates: Affiliate[]; lives: Live[];
  pending?: { id: number; name: string; staff_id: string | null; phone: string | null }[];
}) {
  const canEdit = useCanEdit();
  const { refresh } = useNavigate();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedAffiliate | null>(null);
  const [grabbing, setGrabbing] = useState<number | null>(null);
  const [grabMsg, setGrabMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Which (link, brand) rate is being edited, and which link's summary is open.
  const [rateFor, setRateFor] = useState<{ pid: number; brand: LinkBrand } | null>(null);
  const [ratesFor, setRatesFor] = useState<{ pid: number; brands: LinkBrand[] } | null>(null);

  async function grab(id: number, name: string) {
    setGrabbing(id);
    setGrabMsg(null);
    try {
      const res = await fetch("/api/marketer/affiliates/grab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ affiliate_id: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setGrabMsg({ ok: false, text: data.error || "Gagal grab." });
      else { setGrabMsg({ ok: true, text: `${name} kini affiliate anda.` }); refresh(); }
    } catch {
      setGrabMsg({ ok: false, text: "Ralat rangkaian." });
    } finally {
      setGrabbing(null);
    }
  }

  const openAdd = () => { setEditing(null); setOpen(true); };
  const openEdit = (a: Affiliate) => {
    setEditing({ id: a.id, name: a.name, staff_id: a.staff_id, phone: a.phone, address: a.address });
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
        {canEdit && (
          <button className="btn !py-2" onClick={openAdd}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Affiliate
          </button>
        )}
      </div>

      {/* Pending pool — unassigned affiliates any marketer can grab. */}
      {canEdit && pending.length > 0 && (
        <div className="card space-y-3 border-amber-200 bg-amber-50/50">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-amber-800">
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Affiliate Pending — boleh grab ({pending.length})
            </h3>
            <p className="mt-0.5 text-xs text-amber-800/80">
              Affiliate yang belum ada marketer. Grab untuk jadikan affiliate anda (siapa cepat dia dapat).
            </p>
          </div>
          {grabMsg && (
            <p className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm ${grabMsg.ok ? "bg-emerald-500/10 text-emerald-700" : "bg-danger/10 text-danger"}`}>
              {grabMsg.ok ? <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
              {grabMsg.text}
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {pending.map((a) => (
              <div key={a.id} className="flex items-center gap-2 rounded-xl border border-amber-200 bg-white/70 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{a.name}</p>
                  <p className="truncate text-xs text-muted-fg">
                    <span className="font-mono">{a.staff_id || "—"}</span>{a.phone ? ` · ${a.phone}` : ""}
                  </p>
                </div>
                <button onClick={() => grab(a.id, a.name)} disabled={grabbing === a.id}
                  className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg shadow-lift transition hover:opacity-90 disabled:opacity-50">
                  {grabbing === a.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    : <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />}
                  Grab
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
            {canEdit && <ActivateAffiliate id={a.id} activated={a.activated} name={a.name} />}
            {canEdit && (
              <AffiliateActions
                affiliate={{ id: a.id, name: a.name, staff_id: a.staff_id, phone: a.phone, address: a.address }}
                onEdit={() => openEdit(a)} />
            )}
          </div>

          <div className="space-y-1 text-xs text-muted-fg">
            {a.staff_id && (
              <p className="flex items-center gap-1.5 font-mono font-semibold text-ink">
                <IdCard className="h-3 w-3 shrink-0" aria-hidden="true" />{a.staff_id}
              </p>
            )}
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
                        {/* The handle names the account; the brands it runs
                            are chips beside it, since a link can carry
                            several and only the first would otherwise show. */}
                        <span className="flex flex-wrap items-center gap-1 text-xs font-semibold text-ink">
                          {/* Each brand chip opens that brand's rate — one
                              account can run four brands on four different
                              deals, so the rate hangs off the pair. */}
                          {(l.brands ?? []).map((b) => (
                            <button key={b.id} type="button"
                              onClick={() => setRateFor({ pid: l.id, brand: b })}
                              title={`Set komisyen ${b.name}`}
                              className="chip cursor-pointer bg-primary/10 text-primary transition-colors duration-200 hover:bg-primary/20">
                              {b.name}
                              {rateLabel(b) && (
                                <span className="ml-1 font-bold">· {rateLabel(b)}</span>
                              )}
                            </button>
                          ))}
                        </span>
                        <a href={l.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 truncate text-[11px] text-accent hover:underline">
                          <span className="truncate">{l.url}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                        </a>
                      </span>
                      {canEdit && (
                        <span className="flex shrink-0 items-center gap-1">
                          <CommissionButton
                            onClick={() => setRatesFor({ pid: l.id, brands: l.brands ?? [] })} />
                          <DeleteProfileLink id={l.id} name={l.url} />
                        </span>
                      )}
                    </div>
                    {/* The brands decide which WhatsApp groups the affiliate
                        sees against this account, and what each one pays. */}
                    <ProfileBrandPicker profileId={l.id} initial={l.brand_ids ?? []}
                      onLink={l.brands ?? []} />
                  </li>
                ))}
              </ul>
            )}
            {/* The marketer can add links too — affiliates often paste the
                wrong URL, and this is who ends up fixing it. */}
            {canEdit && <AddProfileLink userId={a.id} />}
          </div>
        </div>
      ))}
      </div>
      )}

      <AffiliateModal open={open} affiliate={editing} onClose={() => setOpen(false)} />

      <CommissionSummary open={!!ratesFor} brands={ratesFor?.brands ?? []}
        onClose={() => setRatesFor(null)} />
      <BrandCommissionModal open={!!rateFor} profileId={rateFor?.pid ?? 0}
        brand={rateFor?.brand ?? null} onClose={() => setRateFor(null)} />
    </div>
  );
}

/* ── Schedule (pending / success) ──────────────────────── */

function ScheduleTab({ title, rows, kind, showUpload, affiliates, defaultMode = "today" }: {
  title: string; rows: Live[]; kind: "pending" | "success"; showUpload?: boolean;
  affiliates?: Affiliate[];
  defaultMode?: "today" | "month" | "all";
}) {
  const canEdit = useCanEdit();
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

      {showUpload && canEdit && (
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [affId, setAffId] = useState("");

  useEffect(() => {
    if (!open) return;
    setAffId(""); setProfileId(""); setBrand(""); setDate(""); setStart("");
    setEnd(""); setBudget(""); setError("");
  }, [open]);

  // Pick the person first, then which of their accounts. One combined list
  // got unusable as soon as an affiliate ran several accounts. Inhouse is a
  // fixed choice rather than a listed profile, because the bucket account is
  // created on first use — it may not exist yet.
  const people = affiliates.filter((a) => a.name !== "Inhouse");
  const chosen = people.find((a) => String(a.id) === affId);
  const links = chosen?.links ?? [];
  const pickedLink = links.find((l) => String(l.id) === profileId);
  const pickedLinkBrands = pickedLink?.brands ?? [];

  async function save() {
    if (!brand) {
      return setError("Pilih brand untuk link ini dahulu.");
    }
    setBusy(true); setError("");
    const res = await fetch("/api/marketer/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile_id: affId === "inhouse" ? "inhouse" : profileId,
        brand_id: brand, live_date: date,
        start_time: start, end_time: end || null,
        ads_budget: budget,
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
          <label className="label" htmlFor="as-aff">1. Affiliate</label>
          <select id="as-aff" className="input cursor-pointer" value={affId}
            onChange={(e) => { setAffId(e.target.value); setProfileId(""); }} required>
            <option value="">— Pilih affiliate —</option>
            {people.map((a) => (
              <option key={a.id} value={a.id}>{a.staff_id ? `${a.staff_id} — ` : ""}{a.name}</option>
            ))}
            <option value="inhouse">Inhouse (bukan affiliate)</option>
          </select>
        </div>

        {affId !== "inhouse" && (
          <div className="sm:col-span-2">
            <label className="label" htmlFor="as-profile">2. Link profile</label>
            <select id="as-profile" className="input cursor-pointer" value={profileId}
              onChange={(e) => { setProfileId(e.target.value); setBrand(""); }}
              required disabled={!affId}>
              <option value="">
                {!affId ? "— Pilih affiliate dahulu —" : "— Pilih profile —"}
              </option>
              {links.map((p) => (
                <option key={p.id} value={p.id}>{p.url}</option>
              ))}
            </select>
            {affId && links.length === 0 && (
              <p className="mt-1 text-xs text-danger">
                Affiliate ini belum ada link TikTok — tambah di List Affiliate dahulu.
              </p>
            )}
          </div>
        )}

        {/* Only the brands registered on the chosen link. A live is paid at
            the rate set for the (link, brand) pair, so a brand the link does
            not run would book a live nothing can pay. */}
        <div className="sm:col-span-2">
          <label className="label" htmlFor="as-brand">3. Brand</label>
          {affId === "inhouse" ? (
            <BrandSelect id="as-brand" value={brand} onChange={setBrand} />
          ) : (
            <>
              <select id="as-brand" className="input cursor-pointer" value={brand}
                onChange={(e) => setBrand(e.target.value)} required
                disabled={!profileId || pickedLinkBrands.length === 0}>
                <option value="">
                  {!profileId ? "— Pilih link profile dahulu —" : "— Pilih brand —"}
                </option>
                {pickedLinkBrands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              {profileId && pickedLinkBrands.length === 0 && (
                <p className="mt-1 text-xs text-danger">
                  Link ini belum ada brand. Daftar brand pada link itu di List Affiliate dahulu.
                </p>
              )}
            </>
          )}
        </div>
        <div>
          <label className="label" htmlFor="as-date">Date</label>
          <input id="as-date" type="date" className="input cursor-pointer"
            value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="as-start">Start</label>
          <input id="as-start" type="time" className="input cursor-pointer"
            value={start} onChange={(e) => setStart(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="as-end">End</label>
          <input id="as-end" type="time" className="input cursor-pointer"
            value={end} onChange={(e) => setEnd(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="as-budget">Budget Ads (RM)</label>
          <input id="as-budget" type="number" min="0" step="any" className="input"
            value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0.00" />
          <p className="mt-1 text-xs text-muted-fg">
            Bajet yang dirancang. Belanja sebenar diisi kemudian di Enter results.
          </p>
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
  const rm = (n: number, has: boolean) => (has ? fmtRM(n) : "—");
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Kpi Icon={CheckCircle2} label="Total Live" value={rows.length} />
      <Kpi Icon={Users} label="Total Affiliate" value={affCount} />
      <Kpi Icon={TrendingUp} label="Total Sales" value={fmtRM(t.gmv)} fill="yellow" />
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
    const go = await confirmDialog({
      title: `Padam jadual ${l.affiliate} — ${fmtDate(l.live_date)}?`,
      danger: true, confirmText: "Padam", cancelText: "Batal",
    });
    if (!go) return;
    let r = await fetch(`/api/marketer/bookings/${l.booking_id}`, { method: "DELETE" });
    let d = await r.json();
    if (r.status === 409 && d.needsConfirm) {
      const anyway = await confirmDialog({
        title: "Teruskan?", text: d.error,
        danger: true, confirmText: "Padam", cancelText: "Batal",
      });
      if (!anyway) return;
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
    const sp = parseNum(spend), gr = parseNum(gross);
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
                {/* The account the live runs on. Its brand is shown as the
                    live's own chip, which may differ from the link's first. */}
                {handleFromUrl(l.profile_url)}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
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
              htmlFor={`bud-${l.booking_id}`}>
              Budget Ads (RM) <span className="font-normal normal-case">— bajet dirancang</span>
            </label>
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
            {/* Only the brands registered on the link that runs this live —
                re-tagging it to a brand the link does not carry would leave
                the live with no rate to pay it. */}
            <select id={`br-${l.booking_id}`} className="input cursor-pointer !py-1.5 text-sm sm:w-48"
              value={eBrand} onChange={(e) => saveBrand(e.target.value)}>
              <option value="">— Pilih brand —</option>
              {(l.link_brands ?? []).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {brandMsg && <span className="text-xs font-medium text-emerald-600">{brandMsg}</span>}
          </div>
        </div>
      </div>

      {/* Manual ad-results entry — Spend / Gross Revenue / ROI. Saving
          moves the live to Success. */}
      {!done && resultsOpen && (
        <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-line bg-white/60 p-3 sm:grid-cols-5">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg">
              Spend (RM) <span className="font-normal normal-case">— belanja sebenar</span>
            </label>
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
                  <Wallet className="h-3 w-3" aria-hidden="true" />Budget {fmtRM(l.ads_budget)}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <Stat Icon={TrendingUp} label="Total Sales" value={fmtRMor(l.gmv)} />
              <Stat Icon={Users} label="Viewers" value={l.viewers != null ? fmtNum(l.viewers) : "—"} />
              <Stat Icon={ShoppingBag} label="Items Sold" value={l.items_sold != null ? fmtNum(l.items_sold) : "—"} />
              <Stat Icon={Timer} label="Duration" value={l.duration_live ?? "—"} />
            </div>
            {(l.ads_budget != null || l.ad_spend != null || l.gross_revenue != null || l.roi != null) && (
              <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
                <Stat Icon={Wallet} label="Budget" value={fmtRMor(l.ads_budget)} />
                <Stat Icon={Wallet} label="Spend" value={fmtRMor(l.ad_spend)} />
                <Stat Icon={TrendingUp} label="Gross Revenue" value={fmtRMor(l.gross_revenue)} />
                <Stat Icon={(deriveRoi(l.ad_spend, l.gross_revenue, l.roi) ?? 0) >= 1 ? TrendingUp : TrendingDown}
                  label="ROI" value={deriveRoi(l.ad_spend, l.gross_revenue, l.roi) ?? "—"} />
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

  if (!useCanEdit()) return <ReadOnlyHint />; // read-only: hint in team mode, else hidden
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

  if (!useCanEdit()) return <ReadOnlyHint />; // read-only: hint in team mode, else hidden
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

function PostingTab({
  affiliates, posts, onOpen,
}: {
  affiliates: Affiliate[]; posts: Post[];
  onOpen: (a: Affiliate, status: "pending" | "done") => void;
}) {
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
                <th className="px-4 py-3 font-semibold">ID Staff</th>
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
                    <td className="px-4 py-3 font-mono text-muted-fg">{a.staff_id ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-fg">{a.phone || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => onOpen(a, "pending")}
                        className="chip cursor-pointer bg-amber-100 text-amber-700 transition-transform duration-200 hover:scale-105"
                        title={`Lihat pending post ${a.name}`}>
                        {pend}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => onOpen(a, "done")}
                        className="chip cursor-pointer bg-emerald-100 text-emerald-700 transition-transform duration-200 hover:scale-105"
                        title={`Lihat done post ${a.name}`}>
                        {done}
                      </button>
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
  const completed = lives.filter((l) => l.status === "completed");
  const duration = sumDurations(completed.map((l) => l.duration_live));
  // "6h 30m" sorts alphabetically as nonsense, so keep the raw seconds too.
  const durationSecs = completed.reduce(
    (sum, l) => sum + durationToSeconds(l.duration_live), 0
  );
  const roi = spend > 0 ? Math.round((gross / spend) * 100) / 100 : null;
  const hasBudget = lives.some((l) => l.ads_budget != null);
  const hasSpend = lives.some((l) => l.ad_spend != null);
  const hasGross = lives.some((l) => l.gross_revenue != null);
  return {
    gmv, viewers, items, budget, spend, gross, duration, durationSecs, roi,
    hasBudget, hasSpend, hasGross,
  };
}

function ReportingTab({ affiliates, lives }: { affiliates: Affiliate[]; lives: Live[] }) {
  // "" = All Brands, the default.
  const [brand, setBrand] = useState("");
  // Sub-profiles start collapsed: the main rows are the summary, and the
  // per-link breakdown is detail you opt into.
  const [showSubs, setShowSubs] = useState(false);
  const shown = lives.filter((l) => !brand || String(l.brand_id ?? "") === brand);

  const t = aggregate(shown);
  const rm = (n: number, has: boolean) => (has ? fmtRM(n) : "—");

  // Narrowing to a brand should also drop affiliates who ran nothing for it,
  // otherwise the table fills with all-zero rows.
  const active = brand
    ? affiliates.filter((a) => shown.some((l) => l.affiliate_id === a.id))
    : affiliates;

  /**
   * Per-link-per-brand breakdown, with what each pair earned.
   *
   * One account can run several brands on different deals, so the rate hangs
   * off the (link, brand) pair — and a live already carries its brand, which
   * is what decides the group it is paid under. Lives with no brand tag fall
   * into their own row: they earn nothing, but hiding them would make the
   * sub-rows stop adding up to the affiliate total.
   */
  function subsFor(a: Affiliate) {
    const mine = shown.filter((l) => l.affiliate_id === a.id);
    const groups = new Map<string, Live[]>();
    for (const l of mine) {
      const key = `${l.profile_id}:${l.brand_id ?? 0}`;
      const list = groups.get(key) || [];
      list.push(l);
      groups.set(key, list);
    }

    return [...groups.entries()].map(([key, ls]) => {
      const [pidStr, bidStr] = key.split(":");
      const pid = Number(pidStr);
      const bid = Number(bidStr);
      const agg = aggregate(ls);
      const link = a.links.find((x) => x.id === pid);
      const brand = (link?.brands ?? []).find((b) => b.id === bid) ?? null;

      // Hourly pay follows the duration actually streamed, and only for
      // completed lives — a pending slot has not been verified as happening.
      const hours = ls
        .filter((l) => l.status === "completed")
        .reduce((s, l) => s + durationHours(l.duration_live), 0);

      const commission = brand
        ? commissionFor(
            {
              commission_type: brand.commission_type ?? null,
              commission_value:
                brand.commission_value == null ? null : Number(brand.commission_value),
            },
            agg.gmv,
            hours
          )
        : 0;

      return {
        key, pid, agg, hours, commission, brand,
        rate: brand,
        label: `${handleFromUrl(link?.url)}${brand ? ` · ${brand.name}` : " · tiada brand"}`,
      };
    });
  }

  // One flat row per affiliate, so the table can be sorted by any column.
  // Sorting the derived figures means the sort key has to exist alongside the
  // formatted value — hence durationSecs beside duration.
  const unsorted = active.map((a) => {
    const r = aggregate(shown.filter((l) => l.affiliate_id === a.id));
    const subs = subsFor(a);
    const income = subs.reduce((x, sub) => x + sub.commission, 0);
    return {
      a, r, subs, income,
      name: a.name,
      gmv: r.gmv, viewers: r.viewers, items: r.items,
      durationSecs: r.durationSecs,
      budget: r.hasBudget ? r.budget : null,
      spend: r.hasSpend ? r.spend : null,
      gross: r.hasGross ? r.gross : null,
      roi: r.roi,
    };
  });
  const { sorted: rows, sort, toggleSort } = useTableSort(unsorted);

  // What every affiliate is owed in this range, together.
  const totalCommission = rows.reduce((s, x) => s + x.income, 0);

  return (
    <>
      <DateRangeFilter count={shown.length} defaultMode="month" />

      <BrandFilterCard id="rep-brand" value={brand} onChange={setBrand} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi Icon={Users} label="Total Affiliate" value={active.length} />
        <Kpi Icon={TrendingUp} label="Affiliate Sales" value={fmtRM(t.gmv)} fill="yellow" />
        <Kpi Icon={Users} label="Affiliate Viewers" value={fmtNum(t.viewers)} />
        <Kpi Icon={ShoppingBag} label="Affiliate Items" value={fmtNum(t.items)} />
        <Kpi Icon={Timer} label="Affiliate Duration" value={t.duration} />
        <Kpi Icon={Wallet} label="Affiliate Budget" value={rm(t.budget, t.hasBudget)} />
        <Kpi Icon={Wallet} label="Affiliate Spend" value={rm(t.spend, t.hasSpend)} fill="red" />
        <Kpi Icon={TrendingUp} label="Affiliate Gross Revenue" value={rm(t.gross, t.hasGross)} fill="emerald" />
        <Kpi Icon={(t.roi ?? 0) >= 1 ? TrendingUp : TrendingDown} label="Affiliate ROI"
          value={t.roi != null ? t.roi : "—"} />
        <Kpi Icon={Wallet} label="Total Commission"
          value={fmtRM(totalCommission)} fill="emerald" />
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
              <SortTh k="name" sort={sort} on={toggleSort}>Affiliate</SortTh>
              <SortTh k="gmv" sort={sort} on={toggleSort} right>Affiliate Sales</SortTh>
              <SortTh k="viewers" sort={sort} on={toggleSort} right>Affiliate Viewers</SortTh>
              <SortTh k="items" sort={sort} on={toggleSort} right>Affiliate Items</SortTh>
              <SortTh k="durationSecs" sort={sort} on={toggleSort}>Affiliate Duration</SortTh>
              <SortTh k="budget" sort={sort} on={toggleSort} right>Affiliate Budget</SortTh>
              <SortTh k="spend" sort={sort} on={toggleSort} right>Affiliate Spend</SortTh>
              <SortTh k="gross" sort={sort} on={toggleSort} right>Affiliate Gross Rev.</SortTh>
              <SortTh k="roi" sort={sort} on={toggleSort} right>Affiliate ROI</SortTh>
              <th className="px-4 py-3 font-semibold">Jenis Komisyen</th>
              <th className="px-4 py-3 text-right font-semibold">Rate</th>
              <SortTh k="income" sort={sort} on={toggleSort} right>Komisyen</SortTh>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ a, r, subs, income: totalIncome }) => {
              return (
                <Fragment key={a.id}>
                  <tr className="border-t border-line bg-white/40">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink">{a.name}</div>
                      <div className="text-xs font-mono text-muted-fg">{a.staff_id ?? ""}</div>
                      {a.phone && <div className="text-xs text-muted-fg">{a.phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">{fmtRM(r.gmv)}</td>
                    <td className="px-4 py-3 text-right">{fmtNum(r.viewers)}</td>
                    <td className="px-4 py-3 text-right">{fmtNum(r.items)}</td>
                    <td className="px-4 py-3">{r.duration}</td>
                    <td className="px-4 py-3 text-right">{rm(r.budget, r.hasBudget)}</td>
                    <td className="px-4 py-3 text-right">{rm(r.spend, r.hasSpend)}</td>
                    <td className="px-4 py-3 text-right">{rm(r.gross, r.hasGross)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">{r.roi != null ? r.roi : "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-fg" colSpan={2}>Total Income</td>
                    <td className="px-4 py-3 text-right font-extrabold text-emerald-700">
                      {fmtRM(totalIncome)}
                    </td>
                  </tr>

                  {showSubs && subs.map((s) => (
                    <tr key={`${a.id}-${s.key}`} className="border-t border-line/40 text-[13px]">
                      <td className="py-2 pl-10 pr-4">
                        <span className="flex items-center gap-1.5 text-muted-fg">
                          <Link2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">{fmtRM(s.agg.gmv)}</td>
                      <td className="px-4 py-2 text-right">{fmtNum(s.agg.viewers)}</td>
                      <td className="px-4 py-2 text-right">{fmtNum(s.agg.items)}</td>
                      <td className="px-4 py-2">
                        {s.agg.duration}
                        {s.rate?.commission_type === "hour" && (
                          <span className="ml-1 text-[11px] text-muted-fg">
                            ({s.hours.toFixed(2)}j dibayar)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">{rm(s.agg.budget, s.agg.hasBudget)}</td>
                      <td className="px-4 py-2 text-right">{rm(s.agg.spend, s.agg.hasSpend)}</td>
                      <td className="px-4 py-2 text-right">{rm(s.agg.gross, s.agg.hasGross)}</td>
                      <td className="px-4 py-2 text-right">{s.agg.roi != null ? s.agg.roi : "—"}</td>
                      <td className="px-4 py-2">
                        {s.rate?.commission_type
                          ? <span className="chip bg-emerald-100 text-emerald-700">
                              {s.rate.commission_type === "percent" ? "Percent" : "Hour"}
                            </span>
                          : <span className="text-muted-fg/50">—</span>}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {s.rate?.commission_value != null
                          ? (s.rate.commission_type === "percent"
                              ? `${s.rate.commission_value}%`
                              : `${fmtRM(s.rate.commission_value)}/j`)
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-emerald-700">
                        {s.rate?.commission_type ? fmtRM(s.commission) : "—"}
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

/* ── Sales (Live · Product · Card) ─────────────────────── */

const money2 = (n: number | null | undefined) =>
  n != null ? fmtRM(n) : "—";
const intOr = (n: number | null | undefined) =>
  n != null ? fmtNum(n) : "—";

/**
 * ROI and Cost/Order for a row, derived when the import didn't carry them.
 *
 * The TikTok campaign export leaves per-campaign ROI and Cost-per-order blank,
 * so they arrive null and every campaign row showed "—". Both are pure
 * functions of columns we DO have (ROI = gross ÷ cost, Cost/Order = cost ÷
 * orders), so compute them here rather than depend on the sheet. A stored value
 * still wins, so daily totals keep the figure the import already worked out.
 */
const deriveRoi = (
  cost?: number | null, gross?: number | null, stored?: number | null
): number | null =>
  stored != null ? stored
    : cost != null && cost > 0 && gross != null
      ? Math.round((gross / cost) * 100) / 100
      : null;
const deriveCpo = (
  cost?: number | null, orders?: number | null, stored?: number | null
): number | null =>
  stored != null ? stored
    : orders != null && orders > 0 && cost != null
      ? Math.round((cost / orders) * 100) / 100
      : null;

/** "2026-07-24" (the chosen report date) → "24-07-2026". */
const fmtDMY = (v: string | null | undefined) => {
  if (!v) return "—";
  const m = String(v).match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : String(v);
};


/** Row selection for the Sales tables — select-all spans every filtered row. */
function useRowSelection() {
  const [sel, setSel] = useState<Set<number>>(new Set());
  const toggle = (id: number) =>
    setSel((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const setMany = (ids: number[], on: boolean) =>
    setSel((s) => {
      const n = new Set(s);
      ids.forEach((i) => (on ? n.add(i) : n.delete(i)));
      return n;
    });
  const clear = () => setSel(new Set());
  return { sel, toggle, setMany, clear };
}

/** Bulk-delete bar shown once rows are selected. */
function SalesBulkBar({
  count, busy, onDelete,
}: { count: number; busy: boolean; onDelete: () => void }) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2">
      <span className="text-sm font-semibold text-ink">{count} baris dipilih</span>
      <button
        onClick={onDelete}
        disabled={busy}
        className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-danger px-3 py-1.5 text-sm font-semibold text-white transition-opacity duration-200 hover:opacity-90 disabled:opacity-50">
        {busy
          ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          : <Trash2 className="h-4 w-4" aria-hidden="true" />}
        Padam terpilih
      </button>
    </div>
  );
}

/** Header/row checkbox — consistent styling across the Sales tables. */
function RowCheck({ checked, onChange, aria }: {
  checked: boolean; onChange: () => void; aria: string;
}) {
  return (
    <input type="checkbox" checked={checked} onChange={onChange} aria-label={aria}
      className="h-4 w-4 cursor-pointer rounded border-line accent-primary" />
  );
}

/**
 * Shown in place of an import/edit box when the view is read-only. In a plain
 * marketer's "All Team" aggregate it nudges them back to "Saya" (where their
 * own data is editable); while monitoring someone else there's no such toggle,
 * so it renders nothing.
 */
function ReadOnlyHint() {
  const { teamMode } = useMarketerScope();
  if (!teamMode) return null;
  return (
    <div className="card flex flex-wrap items-center gap-1.5 text-sm text-muted-fg">
      <AlertCircle className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      Paparan <b>All Team</b> baca sahaja. Tukar ke <b>Saya</b> (butang
      <b>Paparan</b> di atas) untuk import fail.
    </div>
  );
}

/** Shared upload box for the two Sales imports. */
function SalesImport({
  title, endpoint, columns, note, sampleHref, brandInputId, resultLabel,
}: {
  title: string; endpoint: string; columns: string[]; note: React.ReactNode;
  sampleHref: string; brandInputId: string;
  resultLabel: (d: any) => string;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [date, setDate] = useState("");
  const [brand, setBrand] = useState("");
  // Source currency of the sheet. IDR values are converted to MYR on the server
  // using `rate` before saving; MYR imports as-is.
  const [currency, setCurrency] = useState<"MYR" | "IDR">("MYR");
  const [rate, setRate] = useState(String(DEFAULT_IDR_RATE));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    if (!file) return setError("Choose an .xlsx file.");
    if (!brand) return setError("Pick a brand.");
    if (!date) return setError("Pick the report date.");
    if (currency === "IDR" && !(Number(rate) > 0))
      return setError("Masukkan kadar tukaran IDR→MYR yang sah.");
    setBusy(true); setError(""); setMsg("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("report_date", date);
    fd.append("brand_id", brand);
    fd.append("currency", currency);
    if (currency === "IDR") fd.append("rate", rate);
    const res = await fetch(endpoint, { method: "POST", body: fd });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || "Import failed");
    setMsg(resultLabel(data));
    setFile(null);
    router.refresh();
  }

  if (!useCanEdit()) return <ReadOnlyHint />; // read-only: hint in team mode, else hidden
  return (
    <div className="card space-y-3">
      <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
        <FileSpreadsheet className="h-4 w-4 text-primary" aria-hidden="true" />
        {title}
      </p>

      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-fg">
          Required columns
        </p>
        <div className="flex flex-wrap gap-1.5">
          {columns.map((c) => (
            <span key={c} className="rounded-md border border-line bg-white/70 px-2 py-1 font-mono text-[11px] text-ink">
              {c}
            </span>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-muted-fg">{note}</p>
        <a href={sampleHref} download
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline">
          <FileSpreadsheet className="h-3 w-3" aria-hidden="true" />
          Muat turun contoh .xlsx
        </a>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px]">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg"
            htmlFor={brandInputId}>Brand</label>
          <BrandSelect id={brandInputId} value={brand} onChange={setBrand}
            className="!py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg">Report date</label>
          <input type="date" className="input cursor-pointer !py-2 text-sm"
            value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg">Currency</label>
          <select className="input cursor-pointer !py-2 text-sm"
            value={currency} onChange={(e) => setCurrency(e.target.value as "MYR" | "IDR")}>
            <option value="MYR">MYR (Ringgit)</option>
            <option value="IDR">IDR (Rupiah)</option>
          </select>
        </div>
        {currency === "IDR" && (
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg">
              Kadar IDR→MYR
            </label>
            <input type="number" step="0.00001" min="0" inputMode="decimal"
              className="input !py-2 text-sm !w-32"
              value={rate} onChange={(e) => setRate(e.target.value)}
              placeholder={String(DEFAULT_IDR_RATE)} />
            <p className="mt-0.5 text-[10px] text-muted-fg">1 IDR = RM{Number(rate) > 0 ? rate : DEFAULT_IDR_RATE}</p>
          </div>
        )}
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

/** Edit one daily Live/Product total. Cost/Order and ROI auto-derive. */
function SalesDailyEditModal({ kind, row, onClose }: {
  kind: "live" | "product"; row: SalesLive | SalesProduct | null; onClose: () => void;
}) {
  const router = useRouter();
  const [f, setF] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!row) return;
    const s = (v: any) => (v == null ? "" : String(v));
    const r: any = row;
    setF({
      cost: s(r.cost), net_cost: s(r.net_cost), gross_revenue: s(r.gross_revenue),
      sku_orders: s(r.sku_orders), live_views: s(r.live_views), current_budget: s(r.current_budget),
    });
    setError("");
  }, [row]);

  const costN = parseNum(f.cost), grossN = parseNum(f.gross_revenue), ordersN = parseNum(f.sku_orders);
  const roi = costN > 0 && Number.isFinite(grossN) ? Math.round((grossN / costN) * 100) / 100 : null;
  const cpo = costN > 0 && ordersN > 0 ? Math.round((costN / ordersN) * 100) / 100 : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!row) return;
    setSaving(true); setError("");
    const res = await fetch(`/api/marketer/sales/${kind}/${row.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setError(data.error || "Save failed.");
    onClose(); router.refresh();
  }

  const fld = (key: string, label: string) => (
    <div>
      <label className="label">{label}</label>
      <input className="input" value={f[key] ?? ""} inputMode="decimal"
        onChange={(e) => setF((p) => ({ ...p, [key]: e.target.value }))} />
    </div>
  );

  return (
    <Modal open={!!row} onClose={onClose} title="Edit daily total">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {fld("cost", "Cost (RM)")}
          {fld("net_cost", "Net Cost (RM)")}
          {fld("sku_orders", "SKU Orders")}
          {fld("gross_revenue", "Gross Revenue (RM)")}
          {kind === "live" && fld("live_views", "LIVE Views")}
          {fld("current_budget", "Current Budget (RM)")}
          <div>
            <label className="label">Cost / Order <span className="font-normal text-muted-fg">(auto)</span></label>
            <input className="input bg-muted/40" value={cpo != null ? cpo : "—"} readOnly />
          </div>
          <div>
            <label className="label">ROI <span className="font-normal text-muted-fg">(auto)</span></label>
            <input className="input bg-muted/40 font-semibold" value={roi != null ? roi : "—"} readOnly />
          </div>
        </div>
        {error && (
          <p className="flex items-center gap-1.5 text-sm text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

function SalesLiveTab({ rows: all }: { rows: SalesLive[] }) {
  const canEdit = useCanEdit();
  const router = useRouter();
  const params = useSearchParams();
  const { from, to } = resolveRange(
    { from: params.get("from"), to: params.get("to"), all: params.get("all") }, "month"
  );
  const [brand, setBrand] = useState("");
  const [editing, setEditing] = useState<SalesLive | null>(null);
  const unsorted = all.filter((p) => {
    if (from && p.report_date < from) return false;
    if (to && p.report_date > to) return false;
    if (brand && String(p.brand_id ?? "") !== brand) return false;
    return true;
  });
  const { sorted: rows, sort, toggleSort } = useTableSort(unsorted);

  async function remove(r: SalesLive) {
    if (!(await confirmDialog({ title: "Padam rekod live ini?", danger: true }))) return;
    await fetch(`/api/marketer/sales/live/${r.id}`, { method: "DELETE" });
    router.refresh();
  }

  const cost = rows.reduce((s, r) => s + (r.cost || 0), 0);
  const netCost = rows.reduce((s, r) => s + (r.net_cost || 0), 0);
  const orders = rows.reduce((s, r) => s + (r.sku_orders || 0), 0);
  const gross = rows.reduce((s, r) => s + (r.gross_revenue || 0), 0);
  const views = rows.reduce((s, r) => s + (r.live_views || 0), 0);
  const roi = cost > 0 ? Math.round((gross / cost) * 100) / 100 : null;
  const cpo = orders > 0 ? Math.round((cost / orders) * 100) / 100 : null;
  const page = getPage(params.get("page"));
  const pageRows = paginate(rows, page, 20);

  return (
    <>
      {canEdit && (
      <SalesImport
        title="Import Live Campaign Data (.xlsx) — Live"
        endpoint="/api/marketer/sales/live/import"
        columns={["Campaign name", "Cost", "Net Cost", "Gross revenue", "SKU orders", "LIVE views", "Current budget"]}
        note={<>TikTok Ads → Live campaign data export. Semua campaign dijumlahkan jadi <b>satu total harian</b> ikut brand + tarikh. Re-import brand + tarikh yang sama menggantikan hari itu.</>}
        sampleHref="/examples/live-campaign-sample.xlsx"
        brandInputId="sl-brand"
        resultLabel={(d) => `Dijumlahkan ${d.imported} live · 1 baris harian`}
      />
      )}
      <DateRangeFilter count={rows.length} countNoun={["day", "days"]} defaultMode="month" />
      <BrandFilterCard id="sl-filter-brand" value={brand} onChange={setBrand} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Kpi Icon={Wallet} label="Cost" value={fmtRM(cost)} fill="red" />
        <Kpi Icon={TrendingUp} label="Gross Revenue" value={fmtRM(gross)} fill="emerald" />
        <Kpi Icon={(roi ?? 0) >= 1 ? TrendingUp : TrendingDown} label="ROI" value={roi != null ? roi : "—"} />
      </div>

      {rows.length === 0 ? (
        <p className="card text-center text-sm text-muted-fg">No Live data in this range. Import an .xlsx above.</p>
      ) : (
        <>
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted-fg">
                <tr>
                  <th className="px-4 py-3 font-semibold">No</th>
                  <SortTh k="brand_name" sort={sort} on={toggleSort}>Brand</SortTh>
                  <SortTh k="report_date" sort={sort} on={toggleSort}>Date</SortTh>
                  <SortTh k="cost" sort={sort} on={toggleSort} right>Cost</SortTh>
                  <SortTh k="sku_orders" sort={sort} on={toggleSort} right>SKU Orders</SortTh>
                  <SortTh k="cost_per_order" sort={sort} on={toggleSort} right>Cost / Order</SortTh>
                  <SortTh k="gross_revenue" sort={sort} on={toggleSort} right>Gross Revenue</SortTh>
                  <SortTh k="roi" sort={sort} on={toggleSort} right>ROI</SortTh>
                  <SortTh k="live_views" sort={sort} on={toggleSort} right>LIVE Views</SortTh>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => (
                  <tr key={r.id} className={`border-t border-line/60 hover:bg-white/50 ${editing?.id === r.id ? "bg-primary/5" : ""}`}>
                    <td className="px-4 py-3 text-muted-fg">{(page - 1) * 20 + i + 1}</td>
                    <td className="px-4 py-3">{r.brand_name ? <span className="chip bg-primary/10 text-primary">{r.brand_name}</span> : <span className="text-muted-fg/50">—</span>}</td>
                    <td className="px-4 py-3 text-ink">{fmtDMY(r.report_date)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">{money2(r.cost)}</td>
                    <td className="px-4 py-3 text-right">{int(r.sku_orders)}</td>
                    <td className="px-4 py-3 text-right">{money2(deriveCpo(r.cost, r.sku_orders, r.cost_per_order))}</td>
                    <td className="px-4 py-3 text-right">{money2(r.gross_revenue)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">{deriveRoi(r.cost, r.gross_revenue, r.roi) ?? "—"}</td>
                    <td className="px-4 py-3 text-right">{intOr(r.live_views)}</td>
                    <td className="px-4 py-3">
                      {canEdit && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditing(r)} className="cursor-pointer rounded-lg p-2 text-muted-fg hover:bg-accent/10 hover:text-accent" aria-label="Edit"><Pencil className="h-4 w-4" aria-hidden="true" /></button>
                        <button onClick={() => remove(r)} className="cursor-pointer rounded-lg p-2 text-muted-fg hover:bg-danger/10 hover:text-danger" aria-label="Delete"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                      </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={rows.length} size={20} />
        </>
      )}
      <SalesDailyEditModal kind="live" row={editing} onClose={() => setEditing(null)} />
    </>
  );
}

/**
 * Product totals already INCLUDE Card (the TikTok export bundles them), so the
 * Product tab and Spend show Product-only = imported − Card for the matching
 * brand + date. Pure in-memory maths over already-loaded data — no extra query.
 */
function adjustProductByCard(products: SalesProduct[], cards: SalesCard[]): SalesProduct[] {
  const cmap = new Map<string, { cost: number; gross: number; orders: number }>();
  for (const c of cards) {
    const k = `${c.brand_id ?? 0}|${c.report_date}`;
    const e = cmap.get(k) || { cost: 0, gross: 0, orders: 0 };
    e.cost += c.cost || 0; e.gross += c.gross_revenue || 0; e.orders += c.sku_orders || 0;
    cmap.set(k, e);
  }
  return products.map((p) => {
    const c = cmap.get(`${p.brand_id ?? 0}|${p.report_date}`);
    if (!c) return p;
    const cost = (p.cost || 0) - c.cost;
    const gross = (p.gross_revenue || 0) - c.gross;
    const orders = (p.sku_orders || 0) - c.orders;
    return {
      ...p, cost, gross_revenue: gross, sku_orders: orders,
      cost_per_order: orders > 0 ? Math.round((cost / orders) * 100) / 100 : null,
      roi: cost > 0 ? Math.round((gross / cost) * 100) / 100 : null,
    };
  });
}

function SalesProductTab({ rows: rawAll, cards }: { rows: SalesProduct[]; cards: SalesCard[] }) {
  const canEdit = useCanEdit();
  const router = useRouter();
  const params = useSearchParams();
  const { from, to } = resolveRange(
    { from: params.get("from"), to: params.get("to"), all: params.get("all") }, "month"
  );
  const [brand, setBrand] = useState("");
  const [editing, setEditing] = useState<SalesProduct | null>(null);
  // Displayed rows are card-adjusted; editing operates on the raw import.
  const all = adjustProductByCard(rawAll, cards);
  const rawById = new Map(rawAll.map((r) => [r.id, r]));
  const unsorted = all.filter((p) => {
    if (from && p.report_date < from) return false;
    if (to && p.report_date > to) return false;
    if (brand && String(p.brand_id ?? "") !== brand) return false;
    return true;
  });
  const { sorted: rows, sort, toggleSort } = useTableSort(unsorted);

  async function remove(r: SalesProduct) {
    if (!(await confirmDialog({ title: "Padam rekod product ini?", danger: true }))) return;
    await fetch(`/api/marketer/sales/product/${r.id}`, { method: "DELETE" });
    router.refresh();
  }

  const cost = rows.reduce((s, r) => s + (r.cost || 0), 0);
  const netCost = rows.reduce((s, r) => s + (r.net_cost || 0), 0);
  const orders = rows.reduce((s, r) => s + (r.sku_orders || 0), 0);
  const gross = rows.reduce((s, r) => s + (r.gross_revenue || 0), 0);
  const roi = cost > 0 ? Math.round((gross / cost) * 100) / 100 : null;
  const cpo = orders > 0 ? Math.round((cost / orders) * 100) / 100 : null;
  const page = getPage(params.get("page"));
  const pageRows = paginate(rows, page, 20);

  return (
    <>
      <SalesImport
        title="Import Product Campaign Data (.xlsx)"
        endpoint="/api/marketer/sales/product/import"
        columns={["Campaign name", "Cost", "Net Cost", "Current budget", "SKU orders", "Cost per order", "Gross revenue"]}
        note={<>TikTok Ads → Product campaign data export. Semua campaign dijumlahkan jadi <b>satu total harian</b> ikut brand + tarikh. Re-import brand + tarikh yang sama menggantikan hari itu.</>}
        sampleHref="/examples/product-campaign-data-sample.xlsx"
        brandInputId="sp-brand"
        resultLabel={(d) => `Dijumlahkan ${d.imported} campaign · 1 baris harian`}
      />
      <DateRangeFilter count={rows.length} countNoun={["day", "days"]} defaultMode="month" />
      <BrandFilterCard id="sp-filter-brand" value={brand} onChange={setBrand} />
      <p className="-mt-2 text-[11px] text-muted-fg">
        Nilai di bawah = import <b>tolak Card</b> (brand + tarikh yang sama) supaya tak double-count. Edit menunjukkan nilai import mentah.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Kpi Icon={Wallet} label="Cost" value={fmtRM(cost)} fill="red" />
        <Kpi Icon={TrendingUp} label="Gross Revenue" value={fmtRM(gross)} fill="emerald" />
        <Kpi Icon={(roi ?? 0) >= 1 ? TrendingUp : TrendingDown} label="ROI" value={roi != null ? roi : "—"} />
      </div>

      {rows.length === 0 ? (
        <p className="card text-center text-sm text-muted-fg">No product data in this range. Import an .xlsx above.</p>
      ) : (
        <>
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted-fg">
                <tr>
                  <th className="px-4 py-3 font-semibold">No</th>
                  <SortTh k="brand_name" sort={sort} on={toggleSort}>Brand</SortTh>
                  <SortTh k="report_date" sort={sort} on={toggleSort}>Date</SortTh>
                  <SortTh k="cost" sort={sort} on={toggleSort} right>Cost</SortTh>
                  <SortTh k="sku_orders" sort={sort} on={toggleSort} right>SKU Orders</SortTh>
                  <SortTh k="cost_per_order" sort={sort} on={toggleSort} right>Cost / Order</SortTh>
                  <SortTh k="gross_revenue" sort={sort} on={toggleSort} right>Gross Revenue</SortTh>
                  <SortTh k="roi" sort={sort} on={toggleSort} right>ROI</SortTh>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => (
                  <tr key={r.id} className={`border-t border-line/60 hover:bg-white/50 ${editing?.id === r.id ? "bg-primary/5" : ""}`}>
                    <td className="px-4 py-3 text-muted-fg">{(page - 1) * 20 + i + 1}</td>
                    <td className="px-4 py-3">{r.brand_name ? <span className="chip bg-primary/10 text-primary">{r.brand_name}</span> : <span className="text-muted-fg/50">—</span>}</td>
                    <td className="px-4 py-3 text-ink">{fmtDMY(r.report_date)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">{money2(r.cost)}</td>
                    <td className="px-4 py-3 text-right">{int(r.sku_orders)}</td>
                    <td className="px-4 py-3 text-right">{money2(deriveCpo(r.cost, r.sku_orders, r.cost_per_order))}</td>
                    <td className="px-4 py-3 text-right">{money2(r.gross_revenue)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">{deriveRoi(r.cost, r.gross_revenue, r.roi) ?? "—"}</td>
                    <td className="px-4 py-3">
                      {canEdit && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditing(rawById.get(r.id) ?? r)} className="cursor-pointer rounded-lg p-2 text-muted-fg hover:bg-accent/10 hover:text-accent" title="Edit nilai import mentah" aria-label="Edit"><Pencil className="h-4 w-4" aria-hidden="true" /></button>
                        <button onClick={() => remove(r)} className="cursor-pointer rounded-lg p-2 text-muted-fg hover:bg-danger/10 hover:text-danger" aria-label="Delete"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                      </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={rows.length} size={20} />
        </>
      )}
      <SalesDailyEditModal kind="product" row={editing} onClose={() => setEditing(null)} />
    </>
  );
}

/* ── Sales · Campaign detail (per-campaign rows) ───────── */

function SalesCampaignTab({ rows: all, kind }: { rows: SalesCampaign[]; kind: "live" | "product" }) {
  const params = useSearchParams();
  const router = useRouter();
  const canEdit = useCanEdit();
  const { from, to } = resolveRange(
    { from: params.get("from"), to: params.get("to"), all: params.get("all") }, "month"
  );
  const [brand, setBrand] = useState("");

  async function remove(r: SalesCampaign) {
    if (!(await confirmDialog({
      title: "Padam campaign ini?",
      text: `${r.campaign_name || "campaign"} — jumlah harian ${kind === "live" ? "Live" : "Product"} akan dikira semula.`,
      danger: true, confirmText: "Padam",
    }))) return;
    await fetch(`/api/marketer/sales/campaign/${r.id}?kind=${kind}`, { method: "DELETE" });
    router.refresh();
  }
  const unsorted = all.filter((p) => {
    if (from && p.report_date < from) return false;
    if (to && p.report_date > to) return false;
    if (brand && String(p.brand_id ?? "") !== brand) return false;
    return true;
  });
  const { sorted: rows, sort, toggleSort } = useTableSort(unsorted);

  const cost = rows.reduce((s, r) => s + (r.cost || 0), 0);
  const gross = rows.reduce((s, r) => s + (r.gross_revenue || 0), 0);
  const orders = rows.reduce((s, r) => s + (r.sku_orders || 0), 0);
  const roi = cost > 0 ? Math.round((gross / cost) * 100) / 100 : null;
  const page = getPage(params.get("page"));
  const pageRows = paginate(rows, page, 20);
  const isLive = kind === "live";

  return (
    <>
      <p className="card flex items-center gap-2 text-sm text-muted-fg">
        <List className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        Detail setiap campaign dari import {isLive ? "Live" : "Product"}. Import di halaman {isLive ? "Live" : "Product"} untuk kemas kini.
      </p>
      <DateRangeFilter count={rows.length} countNoun={["campaign", "campaigns"]} defaultMode="month" />
      <BrandFilterCard id={`scmp-filter-${kind}`} value={brand} onChange={setBrand} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi Icon={List} label="Campaigns" value={rows.length} />
        <Kpi Icon={Wallet} label="Cost" value={money(cost)} fill="red" />
        <Kpi Icon={TrendingUp} label="Gross Revenue" value={money(gross)} fill="emerald" />
        <Kpi Icon={(roi ?? 0) >= 1 ? TrendingUp : TrendingDown} label="ROI" value={roi ?? "—"} />
      </div>

      {rows.length === 0 ? (
        <p className="card text-center text-sm text-muted-fg">
          Tiada campaign dalam julat ini. Import .xlsx di halaman {isLive ? "Live" : "Product"}.
        </p>
      ) : (
        <>
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[1040px] text-sm">
              <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted-fg">
                <tr>
                  <th className="px-4 py-3 font-semibold">No</th>
                  <SortTh k="brand_name" sort={sort} on={toggleSort}>Brand</SortTh>
                  <SortTh k="report_date" sort={sort} on={toggleSort}>Date</SortTh>
                  <SortTh k="campaign_name" sort={sort} on={toggleSort}>Campaign</SortTh>
                  <SortTh k="cost" sort={sort} on={toggleSort} right>Cost</SortTh>
                  <SortTh k="sku_orders" sort={sort} on={toggleSort} right>SKU Orders</SortTh>
                  <SortTh k="cost_per_order" sort={sort} on={toggleSort} right>Cost / Order</SortTh>
                  <SortTh k="gross_revenue" sort={sort} on={toggleSort} right>Gross Revenue</SortTh>
                  <SortTh k="roi" sort={sort} on={toggleSort} right>ROI</SortTh>
                  {isLive && <SortTh k="live_views" sort={sort} on={toggleSort} right>LIVE Views</SortTh>}
                  {canEdit && <th className="px-4 py-3 font-semibold">Action</th>}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => (
                  <tr key={r.id} className="border-t border-line/60 hover:bg-white/50">
                    <td className="px-4 py-3 text-muted-fg">{(page - 1) * 20 + i + 1}</td>
                    <td className="px-4 py-3">{r.brand_name ? <span className="chip bg-primary/10 text-primary">{r.brand_name}</span> : <span className="text-muted-fg/50">—</span>}</td>
                    <td className="px-4 py-3 text-ink">{fmtDMY(r.report_date)}</td>
                    <td className="px-4 py-3">
                      <div className="max-w-[280px] truncate font-semibold text-ink" title={r.campaign_name || ""}>{r.campaign_name || "—"}</div>
                      <div className="font-mono text-[11px] text-muted-fg">{r.campaign_id}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">{money2(r.cost)}</td>
                    <td className="px-4 py-3 text-right">{int(r.sku_orders)}</td>
                    <td className="px-4 py-3 text-right">{money2(deriveCpo(r.cost, r.sku_orders, r.cost_per_order))}</td>
                    <td className="px-4 py-3 text-right">{money2(r.gross_revenue)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">{deriveRoi(r.cost, r.gross_revenue, r.roi) ?? "—"}</td>
                    {isLive && <td className="px-4 py-3 text-right">{intOr(r.live_views)}</td>}
                    {canEdit && (
                      <td className="px-4 py-3">
                        <button onClick={() => remove(r)}
                          className="cursor-pointer rounded-lg p-2 text-muted-fg hover:bg-danger/10 hover:text-danger"
                          aria-label="Padam campaign"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                      </td>
                    )}
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

/* ── Sales · Card (manual entry) ───────────────────────── */

/** Edit one daily Product-card total. Cost/Order and ROI auto-derive. */
function CardEditModal({ row, onClose }: { row: SalesCard | null; onClose: () => void }) {
  const router = useRouter();
  const [f, setF] = useState({ cost: "", sku_orders: "", gross_revenue: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!row) return;
    const s = (v: number | null) => (v == null ? "" : String(v));
    setF({ cost: s(row.cost), sku_orders: s(row.sku_orders), gross_revenue: s(row.gross_revenue) });
    setError("");
  }, [row]);

  const costN = parseNum(f.cost), grossN = parseNum(f.gross_revenue), ordersN = parseNum(f.sku_orders);
  const roi = costN > 0 && Number.isFinite(grossN) ? Math.round((grossN / costN) * 100) / 100 : null;
  const cpo = costN > 0 && ordersN > 0 ? Math.round((costN / ordersN) * 100) / 100 : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!row) return;
    setSaving(true); setError("");
    const res = await fetch(`/api/marketer/sales/card/${row.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brand_id: row.brand_id, report_date: row.report_date,
        cost: f.cost, sku_orders: f.sku_orders, cost_per_order: cpo ?? "", gross_revenue: f.gross_revenue,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setError(data.error || "Save failed.");
    onClose(); router.refresh();
  }

  const fld = (key: keyof typeof f, label: string) => (
    <div>
      <label className="label">{label}</label>
      <input className="input" value={f[key]} inputMode="decimal"
        onChange={(e) => setF((p) => ({ ...p, [key]: e.target.value }))} />
    </div>
  );

  return (
    <Modal open={!!row} onClose={onClose} title="Edit Product Card">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {fld("cost", "Cost (RM)")}
          {fld("sku_orders", "SKU Order")}
          {fld("gross_revenue", "Gross Revenue (RM)")}
          <div>
            <label className="label">Cost / Order <span className="font-normal text-muted-fg">(auto)</span></label>
            <input className="input bg-muted/40" value={cpo != null ? cpo : "—"} readOnly />
          </div>
          <div>
            <label className="label">ROI <span className="font-normal text-muted-fg">(auto)</span></label>
            <input className="input bg-muted/40 font-semibold" value={roi != null ? roi : "—"} readOnly />
          </div>
        </div>
        {error && (
          <p className="flex items-center gap-1.5 text-sm text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

function SalesCardTab({ rows: all }: { rows: SalesCard[] }) {
  const canEdit = useCanEdit();
  const router = useRouter();
  const params = useSearchParams();
  const { from, to } = resolveRange(
    { from: params.get("from"), to: params.get("to"), all: params.get("all") }, "month"
  );
  const [filterBrand, setFilterBrand] = useState("");
  const [editing, setEditing] = useState<SalesCard | null>(null);
  const unsorted = all.filter((r) => {
    if (from && r.report_date < from) return false;
    if (to && r.report_date > to) return false;
    if (filterBrand && String(r.brand_id ?? "") !== filterBrand) return false;
    return true;
  });
  const { sorted: rows, sort, toggleSort } = useTableSort(unsorted);

  async function remove(r: SalesCard) {
    if (!(await confirmDialog({ title: "Padam rekod card ini?", danger: true }))) return;
    await fetch(`/api/marketer/sales/card/${r.id}`, { method: "DELETE" });
    router.refresh();
  }

  const cost = rows.reduce((s, r) => s + (r.cost || 0), 0);
  const orders = rows.reduce((s, r) => s + (r.sku_orders || 0), 0);
  const gross = rows.reduce((s, r) => s + (r.gross_revenue || 0), 0);
  const tRoi = cost > 0 ? Math.round((gross / cost) * 100) / 100 : null;
  const tCpo = orders > 0 ? Math.round((cost / orders) * 100) / 100 : null;
  const page = getPage(params.get("page"));
  const pageRows = paginate(rows, page, 20);

  return (
    <>
      <SalesImport
        title="Import Creative Data — Product Card sahaja"
        endpoint="/api/marketer/sales/card/import"
        columns={["Creative type", "Cost", "SKU orders", "Cost per order", "Gross revenue"]}
        note={<>TikTok Ads → <b>creative data for product campaigns</b>. Hanya baris <b>Creative type = Product card</b> diambil. Setiap upload <b>ditambah</b> (bukan ganti) — boleh upload banyak fail untuk hari yang sama. Urus &amp; buang fail di tab <b>Product Card · Excel</b>.</>}
        sampleHref="/examples/creative-product-campaigns-sample.xlsx"
        brandInputId="card-brand"
        resultLabel={(d) => `Product card: ${d.imported} baris · 1 baris harian`}
      />
      <DateRangeFilter count={rows.length} countNoun={["day", "days"]} defaultMode="month" />
      <BrandFilterCard id="card-filter-brand" value={filterBrand} onChange={setFilterBrand} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi Icon={Wallet} label="Cost" value={money(cost)} fill="red" />
        <Kpi Icon={ShoppingCart} label="SKU Order" value={int(orders)} />
        <Kpi Icon={Wallet} label="Cost / Order" value={fmtRMor(tCpo)} />
        <Kpi Icon={TrendingUp} label="Gross Revenue" value={money(gross)} fill="emerald" />
        <Kpi Icon={(tRoi ?? 0) >= 1 ? TrendingUp : TrendingDown} label="ROI" value={tRoi ?? "—"} />
      </div>

      {rows.length === 0 ? (
        <p className="card text-center text-sm text-muted-fg">Tiada data Product Card dalam julat ini. Import .xlsx di atas.</p>
      ) : (
        <>
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted-fg">
                <tr>
                  <th className="px-4 py-3 font-semibold">No</th>
                  <SortTh k="brand_name" sort={sort} on={toggleSort}>Brand</SortTh>
                  <SortTh k="report_date" sort={sort} on={toggleSort}>Date</SortTh>
                  <SortTh k="cost" sort={sort} on={toggleSort} right>Cost</SortTh>
                  <SortTh k="sku_orders" sort={sort} on={toggleSort} right>SKU Order</SortTh>
                  <SortTh k="cost_per_order" sort={sort} on={toggleSort} right>Cost / Order</SortTh>
                  <SortTh k="gross_revenue" sort={sort} on={toggleSort} right>Gross Revenue</SortTh>
                  <SortTh k="roi" sort={sort} on={toggleSort} right>ROI</SortTh>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => (
                  <tr key={r.id} className={`border-t border-line/60 hover:bg-white/50 ${editing?.id === r.id ? "bg-primary/5" : ""}`}>
                    <td className="px-4 py-3 text-muted-fg">{(page - 1) * 20 + i + 1}</td>
                    <td className="px-4 py-3">
                      {r.brand_name
                        ? <span className="chip bg-primary/10 text-primary">{r.brand_name}</span>
                        : <span className="text-muted-fg/50">—</span>}
                    </td>
                    <td className="px-4 py-3 text-ink">{fmtDMY(r.report_date)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">{money(r.cost)}</td>
                    <td className="px-4 py-3 text-right">{int(r.sku_orders)}</td>
                    <td className="px-4 py-3 text-right">{money(deriveCpo(r.cost, r.sku_orders, r.cost_per_order))}</td>
                    <td className="px-4 py-3 text-right">{money(r.gross_revenue)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">{deriveRoi(r.cost, r.gross_revenue, r.roi) ?? "—"}</td>
                    <td className="px-4 py-3">
                      {canEdit && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditing(r)}
                          className="cursor-pointer rounded-lg p-2 text-muted-fg hover:bg-accent/10 hover:text-accent"
                          aria-label="Edit"><Pencil className="h-4 w-4" aria-hidden="true" /></button>
                        <button onClick={() => remove(r)}
                          className="cursor-pointer rounded-lg p-2 text-muted-fg hover:bg-danger/10 hover:text-danger"
                          aria-label="Delete"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                      </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={rows.length} size={20} />
        </>
      )}
      <CardEditModal row={editing} onClose={() => setEditing(null)} />
    </>
  );
}

/* ── Overall ───────────────────────────────────────────── */

const money = (n: number | null) => (n != null ? fmtRM(n) : "—");
const int = (n: number | null) => (n != null ? fmtNum(n) : "—");

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

  if (!useCanEdit()) return <ReadOnlyHint />; // read-only: hint in team mode, else hidden
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
        Image 2 = <b>Key metrics</b> (GMV, Visitors, Impressions, Clicks) <b>+ GMV breakdown</b> (LIVEs / Videos / Product cards). Read by Gemini 2.5 Flash.
      </p>
      {msg && <span className="text-xs font-medium text-emerald-600">{msg}</span>}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}

function OverallTab({ overall, salesLive, salesProduct, salesCard, spendTtm }: {
  overall: Overall[]; salesLive: SalesLive[]; salesProduct: SalesProduct[]; salesCard: SalesCard[];
  spendTtm: SpendTtm[];
}) {
  const params = useSearchParams();
  const { from, to } = resolveRange(
    { from: params.get("from"), to: params.get("to"), all: params.get("all") },
    "month"
  );
  // "" = All Brands, the default.
  const [brand, setBrand] = useState("");
  const unsorted = overall.filter((o) => {
    if (from && o.report_date < from) return false;
    if (to && o.report_date > to) return false;
    if (brand && String(o.brand_id ?? "") !== brand) return false;
    return true;
  });
  const { sorted: rows, sort, toggleSort } = useTableSort(unsorted);

  const inR = (d: string) => (!from || d >= from) && (!to || d <= to);
  const inB = (b: number | null) => !brand || String(b ?? "") === brand;

  const sum = (k: keyof Overall) => rows.reduce((s, r) => s + ((r[k] as number) || 0), 0);
  const gross = sum("gross_revenue"), gmv = sum("gmv");
  // TTAM spend from the Spend tab; Overall Spend = imported cost + TTAM.
  const ttmCost = spendTtm.filter((t) => inR(t.report_date) && inB(t.brand_id)).reduce((a, t) => a + (t.ttm_cost || 0), 0);
  const cost = sum("cost") + ttmCost;
  const roi = cost > 0 ? Math.round((gross / cost) * 100) / 100 : null;

  // GMV = Live + Product-only + Card (same date/brand filter). salesProduct is
  // already card-adjusted, so Live + Product-only + Card = the true GMV.
  const gmvSum = (arr: { report_date: string; brand_id: number | null; cost: number | null; gross_revenue: number | null }[], k: "cost" | "gross_revenue") =>
    arr.filter((s) => inR(s.report_date) && inB(s.brand_id)).reduce((a, s) => a + (s[k] || 0), 0);
  const gmvCost = gmvSum(salesLive, "cost") + gmvSum(salesProduct, "cost") + gmvSum(salesCard, "cost");
  const gmvGross = gmvSum(salesLive, "gross_revenue") + gmvSum(salesProduct, "gross_revenue") + gmvSum(salesCard, "gross_revenue");
  const roiGmv = gmvCost > 0 ? Math.round((gmvGross / gmvCost) * 100) / 100 : null;

  // Organic = Overall − GMV.
  const costOrganic = cost - gmvCost;
  const grossOrganic = gross - gmvGross;
  const roiOrganic = costOrganic > 0 ? Math.round((grossOrganic / costOrganic) * 100) / 100 : null;

  return (
    <>
      <OverallImport />
      <DateRangeFilter count={rows.length} countNoun={["report", "reports"]}
        defaultMode="month" />

      <BrandFilterCard id="ov-filter-brand" value={brand} onChange={setBrand} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi Icon={TrendingUp} label="Overall GMV" value={money(gmv)} fill="yellow" />
        <Kpi Icon={Wallet} label="Overall Spend" value={money(cost)} fill="red" />
        <Kpi Icon={Wallet} label="Spend TTAM" value={money(ttmCost)} />
        <Kpi Icon={TrendingUp} label="Overall Gross Revenue" value={money(gross)} fill="emerald" />
        <Kpi Icon={(roi ?? 0) >= 1 ? TrendingUp : TrendingDown} label="Overall ROI" value={roi ?? "—"} />
        <Kpi Icon={ShoppingCart} label="Overall SKU Orders" value={int(sum("sku_orders"))} />
        <Kpi Icon={Users} label="Overall Visitors" value={int(sum("visitors"))} />
        <Kpi Icon={Eye} label="Product Impressions" value={int(sum("product_impressions"))} />
        <Kpi Icon={MousePointerClick} label="Product Clicks" value={int(sum("product_clicks"))} />
      </div>

      <section>
        <h2 className="section-title mb-2">GMV Breakdown (by content type)</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <Kpi Icon={Radio} label="Total Live" value={money(sum("gmv_live"))} fill="yellow" />
          <Kpi Icon={Users} label="Live Creator" value={money(sum("gmv_live_creator"))} />
          <Kpi Icon={ShoppingBag} label="Live Seller" value={money(sum("gmv_live_seller"))} />
          <Kpi Icon={PackageSearch} label="Videos" value={money(sum("gmv_video"))} fill="yellow" />
          <Kpi Icon={Users} label="Video Creator" value={money(sum("gmv_video_creator"))} />
          <Kpi Icon={ShoppingBag} label="Video Seller" value={money(sum("gmv_video_seller"))} />
          <Kpi Icon={CreditCard} label="Product Cards" value={money(sum("gmv_product_cards"))} />
        </div>
      </section>

      <section>
        <h2 className="section-title mb-2">GMV (Live + Video + Card)</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Kpi Icon={Wallet} label="Cost GMV" value={money(gmvCost)} fill="red" />
          <Kpi Icon={TrendingUp} label="Gross Revenue GMV" value={money(gmvGross)} fill="emerald" />
          <Kpi Icon={(roiGmv ?? 0) >= 1 ? TrendingUp : TrendingDown} label="ROI GMV" value={roiGmv ?? "—"} />
        </div>
      </section>

      <section>
        <h2 className="section-title mb-2">Organic (Overall − GMV)</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Kpi Icon={Wallet} label="Cost Organic" value={money(costOrganic)} fill="red" />
          <Kpi Icon={TrendingUp} label="Gross Revenue Organic" value={money(grossOrganic)} fill="emerald" />
          <Kpi Icon={(roiOrganic ?? 0) >= 1 ? TrendingUp : TrendingDown} label="ROI Organic" value={roiOrganic ?? "—"} />
        </div>
      </section>

      {rows.length === 0 ? (
        <p className="card text-center text-sm text-muted-fg">
          No overall reports in this range. Import the two GMV-Max screenshots above.
        </p>
      ) : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[1040px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted-fg">
              <tr>
                <SortTh k="report_date" sort={sort} on={toggleSort}>Date</SortTh>
                <SortTh k="brand_name" sort={sort} on={toggleSort}>Brand</SortTh>
                <SortTh k="gmv" sort={sort} on={toggleSort} right>Overall GMV</SortTh>
                <SortTh k="cost" sort={sort} on={toggleSort} right>Overall Spend</SortTh>
                <SortTh k="gross_revenue" sort={sort} on={toggleSort} right>Gross Revenue</SortTh>
                <SortTh k="roi" sort={sort} on={toggleSort} right>ROI</SortTh>
                <SortTh k="sku_orders" sort={sort} on={toggleSort} right>SKU Orders</SortTh>
                <SortTh k="visitors" sort={sort} on={toggleSort} right>Visitors</SortTh>
                <SortTh k="product_impressions" sort={sort} on={toggleSort} right>Impressions</SortTh>
                <SortTh k="product_clicks" sort={sort} on={toggleSort} right>Clicks</SortTh>
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
                  <td className="px-4 py-3 text-right font-semibold text-ink">{deriveRoi(o.cost, o.gross_revenue, o.roi) ?? "—"}</td>
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

/* ── Beg Kuning + Creator ──────────────────────────────── */

function CreatorImport() {
  const router = useRouter();
  const [img1, setImg1] = useState<File | null>(null);
  const [img2, setImg2] = useState<File | null>(null);
  const [date, setDate] = useState("");
  const [brand, setBrand] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    if (!img1 || !img2) return setError("Attach both Image 1 (Post) and Image 2 (Creative).");
    if (!brand) return setError("Pick a brand.");
    if (!date) return setError("Pick the report date.");
    setBusy(true); setError(""); setMsg("");
    const fd = new FormData();
    fd.append("image1", img1);
    fd.append("image2", img2);
    fd.append("report_date", date);
    fd.append("brand_id", brand);
    const res = await fetch("/api/marketer/creator/import", { method: "POST", body: fd });
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
          caption="Screenshot dari TikTok Shop → Analytics." />
      </div>
    </div>
  );

  if (!useCanEdit()) return <ReadOnlyHint />; // read-only: hint in team mode, else hidden
  return (
    <div className="card space-y-3">
      <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
        <ImagePlus className="h-4 w-4 text-primary" aria-hidden="true" />
        Import Beg Kuning + Creator — screenshots
      </p>
      <div className="flex flex-wrap items-stretch gap-3">
        {slot(1, "Post panel", img1, setImg1, "/examples/beg-kuning-post.jpeg")}
        {slot(2, "Creative panel", img2, setImg2, "/examples/beg-kuning-creative.jpeg")}
        <div className="flex flex-col justify-end gap-2">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg"
              htmlFor="cr-brand">Brand</label>
            <BrandSelect id="cr-brand" value={brand} onChange={setBrand}
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
        Image 1 = <b>Post</b> tab (Gross revenue, Posts with links, Total authorized posts, Creators with mass authorization).
        Image 2 = <b>Creative</b> / Creators tab (Gross revenue, Total authorized posts, Total creators, Creators with mass authorization). Read by Gemini 2.5 Flash.
      </p>
      {msg && <span className="text-xs font-medium text-emerald-600">{msg}</span>}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}

function CreatorTab({ reports }: { reports: CreatorReport[] }) {
  const canEdit = useCanEdit();
  const router = useRouter();
  const params = useSearchParams();
  const { from, to } = resolveRange(
    { from: params.get("from"), to: params.get("to"), all: params.get("all") },
    "month"
  );
  // "" = All Brands, the default.
  const [brand, setBrand] = useState("");
  const [editing, setEditing] = useState<CreatorReport | null>(null);
  const unsorted = reports.filter((r) => {
    if (from && r.report_date < from) return false;
    if (to && r.report_date > to) return false;
    if (brand && String(r.brand_id ?? "") !== brand) return false;
    return true;
  });
  const { sorted: rows, sort, toggleSort } = useTableSort(unsorted);

  const sum = (k: keyof CreatorReport) => rows.reduce((s, r) => s + ((r[k] as number) || 0), 0);

  async function remove(r: CreatorReport) {
    if (!(await confirmDialog({ title: "Padam report ini?", danger: true }))) return;
    await fetch(`/api/marketer/creator/${r.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <>
      <CreatorImport />
      <DateRangeFilter count={rows.length} countNoun={["report", "reports"]} defaultMode="month" />
      <BrandFilterCard id="cr-filter-brand" value={brand} onChange={setBrand} />

      <section>
        <h2 className="section-title mb-2">Summary — Post</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi Icon={TrendingUp} label="Gross Revenue" value={money(sum("post_gross_revenue"))} fill="emerald" />
          <Kpi Icon={Send} label="Posts with Links" value={int(sum("post_with_links"))} />
          <Kpi Icon={ClipboardList} label="Total Authorized Posts" value={int(sum("post_authorized"))} />
          <Kpi Icon={Users} label="Creators w/ Mass Auth" value={int(sum("post_creators_mass_auth"))} />
        </div>
      </section>

      <section>
        <h2 className="section-title mb-2">Summary — Creator</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi Icon={TrendingUp} label="Gross Revenue" value={money(sum("creative_gross_revenue"))} fill="emerald" />
          <Kpi Icon={ClipboardList} label="Total Authorized Posts" value={int(sum("creative_authorized"))} />
          <Kpi Icon={Users} label="Total Creators" value={int(sum("creative_total_creators"))} fill="yellow" />
          <Kpi Icon={Users} label="Creators w/ Mass Auth" value={int(sum("creative_creators_mass_auth"))} />
        </div>
      </section>

      {rows.length === 0 ? (
        <p className="card text-center text-sm text-muted-fg">
          No Beg Kuning + Creator reports in this range. Import the two screenshots above.
        </p>
      ) : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted-fg">
              <tr>
                <SortTh k="report_date" sort={sort} on={toggleSort}>Date</SortTh>
                <SortTh k="brand_name" sort={sort} on={toggleSort}>Brand</SortTh>
                <SortTh k="post_gross_revenue" sort={sort} on={toggleSort} right>Post Gross Rev</SortTh>
                <SortTh k="post_with_links" sort={sort} on={toggleSort} right>Posts w/ Links</SortTh>
                <SortTh k="post_authorized" sort={sort} on={toggleSort} right>Post Authorized</SortTh>
                <SortTh k="post_creators_mass_auth" sort={sort} on={toggleSort} right>Post Mass Auth</SortTh>
                <SortTh k="creative_gross_revenue" sort={sort} on={toggleSort} right>Creator Gross Rev</SortTh>
                <SortTh k="creative_authorized" sort={sort} on={toggleSort} right>Creator Authorized</SortTh>
                <SortTh k="creative_total_creators" sort={sort} on={toggleSort} right>Total Creators</SortTh>
                <SortTh k="creative_creators_mass_auth" sort={sort} on={toggleSort} right>Creator Mass Auth</SortTh>
                <th className="px-4 py-3 font-semibold">Proof</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={`border-t border-line/60 hover:bg-white/50 ${editing?.id === r.id ? "bg-primary/5" : ""}`}>
                  <td className="px-4 py-3 font-semibold text-ink">{fmtDMY(r.report_date)}</td>
                  <td className="px-4 py-3">
                    {r.brand_name
                      ? <span className="chip bg-primary/10 text-primary">{r.brand_name}</span>
                      : <span className="text-muted-fg/50">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-ink">{money(r.post_gross_revenue)}</td>
                  <td className="px-4 py-3 text-right">{int(r.post_with_links)}</td>
                  <td className="px-4 py-3 text-right">{int(r.post_authorized)}</td>
                  <td className="px-4 py-3 text-right">{int(r.post_creators_mass_auth)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-ink">{money(r.creative_gross_revenue)}</td>
                  <td className="px-4 py-3 text-right">{int(r.creative_authorized)}</td>
                  <td className="px-4 py-3 text-right">{int(r.creative_total_creators)}</td>
                  <td className="px-4 py-3 text-right">{int(r.creative_creators_mass_auth)}</td>
                  <td className="px-4 py-3">
                    <span className="flex gap-1">
                      {r.img1_path && <a href={r.img1_path} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-accent hover:underline">1</a>}
                      {r.img2_path && <a href={r.img2_path} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-accent hover:underline">2</a>}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditing(r)}
                        className="cursor-pointer rounded-lg p-2 text-muted-fg hover:bg-accent/10 hover:text-accent"
                        aria-label="Edit"><Pencil className="h-4 w-4" aria-hidden="true" /></button>
                      <button onClick={() => remove(r)}
                        className="cursor-pointer rounded-lg p-2 text-muted-fg hover:bg-danger/10 hover:text-danger"
                        aria-label="Delete"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreatorEditModal report={editing} onClose={() => setEditing(null)} />
    </>
  );
}

/** Edit the Post + Creative values of a report (manual override of the AI read). */
function CreatorEditModal({ report, onClose }: { report: CreatorReport | null; onClose: () => void }) {
  const router = useRouter();
  const [f, setF] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!report) return;
    const s = (v: number | null) => (v == null ? "" : String(v));
    setF({
      post_gross_revenue: s(report.post_gross_revenue), post_with_links: s(report.post_with_links),
      post_authorized: s(report.post_authorized), post_creators_mass_auth: s(report.post_creators_mass_auth),
      creative_gross_revenue: s(report.creative_gross_revenue), creative_authorized: s(report.creative_authorized),
      creative_total_creators: s(report.creative_total_creators), creative_creators_mass_auth: s(report.creative_creators_mass_auth),
    });
    setError("");
  }, [report]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!report) return;
    setSaving(true); setError("");
    const res = await fetch(`/api/marketer/creator/${report.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setError(data.error || "Save failed.");
    onClose(); router.refresh();
  }

  const fld = (key: string, label: string) => (
    <div>
      <label className="label">{label}</label>
      <input className="input" value={f[key] ?? ""} inputMode="decimal"
        onChange={(e) => setF((p) => ({ ...p, [key]: e.target.value }))} />
    </div>
  );

  return (
    <Modal open={!!report} onClose={onClose} title="Edit Post + Creative">
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm font-semibold text-ink">Post</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {fld("post_gross_revenue", "Gross Revenue")}
          {fld("post_with_links", "Posts with Links")}
          {fld("post_authorized", "Total Authorized Posts")}
          {fld("post_creators_mass_auth", "Creators w/ Mass Auth")}
        </div>
        <p className="text-sm font-semibold text-ink">Creator</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {fld("creative_gross_revenue", "Gross Revenue")}
          {fld("creative_authorized", "Total Authorized Posts")}
          {fld("creative_total_creators", "Total Creators")}
          {fld("creative_creators_mass_auth", "Creators w/ Mass Auth")}
        </div>
        {error && (
          <p className="flex items-center gap-1.5 text-sm text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ── Live Session (non-login live users) ───────────────── */

const LIVE_TYPE_STYLE: Record<string, string> = {
  "KOL": "bg-violet-100 text-violet-700",
  "Affiliate Special": "bg-sky-100 text-sky-700",
  "Founder": "bg-amber-100 text-amber-700",
  "HQ": "bg-emerald-100 text-emerald-700",
};

function LiveUserModal({
  open, liveUser, onClose,
}: { open: boolean; liveUser: LiveUser | null; onClose: () => void }) {
  const router = useRouter();
  const [f, setF] = useState({ name: "", user_type: "", phone: "", tiktok_link: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setF({
      name: liveUser?.name || "",
      user_type: liveUser?.user_type || "",
      phone: liveUser?.phone || "",
      tiktok_link: liveUser?.tiktok_link || "",
    });
    setError("");
  }, [open, liveUser]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) return setError("Nama diperlukan.");
    if (!f.user_type) return setError("Pilih jenis.");
    setSaving(true); setError("");
    const res = await fetch(
      liveUser ? `/api/marketer/live-users/${liveUser.id}` : "/api/marketer/live-users",
      {
        method: liveUser ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      }
    );
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setError(data.error || "Save failed.");
    onClose(); router.refresh();
  }

  return (
    <Modal open={open} onClose={onClose} title={liveUser ? "Update Live User" : "Add Live User"}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label" htmlFor="lu-name">Nama</label>
          <input id="lu-name" className="input" value={f.name} autoFocus required
            onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Nur Aisyah" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="lu-type">Jenis</label>
            <select id="lu-type" className="input cursor-pointer" value={f.user_type} required
              onChange={(e) => setF((p) => ({ ...p, user_type: e.target.value }))}>
              <option value="">— Pilih jenis —</option>
              {LIVE_USER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="lu-phone">
              No WhatsApp <span className="font-normal text-muted-fg">(optional)</span>
            </label>
            <input id="lu-phone" className="input" value={f.phone}
              onChange={(e) => setF((p) => ({ ...p, phone: e.target.value }))}
              placeholder="0123456789" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="lu-tiktok">
            Link TikTok <span className="font-normal text-muted-fg">(optional)</span>
          </label>
          <input id="lu-tiktok" className="input" value={f.tiktok_link}
            onChange={(e) => setF((p) => ({ ...p, tiktok_link: e.target.value }))}
            placeholder="https://www.tiktok.com/@…" />
        </div>
        {error && (
          <p className="flex items-center gap-1.5 text-sm text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ListLiveUserTab({ liveUsers }: { liveUsers: LiveUser[] }) {
  const canEdit = useCanEdit();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LiveUser | null>(null);

  async function remove(u: LiveUser) {
    if (!(await confirmDialog({
      title: `Padam "${u.name}"?`, danger: true,
      text: "Semua live session untuk live user ini akan dipadam sekali.",
    }))) return;
    await fetch(`/api/marketer/live-users/${u.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="section-title">List Live User</h2>
          <p className="text-sm text-muted-fg">
            KOL, Affiliate Special, Founder, HQ. Tiada login — rekod sahaja.
          </p>
        </div>
        {canEdit && (
          <button className="btn !py-2" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" aria-hidden="true" />Add Live User
          </button>
        )}
      </div>

      {liveUsers.length === 0 ? (
        <p className="card text-center text-sm text-muted-fg">
          Belum ada live user — klik Add Live User.
        </p>
      ) : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted-fg">
              <tr>
                <th className="px-4 py-3 font-semibold">Nama</th>
                <th className="px-4 py-3 font-semibold">Jenis</th>
                <th className="px-4 py-3 font-semibold">No WhatsApp</th>
                <th className="px-4 py-3 font-semibold">Link TikTok</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {liveUsers.map((u) => (
                <tr key={u.id} className="border-t border-line/60 hover:bg-white/50">
                  <td className="px-4 py-3 font-semibold text-ink">{u.name}</td>
                  <td className="px-4 py-3">
                    <span className={`chip ${LIVE_TYPE_STYLE[u.user_type] || "bg-muted text-muted-fg"}`}>{u.user_type}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-fg">{u.phone || "—"}</td>
                  <td className="px-4 py-3">
                    {u.tiktok_link
                      ? <a href={u.tiktok_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"><ExternalLink className="h-3 w-3" aria-hidden="true" />TikTok</a>
                      : <span className="text-muted-fg/50">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {canEdit && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditing(u); setOpen(true); }}
                        className="cursor-pointer rounded-lg p-2 text-muted-fg hover:bg-accent/10 hover:text-accent"
                        aria-label={`Edit ${u.name}`}>
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button onClick={() => remove(u)}
                        className="cursor-pointer rounded-lg p-2 text-muted-fg hover:bg-danger/10 hover:text-danger"
                        aria-label={`Delete ${u.name}`}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <LiveUserModal open={open} liveUser={editing} onClose={() => setOpen(false)} />
    </div>
  );
}

/** Add / edit a live session's schedule fields. */
function LiveSessionModal({
  open, session, liveUsers, onClose,
}: { open: boolean; session: LiveSession | null; liveUsers: LiveUser[]; onClose: () => void }) {
  const router = useRouter();
  const [f, setF] = useState({ live_user_id: "", brand_id: "", live_date: "", start_time: "", end_time: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setF({
      live_user_id: session ? String(session.live_user_id) : "",
      brand_id: session?.brand_id != null ? String(session.brand_id) : "",
      live_date: session?.live_date || "",
      start_time: session?.start_time || "",
      end_time: session?.end_time || "",
      note: session?.note || "",
    });
    setError("");
  }, [open, session]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.live_user_id) return setError("Pilih live user.");
    if (!f.live_date) return setError("Pilih tarikh.");
    setSaving(true); setError("");
    const res = await fetch(
      session ? `/api/marketer/live-sessions/${session.id}` : "/api/marketer/live-sessions",
      {
        method: session ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      }
    );
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setError(data.error || "Save failed.");
    onClose(); router.refresh();
  }

  return (
    <Modal open={open} onClose={onClose} title={session ? "Update Live Session" : "Add Live Session"}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="ls-user">Live User</label>
            <select id="ls-user" className="input cursor-pointer" value={f.live_user_id} required
              onChange={(e) => setF((p) => ({ ...p, live_user_id: e.target.value }))}>
              <option value="">— Pilih —</option>
              {liveUsers.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.user_type})</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ls-brand">Brand <span className="font-normal text-muted-fg">(optional)</span></label>
            <BrandSelect id="ls-brand" value={f.brand_id} onChange={(v) => setF((p) => ({ ...p, brand_id: v }))} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="ls-date">Tarikh</label>
            <input id="ls-date" type="date" className="input cursor-pointer" value={f.live_date} required
              onChange={(e) => setF((p) => ({ ...p, live_date: e.target.value }))} />
          </div>
          <div>
            <label className="label" htmlFor="ls-start">Mula</label>
            <input id="ls-start" type="time" className="input cursor-pointer" value={f.start_time}
              onChange={(e) => setF((p) => ({ ...p, start_time: e.target.value }))} />
          </div>
          <div>
            <label className="label" htmlFor="ls-end">Tamat</label>
            <input id="ls-end" type="time" className="input cursor-pointer" value={f.end_time}
              onChange={(e) => setF((p) => ({ ...p, end_time: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="ls-note">Nota <span className="font-normal text-muted-fg">(optional)</span></label>
          <textarea id="ls-note" className="input resize-none" rows={2} value={f.note}
            onChange={(e) => setF((p) => ({ ...p, note: e.target.value }))} />
        </div>
        {error && (
          <p className="flex items-center gap-1.5 text-sm text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Enter / edit a live session's results (and mark complete). Same eight fields
 *  as an affiliate success live; ROI is auto-calculated (Gross Revenue / Spend). */
function LiveResultModal({
  open, session, onClose,
}: { open: boolean; session: LiveSession | null; onClose: () => void }) {
  const router = useRouter();
  const [f, setF] = useState({
    gmv: "", viewers: "", items_sold: "", duration_live: "",
    ads_budget: "", ad_spend: "", gross_revenue: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !session) return;
    const s = (v: number | null) => (v == null ? "" : String(v));
    setF({
      gmv: s(session.gmv), viewers: s(session.viewers), items_sold: s(session.items_sold),
      duration_live: session.duration_live || "", ads_budget: s(session.ads_budget),
      ad_spend: s(session.ad_spend), gross_revenue: s(session.gross_revenue),
    });
    setError("");
  }, [open, session]);

  // ROI = Gross Revenue / Spend, auto-calculated and shown read-only.
  // parseNum, not parseFloat: a typed "1,871.15" must not become 1.
  const spendN = parseNum(f.ad_spend);
  const grossN = parseNum(f.gross_revenue);
  const roi = Number.isFinite(spendN) && spendN > 0 && Number.isFinite(grossN)
    ? Math.round((grossN / spendN) * 100) / 100
    : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    // Every field is required before a live can move to Success.
    const need: [string, string][] = [
      ["gmv", "Total Sales"], ["viewers", "Viewers"], ["items_sold", "Items Sold"],
      ["duration_live", "Duration"], ["ads_budget", "Budget"], ["ad_spend", "Spend"],
      ["gross_revenue", "Gross Revenue"],
    ];
    for (const [k, label] of need)
      if (String((f as any)[k]).trim() === "") return setError(`Isi ${label}.`);

    setSaving(true); setError("");
    const res = await fetch(`/api/marketer/live-sessions/${session.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, roi, complete: true }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setError(data.error || "Save failed.");
    onClose(); router.refresh();
  }

  const field = (key: keyof typeof f, label: string, ph = "") => (
    <div>
      <label className="label">{label} <span className="text-danger">*</span></label>
      <input className="input" value={f[key]} inputMode="decimal" placeholder={ph} required
        onChange={(e) => setF((p) => ({ ...p, [key]: e.target.value }))} />
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title="Live Results">
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-muted-fg">
          {session ? `${session.live_user_name} · ${fmtDate(session.live_date)}` : ""}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {field("gmv", "Total Sales (RM)")}
          {field("viewers", "Viewers")}
          {field("items_sold", "Items Sold")}
          {field("duration_live", "Duration", "e.g. 2h 0m 25s")}
          {field("ads_budget", "Budget (RM)")}
          {field("ad_spend", "Spend (RM)")}
          {field("gross_revenue", "Gross Revenue (RM)")}
          <div>
            <label className="label">ROI <span className="font-normal text-muted-fg">(auto)</span></label>
            <input className="input bg-muted/40 font-semibold" value={roi != null ? roi : "—"} readOnly />
          </div>
        </div>
        {error && (
          <p className="flex items-center gap-1.5 text-sm text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
            Save results
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Attach / view / download an image on a live session (Pending + Success). */
function LiveAttachment({ session }: { session: LiveSession }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function upload(file: File | null) {
    if (!file) return;
    setBusy(true);
    const { file: out } = await compressScreenshot(file);
    const fd = new FormData();
    fd.append("image", out);
    await fetch(`/api/marketer/live-sessions/${session.id}/attachment`, { method: "POST", body: fd });
    setBusy(false);
    router.refresh();
  }
  async function remove() {
    if (!(await confirmDialog({ title: "Buang gambar?", danger: true }))) return;
    await fetch(`/api/marketer/live-sessions/${session.id}/attachment`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <>
      {session.attachment_path && (
        <>
          <a href={session.attachment_path} target="_blank" rel="noopener noreferrer" title="Lihat gambar"
            className="cursor-pointer rounded-lg p-2 text-muted-fg hover:bg-accent/10 hover:text-accent">
            <Eye className="h-4 w-4" aria-hidden="true" />
          </a>
          <a href={session.attachment_path} download title="Muat turun"
            className="cursor-pointer rounded-lg p-2 text-muted-fg hover:bg-accent/10 hover:text-accent">
            <Download className="h-4 w-4" aria-hidden="true" />
          </a>
          <button onClick={remove} title="Buang gambar"
            className="cursor-pointer rounded-lg p-2 text-muted-fg hover:bg-danger/10 hover:text-danger">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </>
      )}
      <label title={session.attachment_path ? "Tukar gambar" : "Lampir gambar"}
        className="cursor-pointer rounded-lg p-2 text-muted-fg hover:bg-accent/10 hover:text-accent">
        {busy
          ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
        <input type="file" accept="image/*" className="sr-only"
          onChange={(e) => upload(e.target.files?.[0] || null)} />
      </label>
    </>
  );
}

function LiveScheduleTab({
  sessions, liveUsers, kind,
}: { sessions: LiveSession[]; liveUsers: LiveUser[]; kind: "pending" | "success" }) {
  const canEdit = useCanEdit();
  const router = useRouter();
  const params = useSearchParams();
  const { from, to } = resolveRange(
    { from: params.get("from"), to: params.get("to"), all: params.get("all") },
    kind === "pending" ? "today" : "month"
  );
  const [brand, setBrand] = useState("");
  const [editing, setEditing] = useState<LiveSession | null>(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [result, setResult] = useState<LiveSession | null>(null);

  const wantStatus = kind === "pending" ? "pending" : "completed";
  const rows = sessions.filter((s) => {
    if (s.status !== wantStatus) return false;
    if (from && s.live_date < from) return false;
    if (to && s.live_date > to) return false;
    if (brand && String(s.brand_id ?? "") !== brand) return false;
    return true;
  });

  async function remove(s: LiveSession) {
    if (!(await confirmDialog({ title: "Padam live session ini?", danger: true }))) return;
    await fetch(`/api/marketer/live-sessions/${s.id}`, { method: "DELETE" });
    router.refresh();
  }

  const gmv = rows.reduce((a, r) => a + (r.gmv || 0), 0);
  const viewers = rows.reduce((a, r) => a + (r.viewers || 0), 0);
  const items = rows.reduce((a, r) => a + (r.items_sold || 0), 0);
  const budget = rows.reduce((a, r) => a + (r.ads_budget || 0), 0);
  const spend = rows.reduce((a, r) => a + (r.ad_spend || 0), 0);
  const gross = rows.reduce((a, r) => a + (r.gross_revenue || 0), 0);
  const duration = sumDurations(rows.map((r) => r.duration_live));
  const roi = spend > 0 ? Math.round((gross / spend) * 100) / 100 : null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="section-title">{kind === "pending" ? "Pending Live" : "Success Live"}</h2>
        {kind === "pending" && canEdit && (
          <button className="btn !py-2" onClick={() => { setEditing(null); setOpenAdd(true); }}
            disabled={liveUsers.length === 0}
            title={liveUsers.length === 0 ? "Tambah live user dahulu" : undefined}>
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />Add Live Session
          </button>
        )}
      </div>

      <DateRangeFilter count={rows.length} countNoun={["live", "live"]}
        defaultMode={kind === "pending" ? "today" : "month"} />
      <BrandFilterCard id={`live-${kind}-brand`} value={brand} onChange={setBrand} />

      {kind === "success" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Kpi Icon={CheckCircle2} label="Total Live" value={rows.length} />
          <Kpi Icon={TrendingUp} label="Total Sales" value={money(gmv)} fill="yellow" />
          <Kpi Icon={Users} label="Viewers" value={int(viewers)} />
          <Kpi Icon={ShoppingBag} label="Items Sold" value={int(items)} />
          <Kpi Icon={Timer} label="Duration" value={duration} />
          <Kpi Icon={Wallet} label="Budget" value={money(budget)} />
          <Kpi Icon={Wallet} label="Spend" value={money(spend)} fill="red" />
          <Kpi Icon={TrendingUp} label="Gross Revenue" value={money(gross)} fill="emerald" />
          <Kpi Icon={(roi ?? 0) >= 1 ? TrendingUp : TrendingDown} label="ROI" value={roi ?? "—"} />
        </div>
      )}

      {rows.length === 0 ? (
        <p className="card text-center text-sm text-muted-fg">
          {kind === "pending" ? "Tiada pending live dalam julat ini." : "Tiada success live dalam julat ini."}
        </p>
      ) : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted-fg">
              <tr>
                <th className="px-4 py-3 font-semibold">Live User</th>
                <th className="px-4 py-3 font-semibold">Brand</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Time</th>
                {kind === "success" ? (
                  <>
                    <th className="px-4 py-3 text-right font-semibold">Total Sales</th>
                    <th className="px-4 py-3 text-right font-semibold">Viewers</th>
                    <th className="px-4 py-3 text-right font-semibold">Items</th>
                    <th className="px-4 py-3 font-semibold">Duration</th>
                    <th className="px-4 py-3 text-right font-semibold">Budget</th>
                    <th className="px-4 py-3 text-right font-semibold">Spend</th>
                    <th className="px-4 py-3 text-right font-semibold">Gross</th>
                    <th className="px-4 py-3 text-right font-semibold">ROI</th>
                  </>
                ) : (
                  <th className="px-4 py-3 font-semibold">Nota</th>
                )}
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-t border-line/60 hover:bg-white/50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">{s.live_user_name}</div>
                    <span className={`chip mt-0.5 ${LIVE_TYPE_STYLE[s.user_type] || "bg-muted text-muted-fg"}`}>{s.user_type}</span>
                  </td>
                  <td className="px-4 py-3">
                    {s.brand_name
                      ? <span className="chip bg-primary/10 text-primary">{s.brand_name}</span>
                      : <span className="text-muted-fg/50">—</span>}
                  </td>
                  <td className="px-4 py-3 text-ink">{fmtDate(s.live_date)}</td>
                  <td className="px-4 py-3 text-muted-fg">{fmtTimeRange(s.start_time, s.end_time) || "—"}</td>
                  {kind === "success" ? (
                    <>
                      <td className="px-4 py-3 text-right font-semibold text-ink">{money(s.gmv)}</td>
                      <td className="px-4 py-3 text-right">{int(s.viewers)}</td>
                      <td className="px-4 py-3 text-right">{int(s.items_sold)}</td>
                      <td className="px-4 py-3 text-muted-fg">{s.duration_live || "—"}</td>
                      <td className="px-4 py-3 text-right">{money(s.ads_budget)}</td>
                      <td className="px-4 py-3 text-right">{money(s.ad_spend)}</td>
                      <td className="px-4 py-3 text-right">{money(s.gross_revenue)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-ink">{deriveRoi(s.ad_spend, s.gross_revenue, s.roi) ?? "—"}</td>
                    </>
                  ) : (
                    <td className="px-4 py-3 text-muted-fg">{s.note || "—"}</td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {kind === "pending" && canEdit && (
                        <button onClick={() => setResult(s)}
                          className="cursor-pointer rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-fg hover:opacity-90"
                          title="Masukkan result & tandakan siap">
                          Success
                        </button>
                      )}
                      <LiveAttachment session={s} />
                      {canEdit && (
                      <button onClick={() => (kind === "success" ? setResult(s) : (setEditing(s), setOpenAdd(true)))}
                        className="cursor-pointer rounded-lg p-2 text-muted-fg hover:bg-accent/10 hover:text-accent"
                        aria-label="Edit">
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      )}
                      {canEdit && (
                      <button onClick={() => remove(s)}
                        className="cursor-pointer rounded-lg p-2 text-muted-fg hover:bg-danger/10 hover:text-danger"
                        aria-label="Delete">
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <LiveSessionModal open={openAdd} session={editing} liveUsers={liveUsers} onClose={() => setOpenAdd(false)} />
      <LiveResultModal open={!!result} session={result} onClose={() => setResult(null)} />
    </>
  );
}

function LiveReportingTab({ sessions, liveUsers }: { sessions: LiveSession[]; liveUsers: LiveUser[] }) {
  const canEdit = useCanEdit();
  const params = useSearchParams();
  const { from, to } = resolveRange(
    { from: params.get("from"), to: params.get("to"), all: params.get("all") },
    "month"
  );
  const [brand, setBrand] = useState("");

  const done = sessions.filter((s) => {
    if (s.status !== "completed") return false;
    if (from && s.live_date < from) return false;
    if (to && s.live_date > to) return false;
    if (brand && String(s.brand_id ?? "") !== brand) return false;
    return true;
  });

  // Aggregate per live user.
  type Agg = { u: LiveUser; lives: number; gmv: number; budget: number; spend: number; gross: number; viewers: number; items: number; durs: (string | null)[] };
  const byUser = new Map<number, Agg>();
  for (const u of liveUsers) byUser.set(u.id, { u, lives: 0, gmv: 0, budget: 0, spend: 0, gross: 0, viewers: 0, items: 0, durs: [] });
  for (const s of done) {
    const row = byUser.get(s.live_user_id);
    if (!row) continue;
    row.lives += 1;
    row.gmv += s.gmv || 0;
    row.budget += s.ads_budget || 0;
    row.spend += s.ad_spend || 0;
    row.gross += s.gross_revenue || 0;
    row.viewers += s.viewers || 0;
    row.items += s.items_sold || 0;
    row.durs.push(s.duration_live);
  }
  const rows = [...byUser.values()].filter((r) => r.lives > 0).sort((a, b) => b.gmv - a.gmv);

  const tGmv = rows.reduce((a, r) => a + r.gmv, 0);
  const tSpend = rows.reduce((a, r) => a + r.spend, 0);
  const tGross = rows.reduce((a, r) => a + r.gross, 0);
  const tViewers = rows.reduce((a, r) => a + r.viewers, 0);
  const tItems = rows.reduce((a, r) => a + r.items, 0);
  const tLives = rows.reduce((a, r) => a + r.lives, 0);
  const tDuration = sumDurations(rows.flatMap((r) => r.durs));
  const tRoi = tSpend > 0 ? Math.round((tGross / tSpend) * 100) / 100 : null;

  return (
    <>
      <h2 className="section-title">Reporting Live User</h2>
      <DateRangeFilter count={tLives} countNoun={["live", "live"]} defaultMode="month" />
      <BrandFilterCard id="live-report-brand" value={brand} onChange={setBrand} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi Icon={Users} label="Live Users" value={rows.length} />
        <Kpi Icon={CheckCircle2} label="Total Live" value={tLives} />
        <Kpi Icon={TrendingUp} label="Total Sales" value={money(tGmv)} fill="yellow" />
        <Kpi Icon={Users} label="Viewers" value={int(tViewers)} />
        <Kpi Icon={ShoppingBag} label="Items Sold" value={int(tItems)} />
        <Kpi Icon={Timer} label="Duration" value={tDuration} />
        <Kpi Icon={Wallet} label="Spend" value={money(tSpend)} fill="red" />
        <Kpi Icon={TrendingUp} label="Gross Revenue" value={money(tGross)} fill="emerald" />
        <Kpi Icon={(tRoi ?? 0) >= 1 ? TrendingUp : TrendingDown} label="ROI" value={tRoi ?? "—"} />
      </div>

      {rows.length === 0 ? (
        <p className="card text-center text-sm text-muted-fg">
          Tiada success live dalam julat ini.
        </p>
      ) : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[1040px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted-fg">
              <tr>
                <th className="px-4 py-3 font-semibold">Live User</th>
                <th className="px-4 py-3 font-semibold">Jenis</th>
                <th className="px-4 py-3 text-right font-semibold">Total Live</th>
                <th className="px-4 py-3 text-right font-semibold">Total Sales</th>
                <th className="px-4 py-3 text-right font-semibold">Viewers</th>
                <th className="px-4 py-3 text-right font-semibold">Items</th>
                <th className="px-4 py-3 font-semibold">Duration</th>
                <th className="px-4 py-3 text-right font-semibold">Spend</th>
                <th className="px-4 py-3 text-right font-semibold">Gross Revenue</th>
                <th className="px-4 py-3 text-right font-semibold">ROI</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const roi = r.spend > 0 ? Math.round((r.gross / r.spend) * 100) / 100 : null;
                return (
                  <tr key={r.u.id} className="border-t border-line/60 hover:bg-white/50">
                    <td className="px-4 py-3 font-semibold text-ink">{r.u.name}</td>
                    <td className="px-4 py-3">
                      <span className={`chip ${LIVE_TYPE_STYLE[r.u.user_type] || "bg-muted text-muted-fg"}`}>{r.u.user_type}</span>
                    </td>
                    <td className="px-4 py-3 text-right">{r.lives}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">{money(r.gmv)}</td>
                    <td className="px-4 py-3 text-right">{int(r.viewers)}</td>
                    <td className="px-4 py-3 text-right">{int(r.items)}</td>
                    <td className="px-4 py-3 text-muted-fg">{sumDurations(r.durs)}</td>
                    <td className="px-4 py-3 text-right">{money(r.spend)}</td>
                    <td className="px-4 py-3 text-right">{money(r.gross)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">{roi ?? "—"}</td>
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

/* ── Data Quality ──────────────────────────────────────── */

/**
 * Import Data Quality from a TikTok creative-data xlsx: videos are counted by
 * lifecycle status (and Explored ones by secondary status) and ADDED to the
 * day's brand-level row. Upload as many files as needed; fix mistakes from the
 * table below (edit or delete the row).
 */
function DataQualityImport() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [date, setDate] = useState("");
  const [brand, setBrand] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    if (!file) return setError("Pilih fail .xlsx.");
    if (!brand) return setError("Pilih brand.");
    if (!date) return setError("Pilih tarikh.");
    setBusy(true); setError(""); setMsg("");
    const fd = new FormData();
    fd.append("file", file); fd.append("report_date", date); fd.append("brand_id", brand);
    const res = await fetch("/api/marketer/data-quality/import", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Import gagal");
    setMsg(`${data.videos} video diproses`);
    setFile(null); router.refresh();
  }

  return (
    <div className="card space-y-3">
      <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
        <FileSpreadsheet className="h-4 w-4 text-primary" aria-hidden="true" />
        Import Creative Data → Data Quality (video status)
      </p>
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-fg">Required columns</p>
        <div className="flex flex-wrap gap-1.5">
          {["Creative type", "Status", "Exploration secondary status"].map((c) => (
            <span key={c} className="rounded-md border border-line bg-white/70 px-2 py-1 font-mono text-[11px] text-ink">{c}</span>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-muted-fg">
          TikTok Ads → <b>creative data for product campaigns</b>. Setiap video dikira ikut status (In queue/Learning/Delivering/Exploring/Explored) &amp; Outstanding/Performing. Setiap upload <b>ditambah</b> pada rekod harian brand itu.
        </p>
        <a href="/examples/creative-data-quality-sample.xlsx" download
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline">
          <FileSpreadsheet className="h-3 w-3" aria-hidden="true" /> Muat turun contoh .xlsx
        </a>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px]">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg">Brand</label>
          <BrandSelect id="dq-import-brand" value={brand} onChange={setBrand} className="!py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg">Report date</label>
          <input type="date" className="input cursor-pointer !py-2 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
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

function DataQualityTab({ rows: all }: { rows: DataQuality[] }) {
  const canEdit = useCanEdit();
  const router = useRouter();
  const params = useSearchParams();
  const { from, to } = resolveRange(
    { from: params.get("from"), to: params.get("to"), all: params.get("all") },
    "month"
  );
  const [filterBrand, setFilterBrand] = useState("");
  const unsorted = all.filter((r) => {
    if (from && r.report_date < from) return false;
    if (to && r.report_date > to) return false;
    if (filterBrand && String(r.brand_id ?? "") !== filterBrand) return false;
    return true;
  });
  const { sorted: rows, sort, toggleSort } = useTableSort(unsorted);

  // Entry form (also edits a row in place).
  const empty = { date: "", brand: "", product: "", inque: "", learning: "", delivering: "", exploring: "", explored: "", outstanding: "", performing: "" };
  const [f, setF] = useState(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [productList, setProductList] = useState<{ id: number; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  // Product dropdown follows the chosen brand. It only fetches here — clearing
  // the product on a user brand-change is done in the select's onChange, so
  // loading a row for edit can set brand + product together without a race.
  useEffect(() => {
    if (!f.brand) { setProductList([]); return; }
    fetch(`/api/products?brand=${f.brand}`)
      .then((r) => r.json())
      .then((d) => setProductList(d.products || []))
      .catch(() => setProductList([]));
  }, [f.brand]);

  function reset() { setF(empty); setEditId(null); setError(""); setMsg(""); }
  function loadEdit(r: DataQuality) {
    setF({
      date: r.report_date, brand: r.brand_id != null ? String(r.brand_id) : "",
      product: r.product_id != null ? String(r.product_id) : "",
      inque: String(r.inque ?? ""), learning: String(r.learning ?? ""), delivering: String(r.delivering ?? ""),
      exploring: String(r.exploring ?? ""), explored: String(r.explored ?? ""),
      outstanding: String(r.outstanding ?? ""), performing: String(r.performing ?? ""),
    });
    setEditId(r.id); setError(""); setMsg("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.date) return setError("Pilih tarikh.");
    if (!f.brand) return setError("Pilih brand.");
    if (!f.product) return setError("Pilih product.");
    if (f.inque === "" || f.learning === "" || f.delivering === ""
        || f.exploring === "" || f.explored === "" || f.outstanding === "" || f.performing === "")
      return setError("Isi semua nombor.");
    setBusy(true); setError(""); setMsg("");
    const res = await fetch(
      editId ? `/api/marketer/data-quality/${editId}` : "/api/marketer/data-quality",
      {
        method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_date: f.date, brand_id: f.brand, product_id: f.product,
          inque: f.inque, learning: f.learning, delivering: f.delivering,
          exploring: f.exploring, explored: f.explored, outstanding: f.outstanding, performing: f.performing,
        }),
      }
    );
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || "Gagal simpan.");
    setMsg(editId ? "Dikemas kini" : "Disimpan");
    reset();
    router.refresh();
  }

  async function remove(r: DataQuality) {
    if (!(await confirmDialog({ title: "Padam rekod ini?", danger: true }))) return;
    await fetch(`/api/marketer/data-quality/${r.id}`, { method: "DELETE" });
    if (editId === r.id) reset();
    router.refresh();
  }

  const dsum = (k: keyof DataQuality) => rows.reduce((s, r) => s + ((r[k] as number) || 0), 0);
  const inque = dsum("inque"), learning = dsum("learning"), delivering = dsum("delivering");
  const exploring = dsum("exploring"), explored = dsum("explored");
  const outstanding = dsum("outstanding"), performing = dsum("performing");
  const total = inque + learning + delivering;

  const page = getPage(params.get("page"));
  const pageRows = paginate(rows, page, 20);

  return (
    <>
      {canEdit ? <DataQualityImport /> : <ReadOnlyHint />}
      {canEdit && (
      <form onSubmit={submit} className="card space-y-3">
        <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
          <ListChecks className="h-4 w-4 text-primary" aria-hidden="true" />
          {editId ? "Kemas kini video status" : "Data Quality — key in video status"}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Tarikh</label>
            <input type="date" className="input cursor-pointer" value={f.date} required
              onChange={(e) => setF((p) => ({ ...p, date: e.target.value }))} />
          </div>
          <div>
            <label className="label">Brand</label>
            <BrandSelect id="dq-brand" value={f.brand}
              onChange={(v) => setF((p) => ({ ...p, brand: v, product: "" }))} />
          </div>
          <div>
            <label className="label">Product</label>
            <select className="input cursor-pointer" value={f.product} required disabled={!f.brand}
              onChange={(e) => setF((p) => ({ ...p, product: e.target.value }))}>
              <option value="">{f.brand ? "— Pilih product —" : "Pilih brand dahulu"}</option>
              {productList.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Inque</label>
            <input type="number" min={0} className="input" value={f.inque} required placeholder="0"
              onChange={(e) => setF((p) => ({ ...p, inque: e.target.value }))} />
          </div>
          <div>
            <label className="label">Learning</label>
            <input type="number" min={0} className="input" value={f.learning} required placeholder="0"
              onChange={(e) => setF((p) => ({ ...p, learning: e.target.value }))} />
          </div>
          <div>
            <label className="label">Delivering</label>
            <input type="number" min={0} className="input" value={f.delivering} required placeholder="0"
              onChange={(e) => setF((p) => ({ ...p, delivering: e.target.value }))} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="label">Exploring</label>
            <input type="number" min={0} className="input" value={f.exploring} required placeholder="0"
              onChange={(e) => setF((p) => ({ ...p, exploring: e.target.value }))} />
          </div>
          <div>
            <label className="label">Explored</label>
            <input type="number" min={0} className="input" value={f.explored} required placeholder="0"
              onChange={(e) => setF((p) => ({ ...p, explored: e.target.value }))} />
          </div>
          <div>
            <label className="label">Outstanding</label>
            <input type="number" min={0} className="input" value={f.outstanding} required placeholder="0"
              onChange={(e) => setF((p) => ({ ...p, outstanding: e.target.value }))} />
          </div>
          <div>
            <label className="label">Performing</label>
            <input type="number" min={0} className="input" value={f.performing} required placeholder="0"
              onChange={(e) => setF((p) => ({ ...p, performing: e.target.value }))} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn !py-2.5" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
            {editId ? "Update" : "Submit"}
          </button>
          {editId && <button type="button" className="btn-ghost !py-2" onClick={reset}>Batal</button>}
          <p className="text-[11px] text-muted-fg">Key in brand + product + tarikh yang sama untuk kemas kini rekod itu.</p>
          {msg && <span className="text-xs font-medium text-emerald-600">{msg}</span>}
          {error && <span className="text-xs text-danger">{error}</span>}
        </div>
      </form>
      )}

      <DateRangeFilter count={rows.length} countNoun={["rekod", "rekod"]} defaultMode="month" />
      <BrandFilterCard id="dq-filter-brand" value={filterBrand} onChange={setFilterBrand} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi Icon={ListChecks} label="Total Video" value={int(total)} fill="yellow" />
        <Kpi Icon={Clock} label="Total Video Inque" value={int(inque)} />
        <Kpi Icon={Boxes} label="Total Video Learning" value={int(learning)} />
        <Kpi Icon={Send} label="Total Video Delivering" value={int(delivering)} fill="emerald" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi Icon={Eye} label="Exploring" value={int(exploring)} />
        <Kpi Icon={CheckCircle2} label="Explored" value={int(explored)} />
        <Kpi Icon={TrendingUp} label="Outstanding" value={int(outstanding)} fill="yellow" />
        <Kpi Icon={TrendingUp} label="Performing" value={int(performing)} fill="emerald" />
      </div>

      {rows.length === 0 ? (
        <p className="card text-center text-sm text-muted-fg">
          Tiada rekod dalam julat ini. Key in di atas.
        </p>
      ) : (
        <>
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted-fg">
                <tr>
                  <th className="px-4 py-3 font-semibold">No</th>
                  <SortTh k="brand_name" sort={sort} on={toggleSort}>Brand</SortTh>
                  <SortTh k="report_date" sort={sort} on={toggleSort}>Date</SortTh>
                  <SortTh k="product_name" sort={sort} on={toggleSort}>Product</SortTh>
                  <SortTh k="inque" sort={sort} on={toggleSort} right>Inque</SortTh>
                  <SortTh k="learning" sort={sort} on={toggleSort} right>Learning</SortTh>
                  <SortTh k="delivering" sort={sort} on={toggleSort} right>Delivering</SortTh>
                  <SortTh k="exploring" sort={sort} on={toggleSort} right>Exploring</SortTh>
                  <SortTh k="explored" sort={sort} on={toggleSort} right>Explored</SortTh>
                  <SortTh k="outstanding" sort={sort} on={toggleSort} right>Outstanding</SortTh>
                  <SortTh k="performing" sort={sort} on={toggleSort} right>Performing</SortTh>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => (
                  <tr key={r.id} className={`border-t border-line/60 hover:bg-white/50 ${editId === r.id ? "bg-primary/5" : ""}`}>
                    <td className="px-4 py-3 text-muted-fg">{(page - 1) * 20 + i + 1}</td>
                    <td className="px-4 py-3">
                      {r.brand_name
                        ? <span className="chip bg-primary/10 text-primary">{r.brand_name}</span>
                        : <span className="text-muted-fg/50">—</span>}
                    </td>
                    <td className="px-4 py-3 text-ink">{fmtDMY(r.report_date)}</td>
                    <td className="px-4 py-3 text-ink">{r.product_name || "—"}</td>
                    <td className="px-4 py-3 text-right">{int(r.inque)}</td>
                    <td className="px-4 py-3 text-right">{int(r.learning)}</td>
                    <td className="px-4 py-3 text-right">{int(r.delivering)}</td>
                    <td className="px-4 py-3 text-right">{int(r.exploring)}</td>
                    <td className="px-4 py-3 text-right">{int(r.explored)}</td>
                    <td className="px-4 py-3 text-right">{int(r.outstanding)}</td>
                    <td className="px-4 py-3 text-right">{int(r.performing)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">{int((r.inque || 0) + (r.learning || 0) + (r.delivering || 0))}</td>
                    <td className="px-4 py-3">
                      {canEdit && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => loadEdit(r)}
                          className="cursor-pointer rounded-lg p-2 text-muted-fg hover:bg-accent/10 hover:text-accent"
                          aria-label="Edit"><Pencil className="h-4 w-4" aria-hidden="true" /></button>
                        <button onClick={() => remove(r)}
                          className="cursor-pointer rounded-lg p-2 text-muted-fg hover:bg-danger/10 hover:text-danger"
                          aria-label="Delete"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                      </div>
                      )}
                    </td>
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

/* ── Spend (TTAM + GMV combined) ────────────────────────── */

type SpendRow = {
  key: string; brand_id: number | null; brand_name: string | null; report_date: string;
  ttmId: number | null; ttmCost: number; ttmGross: number; gmvCost: number; gmvGross: number;
  totalCost: number; totalGross: number;
};

function SpendTab({ spendTtm, salesLive, salesProduct, salesCard }: {
  spendTtm: SpendTtm[]; salesLive: SalesLive[]; salesProduct: SalesProduct[]; salesCard: SalesCard[];
}) {
  const canEdit = useCanEdit();
  const router = useRouter();
  const params = useSearchParams();
  const { from, to } = resolveRange(
    { from: params.get("from"), to: params.get("to"), all: params.get("all") }, "month"
  );
  const [filterBrand, setFilterBrand] = useState("");

  // TTAM entry form (also edits a TTAM row for a given brand + date).
  const empty = { report_date: "", brand: "", ttm_cost: "", ttm_gross_revenue: "" };
  const [f, setF] = useState(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  function reset() { setF(empty); setEditId(null); setError(""); setMsg(""); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.report_date) return setError("Pilih tarikh.");
    if (!f.brand) return setError("Pilih brand.");
    if (f.ttm_cost === "" || f.ttm_gross_revenue === "")
      return setError("Isi TTAM Cost dan TTAM Gross Revenue.");
    setBusy(true); setError(""); setMsg("");
    const res = await fetch("/api/marketer/spend", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        report_date: f.report_date, brand_id: f.brand,
        ttm_cost: f.ttm_cost, ttm_gross_revenue: f.ttm_gross_revenue,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || "Gagal simpan.");
    setMsg(editId ? "Dikemas kini" : "Disimpan");
    reset();
    router.refresh();
  }

  function loadEdit(r: SpendRow) {
    setF({
      report_date: r.report_date, brand: r.brand_id != null ? String(r.brand_id) : "",
      ttm_cost: r.ttmId != null ? String(r.ttmCost) : "",
      ttm_gross_revenue: r.ttmId != null ? String(r.ttmGross) : "",
    });
    setEditId(r.ttmId); setError(""); setMsg("");
  }

  async function removeTtm(r: SpendRow) {
    if (r.ttmId == null) return;
    if (!(await confirmDialog({ title: "Padam TTAM untuk hari ini?", danger: true }))) return;
    await fetch(`/api/marketer/spend/${r.ttmId}`, { method: "DELETE" });
    if (editId === r.ttmId) reset();
    router.refresh();
  }

  // Combine TTAM + Live + Product + Card per (brand, date).
  const map = new Map<string, SpendRow>();
  const K = (b: number | null, d: string) => `${b ?? 0}|${d}`;
  const ensure = (b: number | null, name: string | null, d: string) => {
    const k = K(b, d);
    if (!map.has(k)) map.set(k, {
      key: k, brand_id: b, brand_name: name, report_date: d,
      ttmId: null, ttmCost: 0, ttmGross: 0, gmvCost: 0, gmvGross: 0, totalCost: 0, totalGross: 0,
    });
    return map.get(k)!;
  };
  for (const t of spendTtm) { const o = ensure(t.brand_id, t.brand_name, t.report_date); o.ttmId = t.id; o.ttmCost += t.ttm_cost || 0; o.ttmGross += t.ttm_gross_revenue || 0; }
  for (const s of salesLive) { const o = ensure(s.brand_id, s.brand_name, s.report_date); o.gmvCost += s.cost || 0; o.gmvGross += s.gross_revenue || 0; }
  for (const s of salesProduct) { const o = ensure(s.brand_id, s.brand_name, s.report_date); o.gmvCost += s.cost || 0; o.gmvGross += s.gross_revenue || 0; }
  for (const s of salesCard) { const o = ensure(s.brand_id, s.brand_name, s.report_date); o.gmvCost += s.cost || 0; o.gmvGross += s.gross_revenue || 0; }

  const unsorted = [...map.values()]
    .map((o) => ({ ...o, totalCost: o.ttmCost + o.gmvCost, totalGross: o.ttmGross + o.gmvGross }))
    .filter((o) => {
      if (from && o.report_date < from) return false;
      if (to && o.report_date > to) return false;
      if (filterBrand && String(o.brand_id ?? "") !== filterBrand) return false;
      return true;
    });
  const { sorted: rows, sort, toggleSort } = useTableSort(unsorted);

  const sum = (k: keyof SpendRow) => rows.reduce((s, r) => s + (r[k] as number), 0);
  const tTotalCost = sum("totalCost"), tTotalGross = sum("totalGross");
  const tTtmCost = sum("ttmCost"), tTtmGross = sum("ttmGross");
  const tGmvCost = sum("gmvCost"), tGmvGross = sum("gmvGross");

  const page = getPage(params.get("page"));
  const pageRows = paginate(rows, page, 20);

  return (
    <>
      {canEdit && (
      <form onSubmit={submit} className="card space-y-3">
        <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
          <Wallet className="h-4 w-4 text-primary" aria-hidden="true" />
          {editId ? "Kemas kini TTAM" : "Spend — key in TTAM"}
        </p>
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="label">Tarikh</label>
            <input type="date" className="input cursor-pointer" value={f.report_date} required
              onChange={(e) => setF((p) => ({ ...p, report_date: e.target.value }))} />
          </div>
          <div>
            <label className="label">Brand</label>
            <BrandSelect id="spend-brand" value={f.brand} onChange={(v) => setF((p) => ({ ...p, brand: v }))} />
          </div>
          <div>
            <label className="label">TTAM Cost (RM)</label>
            <input className="input" inputMode="decimal" value={f.ttm_cost} required placeholder="0"
              onChange={(e) => setF((p) => ({ ...p, ttm_cost: e.target.value }))} />
          </div>
          <div>
            <label className="label">TTAM Gross Revenue (RM)</label>
            <input className="input" inputMode="decimal" value={f.ttm_gross_revenue} required placeholder="0"
              onChange={(e) => setF((p) => ({ ...p, ttm_gross_revenue: e.target.value }))} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn !py-2.5" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
            {editId ? "Update TTAM" : "Submit"}
          </button>
          {editId && <button type="button" className="btn-ghost !py-2" onClick={reset}>Batal</button>}
          <p className="text-[11px] text-muted-fg">GMV (Live + Product + Card) ditarik automatik ikut brand + tarikh.</p>
          {msg && <span className="text-xs font-medium text-emerald-600">{msg}</span>}
          {error && <span className="text-xs text-danger">{error}</span>}
        </div>
      </form>
      )}

      <DateRangeFilter count={rows.length} countNoun={["day", "days"]} defaultMode="month" />
      <BrandFilterCard id="spend-filter-brand" value={filterBrand} onChange={setFilterBrand} />

      <div className="grid grid-cols-2 gap-3">
        <Kpi Icon={Wallet} label="Total Cost" value={money(tTotalCost)} fill="red" />
        <Kpi Icon={TrendingUp} label="Total Gross Revenue" value={money(tTotalGross)} fill="emerald" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi Icon={Wallet} label="Total Cost TTAM" value={money(tTtmCost)} />
        <Kpi Icon={TrendingUp} label="Total Gross Revenue TTAM" value={money(tTtmGross)} />
        <Kpi Icon={Wallet} label="Total Cost GMV" value={money(tGmvCost)} />
        <Kpi Icon={TrendingUp} label="Total Gross Revenue GMV" value={money(tGmvGross)} />
      </div>

      {rows.length === 0 ? (
        <p className="card text-center text-sm text-muted-fg">
          Tiada data dalam julat ini. Key in TTAM di atas, atau import Live / Product / Card.
        </p>
      ) : (
        <>
          <div className="glass overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted-fg">
                <tr>
                  <SortTh k="report_date" sort={sort} on={toggleSort}>Date</SortTh>
                  <SortTh k="brand_name" sort={sort} on={toggleSort}>Brand</SortTh>
                  <SortTh k="totalCost" sort={sort} on={toggleSort} right>Total Cost</SortTh>
                  <SortTh k="totalGross" sort={sort} on={toggleSort} right>Total Gross Rev</SortTh>
                  <SortTh k="ttmCost" sort={sort} on={toggleSort} right>Cost TTAM</SortTh>
                  <SortTh k="ttmGross" sort={sort} on={toggleSort} right>Gross Rev TTAM</SortTh>
                  <SortTh k="gmvCost" sort={sort} on={toggleSort} right>Cost GMV</SortTh>
                  <SortTh k="gmvGross" sort={sort} on={toggleSort} right>Gross Rev GMV</SortTh>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.key} className={`border-t border-line/60 hover:bg-white/50 ${editId != null && editId === r.ttmId ? "bg-primary/5" : ""}`}>
                    <td className="px-4 py-3 text-ink">{fmtDMY(r.report_date)}</td>
                    <td className="px-4 py-3">{r.brand_name ? <span className="chip bg-primary/10 text-primary">{r.brand_name}</span> : <span className="text-muted-fg/50">—</span>}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">{money(r.totalCost)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">{money(r.totalGross)}</td>
                    <td className="px-4 py-3 text-right">{money(r.ttmCost)}</td>
                    <td className="px-4 py-3 text-right">{money(r.ttmGross)}</td>
                    <td className="px-4 py-3 text-right">{money(r.gmvCost)}</td>
                    <td className="px-4 py-3 text-right">{money(r.gmvGross)}</td>
                    <td className="px-4 py-3">
                      {canEdit && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => loadEdit(r)} title="Edit TTAM"
                          className="cursor-pointer rounded-lg p-2 text-muted-fg hover:bg-accent/10 hover:text-accent"
                          aria-label="Edit TTAM"><Pencil className="h-4 w-4" aria-hidden="true" /></button>
                        <button onClick={() => removeTtm(r)} disabled={r.ttmId == null} title={r.ttmId == null ? "Tiada TTAM" : "Delete TTAM"}
                          className="cursor-pointer rounded-lg p-2 text-muted-fg hover:bg-danger/10 hover:text-danger disabled:opacity-30"
                          aria-label="Delete TTAM"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                      </div>
                      )}
                    </td>
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

/* ── Reporting Sheet (per-time-slot daily live sheet) ──── */

// Twelve 2-hour blocks covering the full 24 hours, starting 12 AM. Six slots
// per block for the lives run in that window.
const RS_SESSIONS: { sesi: string; slots: string[] }[] = [
  { sesi: "12.00 AM - 2.00 AM", slots: ["12.1", "12.2", "12.3", "12.4", "12.5", "12.6"] },
  { sesi: "2.00 AM - 4.00 AM", slots: ["2.1", "2.2", "2.3", "2.4", "2.5", "2.6"] },
  { sesi: "4.00 AM - 6.00 AM", slots: ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6"] },
  { sesi: "6.00 AM - 8.00 AM", slots: ["6.1", "6.2", "6.3", "6.4", "6.5", "6.6"] },
  { sesi: "8.00 AM - 10.00 AM", slots: ["8.1", "8.2", "8.3", "8.4", "8.5", "8.6"] },
  { sesi: "10.00 AM - 12.00 PM", slots: ["10.1", "10.2", "10.3", "10.4", "10.5", "10.6"] },
  { sesi: "12.00 PM - 2.00 PM", slots: ["12.1", "12.2", "12.3", "12.4", "12.5", "12.6"] },
  { sesi: "2.00 PM - 4.00 PM", slots: ["2.1", "2.2", "2.3", "2.4", "2.5", "2.6"] },
  { sesi: "4.00 PM - 6.00 PM", slots: ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6"] },
  { sesi: "6.00 PM - 8.00 PM", slots: ["6.1", "6.2", "6.3", "6.4", "6.5", "6.6"] },
  { sesi: "8.00 PM - 10.00 PM", slots: ["8.1", "8.2", "8.3", "8.4", "8.5", "8.6"] },
  { sesi: "10.00 PM - 12.00 AM", slots: ["10.1", "10.2", "10.3", "10.4", "10.5", "10.6"] },
];
const RS_SLOTS: { ord: number; sesi: string; masa: string; first: boolean; span: number }[] = (() => {
  let ord = 0; const out: any[] = [];
  for (const s of RS_SESSIONS) s.slots.forEach((m, i) =>
    out.push({ ord: ord++, sesi: s.sesi, masa: m, first: i === 0, span: s.slots.length }));
  return out;
})();
const RS_FIELDS = ["c_viewers", "r_target", "g_revenue", "cost", "v_boost", "cv_boost", "d_time"] as const;
type RsCell = Record<(typeof RS_FIELDS)[number], string>;

function ReportingSheetTab({ rows: all, userName }: { rows: ReportingSheetRow[]; userName: string }) {
  const canEdit = useCanEdit();
  const router = useRouter();
  const params = useSearchParams();
  const { from, to } = resolveRange(
    { from: params.get("from"), to: params.get("to"), all: params.get("all") }, "month"
  );
  const [filterBrand, setFilterBrand] = useState("");

  // Sheet editor: a chosen brand + date, and the grid of slot values.
  const [date, setDate] = useState("");
  const [brand, setBrand] = useState("");
  const [grid, setGrid] = useState<Record<number, RsCell>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  // Load the chosen day's rows into the grid.
  useEffect(() => {
    const g: Record<number, RsCell> = {};
    if (date && brand) {
      const s = (v: any) => (v == null ? "" : String(v));
      for (const r of all) {
        if (r.report_date === date && String(r.brand_id ?? "") === brand) {
          g[r.ord] = {
            c_viewers: s(r.c_viewers), r_target: s(r.r_target), g_revenue: s(r.g_revenue),
            cost: s(r.cost), v_boost: s(r.v_boost), cv_boost: s(r.cv_boost), d_time: r.d_time || "",
          };
        }
      }
    }
    setGrid(g); setMsg(""); setError("");
  }, [date, brand, all]);

  const cell = (ord: number): RsCell =>
    grid[ord] || { c_viewers: "", r_target: "", g_revenue: "", cost: "", v_boost: "", cv_boost: "", d_time: "" };
  const setCell = (ord: number, field: string, val: string) =>
    setGrid((p) => ({ ...p, [ord]: { ...cell(ord), [field]: val } }));

  async function save() {
    if (!date) return setError("Pilih tarikh.");
    if (!brand) return setError("Pilih brand.");
    setBusy(true); setError(""); setMsg("");
    const payloadRows = RS_SLOTS.map((s) => ({ ord: s.ord, sesi: s.sesi, masa: s.masa, ...cell(s.ord) }));
    const res = await fetch("/api/marketer/reporting-sheet", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report_date: date, brand_id: brand, rows: payloadRows }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || "Gagal simpan.");
    setMsg(`Disimpan (${data.saved} slot)`);
    router.refresh();
  }

  // ── Daily aggregates (summary box + reporting table) ──
  const map = new Map<string, any>();
  const K = (b: number | null, d: string) => `${b ?? 0}|${d}`;
  for (const r of all) {
    const k = K(r.brand_id, r.report_date);
    if (!map.has(k)) map.set(k, {
      key: k, brand_id: r.brand_id, brand_name: r.brand_name, report_date: r.report_date,
      c_viewers: 0, r_target: 0, g_revenue: 0, cost: 0, v_boost: 0, cv_boost: 0, durs: [] as (string | null)[],
    });
    const o = map.get(k);
    o.c_viewers += r.c_viewers || 0; o.r_target += r.r_target || 0; o.g_revenue += r.g_revenue || 0;
    o.cost += r.cost || 0; o.v_boost += r.v_boost || 0; o.cv_boost += r.cv_boost || 0; o.durs.push(r.d_time);
  }
  const daily = [...map.values()].filter((o) => {
    if (from && o.report_date < from) return false;
    if (to && o.report_date > to) return false;
    if (filterBrand && String(o.brand_id ?? "") !== filterBrand) return false;
    return true;
  }).sort((a, b) => (a.report_date < b.report_date ? 1 : a.report_date > b.report_date ? -1 : 0));

  const sum = (k: string) => daily.reduce((s, r) => s + (r[k] || 0), 0);
  const tViewers = sum("c_viewers"), tTarget = sum("r_target"), tGross = sum("g_revenue");
  const tCost = sum("cost"), tVBoost = sum("v_boost"), tCVBoost = sum("cv_boost");
  const tRoi = tCost > 0 ? Math.round((tGross / tCost) * 100) / 100 : null;

  async function editDay(o: any) {
    setBrand(o.brand_id != null ? String(o.brand_id) : "");
    setDate(o.report_date);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function removeDay(o: any) {
    if (!(await confirmDialog({ title: "Padam sheet hari ini?", danger: true, text: "Semua slot untuk brand + tarikh ini akan dipadam." }))) return;
    await fetch("/api/marketer/reporting-sheet", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report_date: o.report_date, brand_id: o.brand_id }),
    });
    if (o.report_date === date && String(o.brand_id ?? "") === brand) { setDate(""); setBrand(""); }
    router.refresh();
  }

  const roiOf = (g: string, c: string) => {
    const gg = parseNum(g), cc = parseNum(c);
    return cc > 0 && Number.isFinite(gg) ? Math.round((gg / cc) * 100) / 100 : "";
  };

  return (
    <>
      {/* Sheet header + grid editor */}
      <div className="card space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Brand</label>
            <BrandSelect id="rs-brand" value={brand} onChange={setBrand} />
          </div>
          <div>
            <label className="label">Tarikh</label>
            <input type="date" className="input cursor-pointer" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="pb-1 text-xs text-muted-fg">
            Nama Marketer: <b className="text-ink">{userName}</b> · 24 jam (setiap 2 jam)
          </div>
          <button className="btn !py-2.5" onClick={save} disabled={busy || !date || !brand}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
            Save Sheet
          </button>
          {msg && <span className="text-xs font-medium text-emerald-600">{msg}</span>}
          {error && <span className="text-xs text-danger">{error}</span>}
        </div>

        {!date || !brand ? (
          <p className="text-sm text-muted-fg">Pilih brand + tarikh untuk key in sheet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[900px] text-xs">
              <thead className="bg-amber-100 text-left uppercase tracking-wide text-ink">
                <tr>
                  <th className="px-2 py-2 font-bold">Sesi</th>
                  <th className="px-2 py-2 font-bold">Masa</th>
                  <th className="px-2 py-2 font-bold">C.Viewers</th>
                  <th className="px-2 py-2 font-bold">R.Target</th>
                  <th className="px-2 py-2 font-bold">G.Revenue</th>
                  <th className="px-2 py-2 font-bold">Cost</th>
                  <th className="px-2 py-2 font-bold">ROI</th>
                  <th className="px-2 py-2 font-bold">V.Boost</th>
                  <th className="px-2 py-2 font-bold">C.V.Boost</th>
                  <th className="px-2 py-2 font-bold">D.Time</th>
                </tr>
              </thead>
              <tbody>
                {RS_SLOTS.map((s) => {
                  const c = cell(s.ord);
                  const inp = (field: string, w = "w-20") => (
                    <input className={`${w} rounded border border-line px-1.5 py-1`} value={(c as any)[field]}
                      inputMode={field === "d_time" ? "text" : "decimal"}
                      onChange={(e) => setCell(s.ord, field, e.target.value)} />
                  );
                  return (
                    <tr key={s.ord} className="border-t border-line/60">
                      <td className="px-2 py-1 font-semibold text-ink">{s.first ? s.sesi : ""}</td>
                      <td className="px-2 py-1 font-mono text-muted-fg">{s.masa}</td>
                      <td className="px-2 py-1">{inp("c_viewers")}</td>
                      <td className="px-2 py-1">{inp("r_target")}</td>
                      <td className="px-2 py-1">{inp("g_revenue")}</td>
                      <td className="px-2 py-1">{inp("cost")}</td>
                      <td className="px-2 py-1 text-right font-semibold text-ink">{roiOf(c.g_revenue, c.cost) || "—"}</td>
                      <td className="px-2 py-1">{inp("v_boost")}</td>
                      <td className="px-2 py-1">{inp("cv_boost")}</td>
                      <td className="px-2 py-1">{inp("d_time", "w-24")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DateRangeFilter count={daily.length} countNoun={["day", "days"]} defaultMode="month" />
      <BrandFilterCard id="rs-filter-brand" value={filterBrand} onChange={setFilterBrand} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <Kpi Icon={Users} label="C.Viewers" value={int(tViewers)} />
        <Kpi Icon={TrendingUp} label="R.Target" value={money(tTarget)} />
        <Kpi Icon={TrendingUp} label="G.Revenue" value={money(tGross)} fill="emerald" />
        <Kpi Icon={Wallet} label="Cost" value={money(tCost)} fill="red" />
        <Kpi Icon={(tRoi ?? 0) >= 1 ? TrendingUp : TrendingDown} label="ROI" value={tRoi ?? "—"} />
        <Kpi Icon={Eye} label="V.Boost" value={money(tVBoost)} />
        <Kpi Icon={Eye} label="C.V.Boost" value={money(tCVBoost)} />
      </div>

      {daily.length === 0 ? (
        <p className="card text-center text-sm text-muted-fg">Tiada sheet dalam julat ini. Key in di atas.</p>
      ) : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted-fg">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Brand</th>
                <th className="px-4 py-3 text-right font-semibold">C.Viewers</th>
                <th className="px-4 py-3 text-right font-semibold">R.Target</th>
                <th className="px-4 py-3 text-right font-semibold">G.Revenue</th>
                <th className="px-4 py-3 text-right font-semibold">Cost</th>
                <th className="px-4 py-3 text-right font-semibold">ROI</th>
                <th className="px-4 py-3 text-right font-semibold">V.Boost</th>
                <th className="px-4 py-3 text-right font-semibold">C.V.Boost</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((o) => {
                const roi = o.cost > 0 ? Math.round((o.g_revenue / o.cost) * 100) / 100 : null;
                return (
                  <tr key={o.key} className={`border-t border-line/60 hover:bg-white/50 ${o.report_date === date && String(o.brand_id ?? "") === brand ? "bg-primary/5" : ""}`}>
                    <td className="px-4 py-3 font-semibold text-ink">{fmtDMY(o.report_date)}</td>
                    <td className="px-4 py-3">{o.brand_name ? <span className="chip bg-primary/10 text-primary">{o.brand_name}</span> : <span className="text-muted-fg/50">—</span>}</td>
                    <td className="px-4 py-3 text-right">{int(o.c_viewers)}</td>
                    <td className="px-4 py-3 text-right">{money(o.r_target)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">{money(o.g_revenue)}</td>
                    <td className="px-4 py-3 text-right">{money(o.cost)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">{roi ?? "—"}</td>
                    <td className="px-4 py-3 text-right">{money(o.v_boost)}</td>
                    <td className="px-4 py-3 text-right">{money(o.cv_boost)}</td>
                    <td className="px-4 py-3">
                      {canEdit && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => editDay(o)} title="Edit sheet"
                          className="cursor-pointer rounded-lg p-2 text-muted-fg hover:bg-accent/10 hover:text-accent" aria-label="Edit"><Pencil className="h-4 w-4" aria-hidden="true" /></button>
                        <button onClick={() => removeDay(o)} title="Delete sheet"
                          className="cursor-pointer rounded-lg p-2 text-muted-fg hover:bg-danger/10 hover:text-danger" aria-label="Delete"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                      </div>
                      )}
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

/* ── Unknown Affiliate ─────────────────────────────────── */

function UnknownTab({ rows }: { rows: Unknown[] }) {
  const canEdit = useCanEdit();
  const router = useRouter();
  const [convert, setConvert] = useState<Unknown | null>(null);

  async function discard(r: Unknown) {
    const go = await confirmDialog({
      title: `Buang baris ini? (${r.live_name || "tiada nama"})`,
      danger: true, confirmText: "Buang", cancelText: "Batal",
    });
    if (!go) return;
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
                <td className="px-4 py-3 text-right">{fmtRMor(r.ad_spend)}</td>
                <td className="px-4 py-3 text-right">{fmtRMor(r.gross_revenue)}</td>
                <td className="px-4 py-3 text-right font-semibold text-ink">{deriveRoi(r.ad_spend, r.gross_revenue, r.roi) ?? "—"}</td>
                <td className="px-4 py-3">
                  {canEdit && (
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
                  )}
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

