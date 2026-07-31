"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  TrendingUp, Users, ShoppingBag, UserRound, Bot, Check, ExternalLink,
  Loader2, KeyRound, Clock, AlertTriangle, CalendarDays, Timer,
  LayoutDashboard, Package, Boxes, Link2, Trash2, Plus, AlertCircle, BarChart3, MessageCircle,
  Tag, Search, UserCheck, UserX,
} from "lucide-react";
import Modal from "@/components/Modal";
import StaffCreateModal from "./StaffCreateModal";
import {
  BrandCommissionModal, CommissionSummary, CommissionButton, rateLabel,
  type LinkBrand,
} from "@/components/BrandCommission";
import { handleFromUrl } from "@/lib/tiktok";
import TabBar from "@/components/TabBar";
import ProductsTab from "./ProductsTab";
import AdminBrandsTab from "./BrandsTab";
import SamplesTab from "./SamplesTab";
import AdminReportingTab, { type AdminLive, type AdminLink } from "./ReportingTab";
import DateRangeFilter from "@/components/DateRangeFilter";
import Pagination from "@/components/Pagination";
import { getPage, paginate } from "@/lib/pagination";
import { useSearchParams } from "next/navigation";
import { fmtDate, fmtTimeRange, sumDurations } from "@/lib/format";
import { confirmDialog, alertDialog } from "@/lib/swal";

type Marketer = { id: number; name: string; email?: string | null; staff_id?: string | null; phone?: string | null; leader_id?: number | null; leader_name?: string | null; leader_staff?: string | null };
type Leader = { id: number; name: string; staff_id: string | null };
type Affiliate = {
  id: number; name: string; email?: string | null; staff_id?: string | null; phone: string | null;
  marketer_id: number | null; marketer_name: string | null; activated?: boolean;
  lives: number; done: number; gmv: number; items: number; viewers: number;
};
type Row = {
  booking_id: number; affiliate: string; marketer: string | null;
  profile_label: string; profile_url: string; profile_brand?: string | null;
  live_date: string; start_time: string; end_time: string | null; status: string;
  gmv: number | null; viewers: number | null; items_sold: number | null;
  duration_live: string | null; screenshot_path: string | null;
};

export default function AdminDashboard({
  marketers, affiliates, rows, links, leaders = [],
}: {
  marketers: Marketer[]; affiliates: Affiliate[]; rows: Row[]; links: AdminLink[];
  leaders?: Leader[];
}) {
  const router = useRouter();
  const [savingId, setSavingId] = useState<number | null>(null);
  const [linksFor, setLinksFor] = useState<Affiliate | null>(null);
  const [deleteErr, setDeleteErr] = useState("");
  const [addMarketer, setAddMarketer] = useState(false);
  // Affiliate table filters.
  const [affSearch, setAffSearch] = useState("");
  const [affStatus, setAffStatus] = useState<"all" | "done" | "no">("all");
  // Which marketer's affiliate list is open in the modal.
  const [affListFor, setAffListFor] = useState<Marketer | null>(null);

  /**
   * Two-step delete: the first call reports what would be destroyed, and the
   * operator confirms against that list rather than a generic "are you sure".
   */
  async function removeUser(id: number, name: string) {
    setDeleteErr("");
    let res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    let data = await res.json();

    if (res.status === 409 && data.needsConfirm) {
      const lines = Object.entries(data.impact as Record<string, number>)
        .filter(([, n]) => n > 0)
        .map(([k, n]) => `  • ${n} ${k.replace(/_/g, " ")}`)
        .join("\n");
      const body =
        (lines ? `This affects:\n${lines}\n\n` : "") +
        `${data.note}\n\nThis cannot be undone.`;
      const go = await confirmDialog({
        title: `Padam ${data.role} "${name}" (${data.staff_id ?? ""})?`,
        text: body,
        danger: true,
      });
      if (!go) return;

      res = await fetch(`/api/admin/users/${id}?force=1`, { method: "DELETE" });
      data = await res.json();
    }

    if (!res.ok) return setDeleteErr(data.error || "Could not delete.");
    router.refresh();
  }

  async function assign(affiliateId: number, marketerId: string) {
    setSavingId(affiliateId);
    const res = await fetch("/api/admin/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        affiliate_id: affiliateId,
        marketer_id: marketerId ? Number(marketerId) : null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSavingId(null);
    // Assigning is what unlocks the account, and the affiliate only learns
    // that from the welcome message — so say so when it did not send.
    if (data.notified === false && data.notify_note) {
      await alertDialog({
        title: "Assigned, but the welcome WhatsApp was not sent",
        text: data.notify_note, variant: "warning",
      });
    }
    router.refresh();
  }

  // Assign a marketer to a leader (or clear it).
  async function assignLeader(marketerId: number, leaderId: string) {
    setSavingId(marketerId);
    await fetch("/api/admin/assign-leader", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marketer_id: marketerId, leader_id: leaderId || null }),
    });
    setSavingId(null);
    router.refresh();
  }

  const totalGmv = rows.reduce((s, r) => s + (r.gmv || 0), 0);
  const totalItems = rows.reduce((s, r) => s + (r.items_sold || 0), 0);
  const totalViewers = rows.reduce((s, r) => s + (r.viewers || 0), 0);
  const completed = rows.filter((r) => r.status === "completed").length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const totalDuration = sumDurations(
    rows.filter((r) => r.status === "completed").map((r) => r.duration_live)
  );

  // Register status is about assignment: "Done Register" = has a marketer,
  // "No Register" = still unassigned (marketer_id is null).
  const affDoneCount = affiliates.filter((a) => a.marketer_id != null).length;
  const affNoCount = affiliates.length - affDoneCount;
  const affQ = affSearch.trim().toLowerCase();
  const affFiltered = affiliates.filter((a) => {
    if (affStatus === "done" && a.marketer_id == null) return false;
    if (affStatus === "no" && a.marketer_id != null) return false;
    if (affQ) {
      const hay = `${a.name} ${a.staff_id ?? ""} ${a.phone ?? ""} ${a.email ?? ""}`.toLowerCase();
      if (!hay.includes(affQ)) return false;
    }
    return true;
  });

  const params = useSearchParams();
  const page = getPage(params.get("page"));
  const pageRows = paginate(rows, page);

  const tab = params.get("tab") || "overview";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Admin Console</h1>
        <p className="text-sm text-muted-fg">
          Assign affiliates, manage products, and fulfil sample requests.
        </p>
      </div>

      <TabBar active={tab} tabs={[
        { key: "overview", label: "Overview", icon: LayoutDashboard },
        { key: "marketer", label: "List Marketer", icon: UserRound },
        { key: "affiliate", label: "List Affiliate", icon: Users },
        { key: "brand",    label: "Brand",    icon: Tag },
        { key: "product",  label: "Product",  icon: Package },
        { key: "reporting", label: "Reporting Affiliate", icon: BarChart3 },
        { key: "sample",   label: "Sample",   icon: Boxes },
      ]} />

      {tab === "brand" && <AdminBrandsTab />}
      {tab === "product" && <ProductsTab />}
      {tab === "sample" && <SamplesTab />}
      {tab === "reporting" && (
        <AdminReportingTab affiliates={affiliates}
          rows={rows as unknown as AdminLive[]} links={links} />
      )}
      {tab === "overview" && (
      <>
      <DateRangeFilter count={rows.length} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi Icon={CalendarDays} label="Total Live" value={rows.length} />
        <Kpi Icon={Clock} label="Total Pending Live" value={pending} tone="amber" />
        <Kpi Icon={Check} label="Total Completed Live" value={completed} tone="emerald" />
        <Kpi Icon={Timer} label="Total Duration Completed Live" value={totalDuration} />

        <Kpi Icon={TrendingUp} label="Total GMV" value={`RM${totalGmv.toFixed(2)}`}
          accent className="col-span-2" />
        <Kpi Icon={Users} label="Total Viewers" value={totalViewers} />
        <Kpi Icon={ShoppingBag} label="Item Sold" value={totalItems} />
      </div>

      <AiSettingsCard />
      <WhatsAppCard />
      </>
      )}

      {tab === "marketer" && (
      <>
      <StaffCreateModal open={addMarketer} onClose={() => setAddMarketer(false)} />
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="section-title">List Marketer</h2>
            <p className="text-sm text-muted-fg">Semua marketer &amp; leader jagaan mereka.</p>
          </div>
          <div className="flex items-center gap-2">
            {deleteErr && (
              <span className="flex items-center gap-1.5 text-sm text-danger">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />{deleteErr}
              </span>
            )}
            <button className="btn !py-2" onClick={() => setAddMarketer(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />Add Marketer
            </button>
          </div>
        </div>
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted-fg">
              <tr>
                <th className="px-4 py-3 font-semibold">No</th>
                <th className="px-4 py-3 font-semibold">Marketer</th>
                <th className="px-4 py-3 font-semibold">ID Staff</th>
                <th className="px-4 py-3 text-center font-semibold">Affiliates</th>
                <th className="px-4 py-3 font-semibold">Leader</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {marketers.map((m, i) => {
                const owned = affiliates.filter((a) => a.marketer_id === m.id).length;
                return (
                  <tr key={m.id} className="border-b border-line/60 last:border-0 hover:bg-primary/[0.03]">
                    <td className="px-4 py-3 text-muted-fg">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-xs font-bold text-white">
                          {m.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="font-semibold text-ink">{m.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-fg">{m.staff_id}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => setAffListFor(m)} disabled={owned === 0}
                        title={owned === 0 ? "Tiada affiliate" : "Lihat senarai affiliate"}
                        className="inline-flex min-w-[2.5rem] cursor-pointer items-center justify-center rounded-lg bg-primary/10 px-2.5 py-1 text-sm font-bold text-primary tabular-nums transition hover:bg-primary/20 disabled:cursor-default disabled:bg-transparent disabled:text-muted-fg disabled:hover:bg-transparent">
                        {owned}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="input !w-auto !py-1.5 cursor-pointer text-sm disabled:opacity-60"
                        value={m.leader_id != null ? String(m.leader_id) : ""}
                        disabled={savingId === m.id}
                        onChange={(e) => assignLeader(m.id, e.target.value)}>
                        <option value="">— Tiada leader —</option>
                        {leaders.map((l) => (
                          <option key={l.id} value={l.id}>{l.staff_id || l.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {savingId === m.id && <Loader2 className="h-4 w-4 animate-spin text-muted-fg" aria-hidden="true" />}
                        <button onClick={() => removeUser(m.id, m.name)}
                          aria-label={`Delete ${m.name}`} title="Delete account"
                          className="cursor-pointer rounded-lg p-1.5 text-muted-fg transition hover:bg-danger/10 hover:text-danger">
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {marketers.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-fg">No marketers registered yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      </>
      )}

      {tab === "affiliate" && (
      <section>
        <h2 className="section-title mb-3">List Affiliate</h2>

        {/* Register-status summary. "Done Register" = boleh login (activated). */}
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <button type="button" onClick={() => setAffStatus("all")}
            className={`card cursor-pointer text-left transition ${affStatus === "all" ? "ring-2 ring-primary" : "hover:bg-primary/5"}`}>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-fg">
              <Users className="h-3.5 w-3.5" aria-hidden="true" /> Total Affiliate
            </p>
            <p className="mt-1 text-2xl font-extrabold text-ink">{affiliates.length}</p>
          </button>
          <button type="button" onClick={() => setAffStatus("done")}
            className={`card cursor-pointer text-left transition ${affStatus === "done" ? "ring-2 ring-emerald-500" : "hover:bg-emerald-500/5"}`}>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-fg">
              <UserCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> Done Register
            </p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-600">{affDoneCount}</p>
          </button>
          <button type="button" onClick={() => setAffStatus("no")}
            className={`card cursor-pointer text-left transition ${affStatus === "no" ? "ring-2 ring-rose-500" : "hover:bg-rose-500/5"}`}>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-fg">
              <UserX className="h-3.5 w-3.5 text-rose-600" aria-hidden="true" /> No Register
            </p>
            <p className="mt-1 text-2xl font-extrabold text-rose-600">{affNoCount}</p>
          </button>
        </div>

        {/* Search + status filter. */}
        <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg" aria-hidden="true" />
            <input className="input !pl-9" placeholder="Cari nama, ID staff, atau phone…"
              value={affSearch} onChange={(e) => setAffSearch(e.target.value)} />
          </div>
          <select className="input cursor-pointer sm:!w-52"
            value={affStatus} onChange={(e) => setAffStatus(e.target.value as "all" | "done" | "no")}>
            <option value="all">All Status ({affiliates.length})</option>
            <option value="done">Done Register ({affDoneCount})</option>
            <option value="no">No Register ({affNoCount})</option>
          </select>
        </div>

        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted-fg">
              <tr>
                <th className="px-4 py-3 font-semibold">No</th>
                <th className="px-4 py-3 font-semibold">Full Name</th>
                <th className="px-4 py-3 font-semibold">ID Staff</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Assigned Marketer</th>
                <th className="px-4 py-3 text-center font-semibold">Lives</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {affFiltered.map((a, i) => (
                <tr key={a.id} className="border-b border-line/60 last:border-0 hover:bg-primary/[0.03]">
                  <td className="px-4 py-3 text-muted-fg">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-ink">{a.name}</td>
                  <td className="px-4 py-3 font-mono text-muted-fg">{a.staff_id || "—"}</td>
                  <td className="px-4 py-3 text-muted-fg">{a.phone || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select className="input cursor-pointer !w-auto !py-1.5 text-sm"
                        value={a.marketer_id ?? ""} disabled={savingId === a.id}
                        onChange={(e) => assign(a.id, e.target.value)}>
                        <option value="">— Unassigned —</option>
                        {marketers.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      {savingId === a.id && (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-fg" aria-hidden="true" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums">{a.done}/{a.lives}</td>
                  <td className="px-4 py-3">
                    {a.marketer_id != null ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        <UserCheck className="h-3 w-3" aria-hidden="true" /> Done Register
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                        <UserX className="h-3 w-3" aria-hidden="true" /> No Register
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => setLinksFor(a)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
                        title="TikTok links">
                        <Link2 className="h-3.5 w-3.5" aria-hidden="true" /> Links
                      </button>
                      <button onClick={() => removeUser(a.id, a.name)}
                        aria-label={`Delete ${a.name}`} title="Delete account"
                        className="cursor-pointer rounded-lg p-1.5 text-muted-fg transition hover:bg-danger/10 hover:text-danger">
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {affFiltered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-fg">
                    {affiliates.length === 0 ? "No affiliates registered yet." : "Tiada affiliate sepadan dengan carian."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {deleteErr && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-danger">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />{deleteErr}
          </p>
        )}
      </section>
      )}

      {tab === "overview" && (
      <section>
        <h2 className="section-title mb-3">All Live Reporting</h2>
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted-fg">
              <tr>
                <th className="px-4 py-3 font-semibold">Affiliate</th>
                <th className="px-4 py-3 font-semibold">Marketer</th>
                <th className="px-4 py-3 font-semibold">Date / Time</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">GMV</th>
                <th className="px-4 py-3 text-right font-semibold">Viewers</th>
                <th className="px-4 py-3 text-right font-semibold">Items</th>
                <th className="px-4 py-3 font-semibold">Duration</th>
                <th className="px-4 py-3 font-semibold">Proof</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.booking_id}
                  className="border-t border-line/60 transition-colors duration-200 hover:bg-white/50">
                  <td className="px-4 py-3 font-semibold text-ink">{r.affiliate}</td>
                  <td className="px-4 py-3">
                    {r.marketer ?? <span className="text-muted-fg/50">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-ink">{fmtDate(r.live_date)}</div>
                    <div className="text-xs text-muted-fg">
                      {fmtTimeRange(r.start_time, r.end_time)}
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-right font-semibold text-ink">
                    {r.gmv != null ? `RM${r.gmv}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">{r.viewers ?? "—"}</td>
                  <td className="px-4 py-3 text-right">{r.items_sold ?? "—"}</td>
                  <td className="px-4 py-3">{r.duration_live ?? "—"}</td>
                  <td className="px-4 py-3">
                    {r.screenshot_path ? (
                      <a href={r.screenshot_path} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                        View <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    ) : <span className="text-xs text-muted-fg/50">none</span>}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-fg">
                    No lives recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={rows.length} />
      </section>
      )}

      <TikTokLinksModal affiliate={linksFor} onClose={() => setLinksFor(null)} />

      <MarketerAffiliatesModal marketer={affListFor}
        affiliates={affiliates.filter((a) => affListFor && a.marketer_id === affListFor.id)}
        onClose={() => setAffListFor(null)} />
    </div>
  );
}

/* ── Admin-managed TikTok links ─────────────────────── */

/**
 * Affiliates own their links, but they often need help getting them right,
 * so admin can add and remove them on any affiliate's behalf.
 */
function TikTokLinksModal({
  affiliate, onClose,
}: { affiliate: Affiliate | null; onClose: () => void }) {
  const [links, setLinks] = useState<any[]>([]);
  // Which (link, brand) rate is open, and which link's summary.
  const [rateFor, setRateFor] = useState<{ pid: number; brand: LinkBrand } | null>(null);
  const [ratesFor, setRatesFor] = useState<{ pid: number; brands: LinkBrand[] } | null>(null);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!affiliate) return;
    try {
      const r = await fetch(`/api/profiles?user_id=${affiliate.id}`);
      const d = r.ok ? await r.json() : {};
      setLinks(d.profiles || []);
    } catch { setLinks([]); }
  }, [affiliate]);

  useEffect(() => {
    if (!affiliate) return;
    setLabel(""); setUrl(""); setError("");
    load();
  }, [affiliate, load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!affiliate) return;
    setBusy(true); setError("");
    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: affiliate.id, label, url }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || "Could not add.");
    setLabel(""); setUrl(""); load();
  }

  async function remove(id: number, name: string) {
    if (!(await confirmDialog({ title: `Delete "${name}"?`, danger: true }))) return;
    setError("");
    const res = await fetch(`/api/profiles/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Delete failed.");
    load();
  }

  return (
    <Modal open={!!affiliate} onClose={onClose}
      title={affiliate ? `TikTok links — ${affiliate.name}` : "TikTok links"}
      subtitle="Maximum 4 links per affiliate.">
      <div className="space-y-2">
        {links.map((p) => (
          <div key={p.id}
            className="rounded-xl border border-line bg-white/60 px-3 py-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-ink">
                  {handleFromUrl(p.url)}
                  {/* Each brand carries its own rate on this link. */}
                  {(p.brands ?? []).map((b: LinkBrand) => (
                    <button key={b.id} type="button"
                      onClick={() => setRateFor({ pid: p.id, brand: b })}
                      title={`Set komisyen ${b.name}`}
                      className="chip cursor-pointer bg-primary/10 text-primary transition-colors duration-200 hover:bg-primary/20">
                      {b.name}
                      {rateLabel(b) && <span className="ml-1 font-bold">· {rateLabel(b)}</span>}
                    </button>
                  ))}
                </p>
                <a href={p.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 truncate text-xs text-accent hover:underline">
                  <span className="truncate">{p.url}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                </a>
              </div>
              <button onClick={() => remove(p.id, handleFromUrl(p.url))}
                className="shrink-0 cursor-pointer rounded-lg p-2 text-muted-fg transition-colors duration-200 hover:bg-danger/10 hover:text-danger"
                aria-label={`Delete ${handleFromUrl(p.url)}`}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            {/* Rates hang off each brand, so the summary lists them all. */}
            <div className="mt-2">
              <CommissionButton
                onClick={() => setRatesFor({ pid: p.id, brands: p.brands ?? [] })} />
            </div>
          </div>
        ))}
        {links.length === 0 && (
          <p className="rounded-xl border border-dashed border-line py-6 text-center text-sm text-muted-fg">
            No TikTok links yet.
          </p>
        )}

        <CommissionSummary open={!!ratesFor} brands={ratesFor?.brands ?? []}
          onClose={() => setRatesFor(null)} />
        <BrandCommissionModal open={!!rateFor} profileId={rateFor?.pid ?? 0}
          brand={rateFor?.brand ?? null}
          onClose={() => { setRateFor(null); load(); }} />
      </div>

      {links.length < 4 && (
        <form onSubmit={add} className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_2fr_auto]">
          <input className="input" placeholder="Label (e.g. Main)" value={label}
            onChange={(e) => setLabel(e.target.value)} required aria-label="Profile label" />
          <input className="input" type="url" placeholder="https://www.tiktok.com/@username"
            value={url} onChange={(e) => setUrl(e.target.value)} required aria-label="TikTok URL" />
          <button className="btn" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  : <Plus className="h-4 w-4" aria-hidden="true" />}
            Add
          </button>
        </form>
      )}

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-danger">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />{error}
        </p>
      )}
    </Modal>
  );
}

/** Read-only list of the affiliates under one marketer, opened from the count. */
function MarketerAffiliatesModal({
  marketer, affiliates, onClose,
}: { marketer: Marketer | null; affiliates: Affiliate[]; onClose: () => void }) {
  return (
    <Modal open={!!marketer} onClose={onClose}
      title={marketer ? `Affiliate — ${marketer.name}` : "Affiliate"}
      subtitle={marketer ? `${affiliates.length} affiliate di bawah ${marketer.staff_id ?? marketer.name}` : undefined}>
      {affiliates.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line py-6 text-center text-sm text-muted-fg">
          Tiada affiliate di bawah marketer ini.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted-fg">
              <tr>
                <th className="py-2 pr-3 font-semibold">No</th>
                <th className="py-2 pr-3 font-semibold">Nama</th>
                <th className="py-2 pr-3 font-semibold">ID Staff</th>
                <th className="py-2 pr-3 font-semibold">Phone</th>
                <th className="py-2 pr-3 text-center font-semibold">Lives</th>
              </tr>
            </thead>
            <tbody>
              {affiliates.map((a, i) => (
                <tr key={a.id} className="border-b border-line/60 last:border-0">
                  <td className="py-2 pr-3 text-muted-fg">{i + 1}</td>
                  <td className="py-2 pr-3 font-medium text-ink">{a.name}</td>
                  <td className="py-2 pr-3 font-mono text-muted-fg">{a.staff_id || "—"}</td>
                  <td className="py-2 pr-3 text-muted-fg">{a.phone || "—"}</td>
                  <td className="py-2 pr-3 text-center tabular-nums">{a.done}/{a.lives}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

/**
 * WhaCenter device for outbound notifications.
 *
 * One field: the Device ID. Everything else (welcome on approval, sample
 * shipped) fires automatically once it is set, and a test send proves the
 * device can actually deliver before anyone relies on it.
 */
function WhatsAppCard() {
  const [cfg, setCfg] = useState<any>(null);
  const [device, setDevice] = useState("");
  const [adminNotify, setAdminNotify] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [result, setResult] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/whatsapp");
      const d = r.ok ? await r.json() : {};
      setCfg(d);
      setAdminNotify(d.admin_notify || "");
    } catch { setCfg({}); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save() {
    setBusy(true); setSaved(false); setResult(null);
    await fetch("/api/admin/whatsapp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device, admin_notify: adminNotify }),
    });
    setDevice(""); setBusy(false); setSaved(true); load();
  }

  async function test() {
    setBusy(true); setResult(null);
    const r = await fetch("/api/admin/whatsapp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test", device, phone }),
    });
    setResult(await r.json().catch(() => ({ error: "No response" })));
    setBusy(false);
  }

  return (
    <section className="card">
      <div className="mb-1 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
        </span>
        <h2 className="font-bold text-ink">WhatsApp Notification — WhaCenter</h2>
      </div>
      <p className="mb-4 text-xs text-muted-fg">
        Masukkan Device ID sahaja. Affiliate akan dapat notifikasi bila akaun
        diluluskan dan bila sample dihantar.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="wa-device">Device ID</label>
          <input id="wa-device" className="input" autoComplete="off"
            placeholder={cfg?.device_set ? `Saved (${cfg.device_hint}) — blank to keep` : "Paste WhaCenter Device ID"}
            value={device} onChange={(e) => setDevice(e.target.value)} />
          {cfg && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px]">
              <span className={`h-1.5 w-1.5 rounded-full ${cfg.device_set ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span className="text-muted-fg">
                {cfg.device_set
                  ? <>Set <span className="text-muted-fg/70">({cfg.source})</span></>
                  : "Belum set — notifikasi tidak akan dihantar"}
              </span>
            </p>
          )}
        </div>
        <div>
          <label className="label" htmlFor="wa-test">Test to number</label>
          <input id="wa-test" className="input" type="tel" inputMode="tel"
            placeholder="0123456789" value={phone}
            onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="wa-admin-notify">Nombor admin untuk notifikasi</label>
          <input id="wa-admin-notify" className="input" autoComplete="off"
            placeholder="601114721068, 60125485449"
            value={adminNotify} onChange={(e) => setAdminNotify(e.target.value)} />
          <p className="mt-1.5 text-[11px] text-muted-fg">
            Admin dapat notifikasi bila ada affiliate/marketer baharu daftar. Boleh masukkan lebih satu nombor (asingkan dengan koma).
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button className="btn" onClick={save} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                : <Check className="h-4 w-4" aria-hidden="true" />}
          Save device
        </button>
        <button className="btn-ghost" onClick={test} disabled={busy}>
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Send test
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-sm font-medium text-emerald-600">
            <Check className="h-4 w-4" aria-hidden="true" />Saved
          </span>
        )}
      </div>

      {result && (
        <div className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
          result.sent?.ok ? "border-emerald-200 bg-emerald-50/60 text-emerald-800"
                          : "border-danger/30 bg-danger/5 text-danger"
        }`}>
          {result.sent?.ok
            ? <><b>Sent.</b> Check {result.to} on WhatsApp.</>
            : <><b>Not sent.</b> {result.sent?.skipped || result.sent?.error || "Device status: " + JSON.stringify(result.status?.data ?? result.status).slice(0, 160)}</>}
        </div>
      )}
    </section>
  );
}

function AiSettingsCard() {
  const [cfg, setCfg] = useState<any>(null);
  const [key, setKey] = useState("");
  const [model, setModel] = useState("");
  const [base, setBase] = useState("");
  const [provider, setProvider] = useState("grsai");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<any>(null);

  async function load() {
    let d: any = {};
    try {
      const r = await fetch("/api/admin/settings");
      d = r.ok ? await r.json() : {};
    } catch { d = {}; }
    setCfg(d);
    setProvider(d.provider || "grsai");
    setModel(d.model || "");
    setBase(d.base || "");
  }
  useEffect(() => { load(); }, []);

  /** Switching provider swaps in that provider's URL and model, so the
      form never leaves a stale base URL pointing at the old service. */
  function pickProvider(p: string) {
    setProvider(p);
    setTest(null);
    const preset = cfg?.providers?.find((x: any) => x.key === p);
    if (preset) { setBase(preset.base); setModel(preset.defaultModel); }
  }

  async function save() {
    setSaving(true); setSaved(false);
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, model, base, provider }),
    });
    setKey(""); setSaving(false); setSaved(true); load();
  }

  /** Prove the key/model work before relying on them at upload time. */
  async function runTest() {
    setTesting(true); setTest(null);
    const r = await fetch("/api/admin/settings/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, key, base, model }),
    });
    setTest(await r.json().catch(() => ({ ok: false, error: "No response" })));
    setTesting(false);
  }

  const preset = cfg?.providers?.find((x: any) => x.key === provider);

  return (
    <section className="card">
      <div className="mb-1 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Bot className="h-4 w-4" aria-hidden="true" />
        </span>
        <h2 className="font-bold text-ink">AI Reader — GRSAI (Gemini 2.5 Flash)</h2>
      </div>
      <p className="mb-4 text-xs text-muted-fg">
        The key &amp; model used to auto-read live screenshots. Stored in the database.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="ai-provider">Provider</label>
          <select id="ai-provider" className="input cursor-pointer"
            value={provider} onChange={(e) => pickProvider(e.target.value)}>
            {(cfg?.providers ?? [{ key: "grsai", label: "GRSAI" }]).map((p: any) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] text-muted-fg">
            Both speak the same API, so switching needs no redeploy. OpenRouter
            model names are namespaced — e.g. <b>google/gemini-2.5-flash</b>.
          </p>
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="grsai-key">API Key</label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg"
              aria-hidden="true" />
            <input id="grsai-key" className="input pl-9" type="password" autoComplete="off"
              placeholder={cfg?.key_set
                ? `Saved (${cfg.key_hint}) — blank to keep`
                : `Paste key (${preset?.keyHint ?? "sk-…"})`}
              value={key} onChange={(e) => setKey(e.target.value)} />
          </div>
          {cfg && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px]">
              <span className={`h-1.5 w-1.5 rounded-full ${cfg.key_set ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span className="text-muted-fg">
                {cfg.key_set
                  ? <>Connected <span className="text-muted-fg/70">({cfg.key_source})</span></>
                  : "No key set — screenshots must be filled in manually"}
              </span>
            </p>
          )}
        </div>
        <div>
          <label className="label" htmlFor="grsai-model">Model</label>
          <input id="grsai-model" className="input" placeholder={preset?.modelHint ?? "gemini-2.5-flash"}
            value={model} onChange={(e) => setModel(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="grsai-base">Base URL</label>
          <input id="grsai-base" className="input" placeholder="https://grsaiapi.com/v1"
            value={base} onChange={(e) => setBase(e.target.value)} />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button className="btn-accent" onClick={save} disabled={saving}>
          {saving
            ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Saving…</>
            : "Save AI settings"}
        </button>
        <button className="btn-ghost" onClick={runTest} disabled={testing}>
          {testing
            ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Testing…</>
            : <><Bot className="h-4 w-4" aria-hidden="true" />Test connection</>}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-sm font-medium text-emerald-600">
            <Check className="h-4 w-4" aria-hidden="true" />Saved
          </span>
        )}
      </div>

      {test && (
        <div className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
          test.ok ? "border-emerald-200 bg-emerald-50/60 text-emerald-800"
                  : "border-danger/30 bg-danger/5 text-danger"
        }`}>
          {test.ok ? (
            <>
              <b>Working.</b> {test.model} replied &ldquo;{test.reply}&rdquo; in {(test.ms / 1000).toFixed(1)}s.
              <span className="block text-[11px] opacity-80">
                The model accepted an image, so screenshot reading will work.
              </span>
            </>
          ) : (
            <>
              <b>Failed{test.status ? ` (${test.status})` : ""}.</b>{" "}
              {String(test.error || "").slice(0, 220)}
              <span className="block text-[11px] opacity-80">
                Checked {test.base} with model {test.model}.
              </span>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function Kpi({ Icon, label, value, sub, accent, tone, fill, className = "" }: {
  Icon: typeof TrendingUp;
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: boolean;
  tone?: "amber" | "emerald";
  fill?: "yellow" | "orange" | "red" | "emerald";
  className?: string;
}) {
  const solid = accent || !!fill;

  const bg = accent
    ? "bg-gradient-to-br from-primary to-primary-hover text-white"
    : fill === "yellow"
      ? "bg-gradient-to-br from-amber-500 to-yellow-500 text-white"
      : fill === "orange"
        ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white"
        : fill === "red"
          ? "bg-gradient-to-br from-red-500 to-red-600 text-white"
          : fill === "emerald"
            ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"
            : "glass text-ink";

  const iconTone = solid
    ? "text-white/80"
    : tone === "amber" ? "text-amber-600"
      : tone === "emerald" ? "text-emerald-600"
      : "text-muted-fg";

  return (
    <div className={`rounded-2xl p-4 shadow-lift ${bg} ${className}`}>
      <Icon className={`mb-2 h-4 w-4 ${iconTone}`} aria-hidden="true" />
      <p className="text-xl font-extrabold leading-tight">{value}</p>
      <p className={`text-xs ${solid ? "text-white/90" : "text-muted-fg"}`}>{label}</p>
      {sub && <p className={`text-[11px] ${solid ? "text-white/75" : "text-muted-fg/70"}`}>{sub}</p>}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-white/60 py-2 text-center">
      <p className="text-sm font-extrabold text-ink">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-fg">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; Icon: typeof Check; label: string }> = {
    pending: { cls: "bg-amber-100 text-amber-700", Icon: Clock, label: "Pending" },
    completed: { cls: "bg-emerald-100 text-emerald-700", Icon: Check, label: "Completed" },
    missed: { cls: "bg-danger/10 text-danger", Icon: AlertTriangle, label: "Missed" },
  };
  const s = map[status] ?? { cls: "bg-muted text-muted-fg", Icon: Clock, label: status };
  const Icon = s.Icon;
  return (
    <span className={`chip ${s.cls}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {s.label}
    </span>
  );
}
