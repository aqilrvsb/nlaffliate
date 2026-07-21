"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Link2, CalendarPlus, CalendarDays, Clock, Camera, Settings,
  Sparkles, Check, AlertCircle, Pencil, TrendingUp, Trash2,
  Users, ShoppingBag, Timer, Loader2, Image as ImageIcon, Send, Lock,
  MessageCircle, Package, Tag,
} from "lucide-react";
import TabBar from "@/components/TabBar";
import SampleTab from "./SampleTab";
import ExampleHint from "@/components/ExampleHint";
import PostGrid, { PostItem } from "./PostGrid";
import ImageModal from "@/components/ImageModal";
import { compressScreenshot, fmtBytes, MAX_UPLOAD_BYTES } from "@/lib/image";
import DateRangeFilter from "@/components/DateRangeFilter";
import Modal from "@/components/Modal";
import Pagination from "@/components/Pagination";
import { getPage, paginate } from "@/lib/pagination";
import { fmtDate, fmtTimeRange, sumDurations } from "@/lib/format";
import { resolveRange } from "@/lib/daterange";

type Profile = { id: number; label: string; url: string };
type Brand = { id: number; name: string };
type Booking = {
  id: number; profile_id: number; profile_label: string; profile_url: string;
  brand_id: number | null; brand_name: string | null;
  live_date: string; start_time: string; end_time: string | null;
  note: string | null; status: string; post_url: string | null;
  ads_budget: number | null; affiliate_can_edit: number; live_title: string | null;
  result_id: number | null; gmv: number | null; viewers: number | null;
  items_sold: number | null; duration_live: string | null; screenshot_path: string | null;
};

const MAX_PROFILES = 4;

export default function AffiliateDashboard({
  userName,
  marketerName,
  waGroupUrl,
}: {
  userName: string;
  marketerName?: string | null;
  waGroupUrl?: string | null;
}) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  // "" = All Brands, the default.
  const [brandFilter, setBrandFilter] = useState("");

  const load = useCallback(async () => {
    const [p, b, po, br] = await Promise.all([
      fetch("/api/profiles").then((r) => r.json()),
      fetch("/api/bookings").then((r) => r.json()),
      fetch("/api/posts").then((r) => r.json()),
      fetch("/api/brands").then((r) => r.json()),
    ]);
    setProfiles(p.profiles || []);
    setBookings(b.bookings || []);
    setPosts(po.posts || []);
    setBrands(br.brands || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filters (?from=&to=&profile=) — applied to the lives list and the KPIs.
  const params = useSearchParams();
  const { from, to } = resolveRange({
    from: params.get("from"),
    to: params.get("to"),
    all: params.get("all"),
  });
  const profileFilter = params.get("profile") || "";
  const filtered = bookings
    .filter((b) => {
      if (from && b.live_date < from) return false;
      if (to && b.live_date > to) return false;
      if (profileFilter && String(b.profile_id) !== profileFilter) return false;
      if (brandFilter && String(b.brand_id ?? "") !== brandFilter) return false;
      return true;
    })
    // Always newest first (by date, then start time).
    .sort((a, b) => {
      const d = b.live_date.localeCompare(a.live_date);
      if (d !== 0) return d;
      return (b.start_time || "").localeCompare(a.start_time || "");
    });

  if (loading)
    return (
      <div className="flex items-center gap-2 text-muted-fg">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading…
      </div>
    );

  const totals = filtered.reduce(
    (a, b) => ({
      gmv: a.gmv + (b.gmv || 0),
      viewers: a.viewers + (b.viewers || 0),
      items: a.items + (b.items_sold || 0),
      done: a.done + (b.status === "completed" ? 1 : 0),
      pending: a.pending + (b.status === "pending" ? 1 : 0),
    }),
    { gmv: 0, viewers: 0, items: 0, done: 0, pending: 0 }
  );
  // Only completed lives contribute airtime.
  const totalDuration = sumDurations(
    filtered.filter((b) => b.status === "completed").map((b) => b.duration_live)
  );

  // Paginate the list (10 per page). KPIs stay on the full filtered set.
  const page = getPage(params.get("page"));
  const pageItems = paginate(filtered, page);

  // Tabs. Pending/Done Post are PeningLab videos and deliberately IGNORE the
  // date filter — they show every post until the affiliate clears it.
  const tab = params.get("tab") || "schedule";
  const pendingItems = posts.filter((p) => p.status === "pending");
  const doneItems = posts.filter((p) => p.status === "done");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Hi {userName}</h1>
          <p className="text-sm text-muted-fg">
            Schedule your lives and upload your results.
            {marketerName && (
              <> Marketer anda: <span className="font-semibold text-ink">{marketerName}</span>.</>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Appears the moment the assigned marketer sets a group link. */}
          {waGroupUrl && (
            <a href={waGroupUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lift transition-colors duration-200 hover:bg-emerald-700">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Link Group WhatsApp
            </a>
          )}
          <Link href="/profile" className="btn-ghost !py-2">
            <Settings className="h-4 w-4" aria-hidden="true" />
            Profile &amp; TikTok links
          </Link>
        </div>
      </div>

      <DateRangeFilter count={filtered.length} profiles={profiles} />

      <div className="card flex flex-wrap items-end gap-3">
        <div className="min-w-[220px]">
          <label className="label" htmlFor="aff-brand">Brand</label>
          <select id="aff-brand" className="input cursor-pointer !py-2 text-sm"
            value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <p className="pb-2 text-xs text-muted-fg">
          {brandFilter ? "Menunjukkan satu brand sahaja." : "Menunjukkan semua brand."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi Icon={CalendarDays} label="Total Live" value={filtered.length} />
        <Kpi Icon={Clock} label="Total Pending Live" value={totals.pending} tone="amber" />
        <Kpi Icon={Check} label="Total Completed Live" value={totals.done} tone="emerald" />
        <Kpi Icon={Timer} label="Total Duration Completed Live" value={totalDuration} />

        <Kpi Icon={TrendingUp} label="Total GMV" value={`RM${totals.gmv.toFixed(2)}`}
          fill="yellow" className="col-span-2" />
        <Kpi Icon={Users} label="Total Viewers" value={totals.viewers} />
        <Kpi Icon={ShoppingBag} label="Item Sold" value={totals.items} />

        <Kpi Icon={Clock} label="Pending Post" value={pendingItems.length}
          fill="red" className="col-span-2" />
        <Kpi Icon={Send} label="Done Post" value={doneItems.length}
          fill="emerald" className="col-span-2" />
      </div>

      {profiles.length === 0 && (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-primary/30">
          <p className="flex items-center gap-2 text-sm text-ink">
            <Link2 className="h-4 w-4 text-primary" aria-hidden="true" />
            Add a TikTok profile link before you can schedule a live.
          </p>
          <Link href="/profile" className="btn !py-2">Add TikTok link</Link>
        </div>
      )}

      <TabBar active={tab} tabs={[
        { key: "schedule", label: "My Scheduled Lives", icon: CalendarDays },
        { key: "pending",  label: "Pending Post",       icon: Clock, activeTone: "red" },
        { key: "done",     label: "Done Post",          icon: Send,  activeTone: "emerald" },
        { key: "sample",   label: "Sample",             icon: Package },
      ]} />

      <section>
        {tab === "schedule" && (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="section-title">My Scheduled Lives</h2>
              <button className="btn !py-2" onClick={() => setScheduleOpen(true)}
                disabled={profiles.length === 0}
                title={profiles.length === 0 ? "Add a TikTok profile link first" : undefined}>
                <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                Add Schedule
              </button>
            </div>

            {filtered.length === 0 ? (
              <p className="card text-center text-sm text-muted-fg">
                {bookings.length === 0
                  ? "Nothing scheduled yet — click Add Schedule to book your first live."
                  : "No lives match these filters."}
              </p>
            ) : (
              <>
                <div className="space-y-3">
                  {pageItems.map((b) => <BookingCard key={b.id} b={b} reload={load} />)}
                </div>
                <Pagination page={page} total={filtered.length} />
              </>
            )}
          </>
        )}

        {tab === "pending" && (
          <>
            <h2 className="section-title mb-3">Pending Post</h2>
            <PostGrid items={pendingItems}
              emptyText="No pending posts — nothing transferred from PeningLab in this range."
              reload={load} />
          </>
        )}

        {tab === "done" && (
          <>
            <h2 className="section-title mb-3">Done Post</h2>
            <PostGrid items={doneItems}
              emptyText="No done posts in this range."
              reload={load} />
          </>
        )}

        {tab === "sample" && <SampleTab />}
      </section>

      <ScheduleModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        profiles={profiles}
        brands={brands}
        reload={load}
      />
    </div>
  );
}

function Kpi({ Icon, label, value, accent, tone, fill, sub, className = "" }: {
  Icon: typeof TrendingUp;
  label: string;
  value: React.ReactNode;
  /** Solid brand (rose) card. */
  accent?: boolean;
  /** Tints just the icon on a glass card. */
  tone?: "amber" | "emerald";
  /** Solid coloured card. */
  fill?: "yellow" | "orange" | "red" | "emerald";
  sub?: string;
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

  const labelTone = solid ? "text-white/90" : "text-muted-fg";
  const subTone = solid ? "text-white/75" : "text-muted-fg/70";

  return (
    <div className={`rounded-2xl p-4 shadow-lift ${bg} ${className}`}>
      <Icon className={`mb-2 h-4 w-4 ${iconTone}`} aria-hidden="true" />
      <p className="text-xl font-extrabold leading-tight">{value}</p>
      <p className={`text-xs ${labelTone}`}>{label}</p>
      {sub && <p className={`text-[11px] ${subTone}`}>{sub}</p>}
    </div>
  );
}


/* ── Schedule modal ───────────────────────────────────── */

function ScheduleModal({ open, onClose, profiles, brands, reload }: {
  open: boolean; onClose: () => void;
  profiles: Profile[]; brands: Brand[]; reload: () => void;
}) {
  const [profileId, setProfileId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setProfileId(""); setBrandId(""); setDate(""); setStart(""); setEnd(""); setNote(""); setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaving(true);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile_id: Number(profileId), brand_id: brandId, live_date: date,
        start_time: start, end_time: end || null, note,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setError(data.error || "Could not create schedule");
    reset();
    reload();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose}
      title="Schedule a Live"
      subtitle="Times are in Kuala Lumpur time (GMT+8). New lives start as Pending.">
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {error && (
          <p className="flex items-center gap-1.5 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger sm:col-span-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{error}
          </p>
        )}

        <div className="sm:col-span-2">
          <label className="label" htmlFor="m-profile">TikTok profile</label>
          <select id="m-profile" className="input cursor-pointer" value={profileId}
            onChange={(e) => setProfileId(e.target.value)} required>
            <option value="">Select a profile…</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.label} — {p.url}</option>
            ))}
          </select>
        </div>

        {/* Brands come from the marketer this affiliate is assigned to. */}
        <div className="sm:col-span-2">
          <label className="label" htmlFor="m-brand">Brand</label>
          <select id="m-brand" className="input cursor-pointer" value={brandId}
            onChange={(e) => setBrandId(e.target.value)} required>
            <option value="">Select a brand…</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          {brands.length === 0 && (
            <p className="mt-1 text-xs text-muted-fg">
              Marketer anda belum tambah brand — hubungi mereka dahulu.
            </p>
          )}
        </div>
        <div>
          <label className="label" htmlFor="m-date">Date</label>
          <input id="m-date" className="input cursor-pointer" type="date" value={date}
            onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="m-start">Start time (MYT)</label>
          <input id="m-start" className="input cursor-pointer" type="time" value={start}
            onChange={(e) => setStart(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="m-end">End time (optional)</label>
          <input id="m-end" className="input cursor-pointer" type="time" value={end}
            onChange={(e) => setEnd(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="m-note">Note (optional)</label>
          <input id="m-note" className="input" placeholder="e.g. PROMO GLOW campaign"
            value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <div className="mt-1 flex items-center justify-end gap-2 sm:col-span-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={saving}>
            {saving
              ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Saving…</>
              : <><CalendarPlus className="h-4 w-4" aria-hidden="true" />Add to schedule</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function BookingCard({ b, reload }: { b: Booking; reload: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [note, setNote] = useState("");

  // Inline editing (date / time / name). Allowed while pending, UNLESS the
  // marketer has set a budget and left the "affiliate can edit" toggle off.
  const marketerLocked = b.ads_budget != null && b.affiliate_can_edit === 0;
  const canEdit = b.status === "pending" && !marketerLocked;
  const [editingWhen, setEditingWhen] = useState(false);
  const [eDate, setEDate] = useState(b.live_date);
  const [eStart, setEStart] = useState(b.start_time);
  const [eEnd, setEEnd] = useState(b.end_time || "");
  const [eNote, setENote] = useState(b.note || "");
  const [savingWhen, setSavingWhen] = useState(false);
  const [whenError, setWhenError] = useState("");

  async function saveWhen() {
    if (!eDate || !eStart) {
      setWhenError("Date and start time are required.");
      return;
    }
    setSavingWhen(true); setWhenError("");
    const res = await fetch(`/api/bookings/${b.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        live_date: eDate, start_time: eStart, end_time: eEnd || null,
        note: eNote || null,
      }),
    });
    const data = await res.json();
    setSavingWhen(false);
    if (!res.ok) return setWhenError(data.error || "Could not save");
    setEditingWhen(false);
    reload();
  }
  const hasResult = b.result_id != null;

  async function del() {
    if (!confirm("Delete this scheduled live?")) return;
    await fetch(`/api/bookings/${b.id}`, { method: "DELETE" });
    reload();
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!picked) return;

    if (picked.size > MAX_UPLOAD_BYTES) {
      setAiError(`That image is ${fmtBytes(picked.size)} — max ${fmtBytes(MAX_UPLOAD_BYTES)}.`);
      return;
    }

    setUploading(true);
    setAiError("");
    setNote("");

    try {
      const { file, originalBytes, finalBytes, skipped } = await compressScreenshot(picked);
      if (!skipped) {
        setNote(`Compressed ${fmtBytes(originalBytes)} → ${fmtBytes(finalBytes)}`);
      }

      const fd = new FormData();
      fd.append("booking_id", String(b.id));
      fd.append("screenshot", file);
      const res = await fetch("/api/results", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || "Upload failed");
        return;
      }
      if (data.aiError) setAiError(data.aiError);
      reload();
    } catch (err: any) {
      setAiError(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-ink">{b.profile_label}</span>
            <StatusBadge status={b.status} />
            {b.brand_name && (
              <span className="chip bg-primary/10 text-primary">
                <Tag className="h-3 w-3" aria-hidden="true" />{b.brand_name}
              </span>
            )}
            {b.ads_budget != null && (
              <span className="chip bg-accent/10 text-accent">Budget RM{b.ads_budget}</span>
            )}
            {marketerLocked && (
              <span className="chip bg-gray-100 text-gray-500">
                <Lock className="h-3 w-3" aria-hidden="true" />Locked by marketer
              </span>
            )}
          </div>
          {b.live_title && (
            <p className="mt-1 text-sm font-bold text-ink">{b.live_title}</p>
          )}
          {editingWhen ? (
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg"
                  htmlFor={`d-${b.id}`}>Date</label>
                <input id={`d-${b.id}`} type="date" className="input cursor-pointer !py-1.5 text-sm"
                  value={eDate} onChange={(e) => setEDate(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg"
                  htmlFor={`s-${b.id}`}>Start</label>
                <input id={`s-${b.id}`} type="time" className="input cursor-pointer !py-1.5 text-sm"
                  value={eStart} onChange={(e) => setEStart(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg"
                  htmlFor={`e-${b.id}`}>End</label>
                <input id={`e-${b.id}`} type="time" className="input cursor-pointer !py-1.5 text-sm"
                  value={eEnd} onChange={(e) => setEEnd(e.target.value)} />
              </div>
              <div className="sm:col-span-3">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-fg"
                  htmlFor={`n-${b.id}`}>Name</label>
                <input id={`n-${b.id}`} type="text" className="input !py-1.5 text-sm"
                  placeholder="e.g. PROMO GLOW campaign"
                  value={eNote} onChange={(e) => setENote(e.target.value)} />
              </div>
              <div className="flex items-center gap-2 sm:col-span-3">
                <button className="btn !py-1.5 text-xs" onClick={saveWhen} disabled={savingWhen}>
                  {savingWhen
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />Saving…</>
                    : <><Check className="h-3.5 w-3.5" aria-hidden="true" />Save</>}
                </button>
                <button className="btn-ghost !py-1.5 text-xs"
                  onClick={() => { setEditingWhen(false); setWhenError(""); }}>
                  Cancel
                </button>
                {whenError && (
                  <span className="flex items-center gap-1 text-xs text-danger">
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />{whenError}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-fg">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{fmtDate(b.live_date)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {fmtTimeRange(b.start_time, b.end_time)}
              </span>
            </p>
          )}
          {b.note && <p className="mt-1 text-xs text-muted-fg">{b.note}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {canEdit && !editingWhen && (
            <button onClick={() => {
              setEDate(b.live_date);
              setEStart(b.start_time);
              setEEnd(b.end_time || "");
              setENote(b.note || "");
              setEditingWhen(true);
            }}
              className="cursor-pointer rounded-lg p-2 text-muted-fg transition-colors duration-200 hover:bg-white hover:text-primary"
              aria-label="Edit date, time and name" title="Edit date, time & name">
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <button onClick={del}
            className="cursor-pointer rounded-lg p-2 text-muted-fg transition-colors duration-200 hover:bg-danger/10 hover:text-danger"
            aria-label="Delete booking">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-4">
        {hasResult ? (
          <ResultView b={b} reload={reload} />
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <label className={`btn-ghost ${uploading ? "pointer-events-none opacity-60" : ""}`}>
              {uploading
                ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Reading screenshot…</>
                : <><Camera className="h-4 w-4" aria-hidden="true" />Upload screenshot</>}
              <input type="file" accept="image/*" className="sr-only"
                onChange={upload} disabled={uploading} />
            </label>
            <ExampleHint
              src="/examples/live-analytics.jpeg"
              alt="Contoh screenshot keputusan live"
              caption="Pastikan GMV, viewers, items sold dan tempoh live kelihatan jelas."
            />
          </div>
        )}
        {note && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-fg">
            <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />{note}
          </p>
        )}
        {aiError && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-600">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{aiError}
          </p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; Icon: typeof Check; label: string }> = {
    pending: { cls: "bg-amber-100 text-amber-700", Icon: Clock, label: "Pending" },
    completed: { cls: "bg-emerald-100 text-emerald-700", Icon: Check, label: "Completed" },
    missed: { cls: "bg-danger/10 text-danger", Icon: AlertCircle, label: "Missed" },
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

function ResultView({ b, reload }: { b: Booking; reload: () => void }) {
  const [edit, setEdit] = useState(false);
  const [gmv, setGmv] = useState<any>(b.gmv ?? "");
  const [viewers, setViewers] = useState<any>(b.viewers ?? "");
  const [items, setItems] = useState<any>(b.items_sold ?? "");
  const [dur, setDur] = useState<any>(b.duration_live ?? "");

  async function save() {
    await fetch("/api/results", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_id: b.id,
        gmv: gmv === "" ? null : Number(gmv),
        viewers: viewers === "" ? null : Number(viewers),
        items_sold: items === "" ? null : Number(items),
        duration_live: dur || null,
      }),
    });
    setEdit(false);
    reload();
  }

  // Only reserve the thumbnail column when there is actually a screenshot.
  // A result can now exist without one (the marketer can enter figures by
  // hand), and with the column always present the stats were being squeezed
  // into the 140px track meant for the image.
  return (
    <div className={`grid grid-cols-1 gap-4 ${
      b.screenshot_path ? "sm:grid-cols-[140px_1fr]" : ""
    }`}>
      {b.screenshot_path && (
        <ImageModal src={b.screenshot_path} title={b.live_title || "Live result"}
          className="self-start" />
      )}
      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
            <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            Live Results
          </p>
          {!edit ? (
            <button onClick={() => setEdit(true)}
              className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-accent hover:underline">
              <Pencil className="h-3 w-3" aria-hidden="true" />Correct
            </button>
          ) : (
            <button onClick={save}
              className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline">
              <Check className="h-3 w-3" aria-hidden="true" />Save
            </button>
          )}
        </div>

        {!edit ? (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Stat Icon={TrendingUp} label="Total Sales" value={b.gmv != null ? `RM${b.gmv}` : "—"} />
            <Stat Icon={Users} label="Viewers" value={b.viewers ?? "—"} />
            <Stat Icon={ShoppingBag} label="Items Sold" value={b.items_sold ?? "—"} />
            <Stat Icon={Timer} label="Duration" value={b.duration_live ?? "—"} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <EditStat label="GMV" value={gmv} setValue={setGmv} />
            <EditStat label="Viewers" value={viewers} setValue={setViewers} />
            <EditStat label="Items" value={items} setValue={setItems} />
            <EditStat label="Duration" value={dur} setValue={setDur} text />
          </div>
        )}

        <label className="btn-ghost mt-3 !py-2 text-xs">
          <Camera className="h-3.5 w-3.5" aria-hidden="true" />Replace screenshot
          <input type="file" accept="image/*" className="sr-only"
            onChange={async (e) => {
              const picked = e.target.files?.[0];
              if (!picked) return;
              // Compress here too — this path was sending the raw file, so a
              // phone screenshot could exceed Vercel's request-body cap.
              const { file } = await compressScreenshot(picked);
              const fd = new FormData();
              fd.append("booking_id", String(b.id));
              fd.append("screenshot", file);
              await fetch("/api/results", { method: "POST", body: fd });
              reload();
            }} />
        </label>
      </div>
    </div>
  );
}

function Stat({ Icon, label, value }: { Icon: typeof TrendingUp; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-white/60 p-3 text-center">
      <Icon className="mx-auto mb-1 h-3.5 w-3.5 text-muted-fg" aria-hidden="true" />
      <p className="text-base font-extrabold leading-tight text-ink">{value}</p>
      <p className="text-[11px] text-muted-fg">{label}</p>
    </div>
  );
}

function EditStat({ label, value, setValue, text }: {
  label: string; value: any; setValue: (v: any) => void; text?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold text-muted-fg">{label}</label>
      <input className="input !py-1.5 text-sm" type={text ? "text" : "number"} step="any"
        value={value} onChange={(e) => setValue(e.target.value)} aria-label={label} />
    </div>
  );
}
