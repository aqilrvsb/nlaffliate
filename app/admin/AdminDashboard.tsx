"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  TrendingUp, Users, ShoppingBag, UserRound, Bot, Check, ExternalLink,
  Loader2, KeyRound, Clock, AlertTriangle, CalendarDays, Timer,
  LayoutDashboard, Package, Boxes, Link2, Trash2, Plus, AlertCircle, BarChart3, MessageCircle,
  Tag,
} from "lucide-react";
import Modal from "@/components/Modal";
import CommissionEditor, { commissionLabel } from "@/components/CommissionEditor";
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

type Marketer = { id: number; name: string; email: string };
type Affiliate = {
  id: number; name: string; email: string; phone: string | null;
  marketer_id: number | null; marketer_name: string | null;
  lives: number; done: number; gmv: number; items: number; viewers: number;
};
type Row = {
  booking_id: number; affiliate: string; marketer: string | null;
  profile_label: string; profile_url: string;
  live_date: string; start_time: string; end_time: string | null; status: string;
  gmv: number | null; viewers: number | null; items_sold: number | null;
  duration_live: string | null; screenshot_path: string | null;
};

export default function AdminDashboard({
  marketers, affiliates, rows, links,
}: {
  marketers: Marketer[]; affiliates: Affiliate[]; rows: Row[]; links: AdminLink[];
}) {
  const router = useRouter();
  const [savingId, setSavingId] = useState<number | null>(null);
  const [linksFor, setLinksFor] = useState<Affiliate | null>(null);
  const [deleteErr, setDeleteErr] = useState("");

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
        `Delete ${data.role} "${name}" (${data.email})?\n\n` +
        (lines ? `This affects:\n${lines}\n\n` : "") +
        `${data.note}\n\nThis cannot be undone.`;
      if (!confirm(body)) return;

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
      alert(`Assigned, but the welcome WhatsApp was not sent:

${data.notify_note}`);
    }
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
      {tab !== "overview" ? null : (
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

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">Marketers</h2>
          {deleteErr && (
            <span className="flex items-center gap-1.5 text-sm text-danger">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />{deleteErr}
            </span>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {marketers.map((m) => {
            const owned = affiliates.filter((a) => a.marketer_id === m.id).length;
            return (
              <div key={m.id} className="card flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-bold text-white">
                  {m.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink">{m.name}</p>
                  <p className="truncate text-xs text-muted-fg">{m.email}</p>
                  <p className="text-xs text-muted-fg">
                    {owned} affiliate{owned === 1 ? "" : "s"}
                  </p>
                </div>
                <button onClick={() => removeUser(m.id, m.name)}
                  aria-label={`Delete ${m.name}`} title="Delete account"
                  className="shrink-0 cursor-pointer rounded-lg p-2 text-muted-fg transition-colors duration-200 hover:bg-danger/10 hover:text-danger">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            );
          })}
          {marketers.length === 0 && (
            <p className="card text-center text-sm text-muted-fg">No marketers registered yet.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="section-title mb-3">Affiliates &amp; Assignment</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {affiliates.map((a) => (
            <div key={a.id} className="card flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-bold text-ink">{a.name}</p>
                  <p className="truncate text-xs text-muted-fg">
                    {a.email}{a.phone ? ` · ${a.phone}` : ""}
                  </p>
                </div>
                <span className="chip shrink-0 bg-primary/10 text-primary">
                  RM{Number(a.gmv).toFixed(0)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <MiniStat label="Lives" value={`${a.done}/${a.lives}`} />
                <MiniStat label="Items" value={a.items} />
                <MiniStat label="Viewers" value={a.viewers} />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg"
                  htmlFor={`mk-${a.id}`}>
                  Assigned marketer
                </label>
                <div className="flex items-center gap-2">
                  <select id={`mk-${a.id}`} className="input cursor-pointer !py-2 text-sm"
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
              </div>

              <div className="flex items-center gap-2">
                <button className="btn-ghost flex-1 !py-2" onClick={() => setLinksFor(a)}>
                  <Link2 className="h-4 w-4" aria-hidden="true" />
                  TikTok links
                </button>
                <button onClick={() => removeUser(a.id, a.name)}
                  aria-label={`Delete ${a.name}`} title="Delete account"
                  className="shrink-0 cursor-pointer rounded-xl border border-line bg-white/70 p-2.5 text-muted-fg shadow-lift transition-colors duration-200 hover:bg-danger/10 hover:text-danger">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
          {affiliates.length === 0 && (
            <p className="card text-center text-sm text-muted-fg">No affiliates registered yet.</p>
          )}
        </div>
      </section>

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
      </>
      )}

      <TikTokLinksModal affiliate={linksFor} onClose={() => setLinksFor(null)} />
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
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!affiliate) return;
    const d = await fetch(`/api/profiles?user_id=${affiliate.id}`).then((r) => r.json());
    setLinks(d.profiles || []);
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
    if (!confirm(`Delete "${name}"?`)) return;
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
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  {p.label}
                  {commissionLabel(p) && (
                    <span className="chip bg-emerald-100 text-emerald-700">
                      {commissionLabel(p)}
                    </span>
                  )}
                </p>
                <a href={p.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 truncate text-xs text-accent hover:underline">
                  <span className="truncate">{p.url}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                </a>
              </div>
              <button onClick={() => remove(p.id, p.label)}
                className="shrink-0 cursor-pointer rounded-lg p-2 text-muted-fg transition-colors duration-200 hover:bg-danger/10 hover:text-danger"
                aria-label={`Delete ${p.label}`}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            {/* Admin sets commission on the same links they manage here. */}
            <CommissionEditor profileId={p.id} initial={p} onSaved={load} />
          </div>
        ))}
        {links.length === 0 && (
          <p className="rounded-xl border border-dashed border-line py-6 text-center text-sm text-muted-fg">
            No TikTok links yet.
          </p>
        )}
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
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [result, setResult] = useState<any>(null);

  const load = useCallback(async () => {
    setCfg(await fetch("/api/admin/whatsapp").then((r) => r.json()));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save() {
    setBusy(true); setSaved(false); setResult(null);
    await fetch("/api/admin/whatsapp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device }),
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
    const d = await fetch("/api/admin/settings").then((r) => r.json());
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
