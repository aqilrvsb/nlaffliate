"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  UserRound, Phone, MapPin, Mail, Lock, Link2, Plus, Trash2,
  Check, AlertCircle, ExternalLink, Loader2, ArrowLeft, MessageCircle, Pencil,
} from "lucide-react";
import Link from "next/link";
import { confirmDialog } from "@/lib/swal";
import { handleFromUrl } from "@/lib/tiktok";
import { CommissionButton, CommissionSummary } from "@/components/BrandCommission";

type ProfileBrand = {
  id: number; name: string; wa_group_url: string | null;
  commission_type?: "percent" | "hour" | null;
  commission_value?: number | string | null;
};
type Profile = {
  id: number; label: string; url: string;
  brand_name?: string | null;
  wa_group_url?: string | null;
  brands?: ProfileBrand[];
};
const MAX_PROFILES = 10;

export default function ProfileSettings({ role }: { role: string }) {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const d = await fetch("/api/profile").then((r) => r.json());
    setMe(d.profile);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading)
    return (
      <div className="flex items-center gap-2 text-muted-fg">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading…
      </div>
    );

  const home = role === "admin" ? "/admin" : role === "marketer" ? "/marketer" : "/affiliate";

  return (
    <div className="space-y-6">
      <div>
        <Link href={home}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-fg transition-colors hover:text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to dashboard
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Profile Settings</h1>
        <p className="text-sm text-muted-fg">Manage your account details and security.</p>
      </div>

      <AccountCard me={me} reload={load} refresh={() => router.refresh()} />
      {role === "marketer" && (
        <WaGroupCard me={me} reload={load} refresh={() => router.refresh()} />
      )}
      <PasswordCard />
      {role === "affiliate" && <TikTokProfilesCard />}
    </div>
  );
}

/* ── Account details ──────────────────────────────── */

function AccountCard({ me, reload, refresh }: { me: any; reload: () => void; refresh: () => void }) {
  const [name, setName] = useState(me.name || "");
  const [phone, setPhone] = useState(me.phone || "");
  const [address, setAddress] = useState(me.address || "");
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setOk(false); setError("");
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, address }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setError(data.error || "Update failed");
    setOk(true); reload(); refresh();
  }

  return (
    <section className="card">
      <h2 className="mb-4 flex items-center gap-2 font-bold text-ink">
        <UserRound className="h-4 w-4 text-primary" aria-hidden="true" />
        Account Details
      </h2>

      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="label" htmlFor="p-name">Full name</label>
          <input id="p-name" className="input" value={name}
            onChange={(e) => setName(e.target.value)} required />
        </div>

        <div>
          <label className="label" htmlFor="p-email">Email</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg"
              aria-hidden="true" />
            <input id="p-email" className="input pl-9 opacity-60" value={me.email} disabled readOnly />
          </div>
          <p className="mt-1 text-xs text-muted-fg">Email cannot be changed.</p>
        </div>

        <div>
          <label className="label" htmlFor="p-phone">WhatsApp No.</label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg"
              aria-hidden="true" />
            <input id="p-phone" className="input pl-9" type="tel" inputMode="tel"
              placeholder="e.g. 0123456789" value={phone}
              onChange={(e) => setPhone(e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="p-address">Address</label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-fg"
              aria-hidden="true" />
            <textarea id="p-address" className="input resize-none pl-9" rows={3}
              value={address} onChange={(e) => setAddress(e.target.value)} required />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn" disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Saving…</> : "Save changes"}
          </button>
          {ok && (
            <span className="flex items-center gap-1 text-sm font-medium text-emerald-600">
              <Check className="h-4 w-4" aria-hidden="true" />Saved
            </span>
          )}
          {error && (
            <span className="flex items-center gap-1 text-sm text-danger">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />{error}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

/* ── WhatsApp group link (marketer only) ──────────── */

/**
 * The marketer sets one group link here; every affiliate assigned to them
 * sees it in their sidebar automatically — no per-affiliate sharing needed.
 */
function WaGroupCard({ me, reload, refresh }: { me: any; reload: () => void; refresh: () => void }) {
  const [url, setUrl] = useState(me.wa_group_url || "");
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setOk(false); setError("");
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: me.name, phone: me.phone, address: me.address,
        wa_group_url: url,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setError(data.error || "Update failed");
    setOk(true); reload(); refresh();
  }

  return (
    <section className="card">
      <h2 className="mb-1 flex items-center gap-2 font-bold text-ink">
        <MessageCircle className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        WhatsApp Group Link
      </h2>
      <p className="mb-4 text-xs text-muted-fg">
        Every affiliate assigned to you sees this link in their sidebar. Leave
        it blank to hide it.
      </p>

      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="label" htmlFor="wa-group">Group invite link</label>
          <div className="relative">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg"
              aria-hidden="true" />
            <input id="wa-group" className="input pl-9" type="url"
              placeholder="https://chat.whatsapp.com/…"
              value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn" disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Saving…</> : "Save link"}
          </button>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
              Open <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
          {ok && (
            <span className="flex items-center gap-1 text-sm font-medium text-emerald-600">
              <Check className="h-4 w-4" aria-hidden="true" />Saved
            </span>
          )}
          {error && (
            <span className="flex items-center gap-1 text-sm text-danger">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />{error}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

/* ── Change password ──────────────────────────────── */

function PasswordCard() {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setOk(false); setError("");
    if (next !== confirm) return setError("New passwords do not match.");
    setSaving(true);
    const res = await fetch("/api/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: cur, new_password: next }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setError(data.error || "Update failed");
    setCur(""); setNext(""); setConfirm(""); setOk(true);
  }

  return (
    <section className="card">
      <h2 className="mb-4 flex items-center gap-2 font-bold text-ink">
        <Lock className="h-4 w-4 text-primary" aria-hidden="true" />
        Change Password
      </h2>

      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="label" htmlFor="pw-cur">Current password</label>
          <input id="pw-cur" className="input" type="password" autoComplete="current-password"
            value={cur} onChange={(e) => setCur(e.target.value)} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="pw-new">New password</label>
            <input id="pw-new" className="input" type="password" autoComplete="new-password"
              value={next} onChange={(e) => setNext(e.target.value)} required minLength={6} />
          </div>
          <div>
            <label className="label" htmlFor="pw-con">Confirm new password</label>
            <input id="pw-con" className="input" type="password" autoComplete="new-password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn" disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Updating…</> : "Update password"}
          </button>
          {ok && (
            <span className="flex items-center gap-1 text-sm font-medium text-emerald-600">
              <Check className="h-4 w-4" aria-hidden="true" />Password updated
            </span>
          )}
          {error && (
            <span className="flex items-center gap-1 text-sm text-danger">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />{error}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

/**
 * One TikTok link, editable in place.
 *
 * A mistyped handle used to mean delete-and-re-add, which is refused once
 * lives are booked against the link — so the only fix was to leave it wrong.
 */
function ProfileRow({
  p, reload, onRemove,
}: { p: Profile; reload: () => void; onRemove: () => void }) {
  const [edit, setEdit] = useState(false);
  const [label, setLabel] = useState(p.label);
  const [url, setUrl] = useState(p.url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rates, setRates] = useState(false);

  async function save() {
    setBusy(true); setError("");
    const res = await fetch(`/api/profiles/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || "Could not save.");
    setEdit(false);
    reload();
  }

  if (edit) {
    return (
      <div className="rounded-xl border border-primary/40 bg-white/70 p-3">
        <input className="input !py-2 text-sm" type="url" value={url} aria-label="TikTok URL"
          onChange={(e) => setUrl(e.target.value)} placeholder="https://www.tiktok.com/@username" />
        {error && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-danger">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />{error}
          </p>
        )}
        <div className="mt-2 flex items-center gap-2">
          <button className="btn !py-1.5 text-xs" onClick={save} disabled={busy || !url}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  : <Check className="h-3.5 w-3.5" aria-hidden="true" />}
            Save
          </button>
          <button className="btn-ghost !py-1.5 text-xs"
            onClick={() => { setEdit(false); setUrl(p.url); setError(""); }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white/60 px-3 py-2.5">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-ink">
          {handleFromUrl(p.url)}
          {(p.brands ?? []).map((b) => (
            <span key={b.id} className="chip bg-primary/10 text-primary">{b.name}</span>
          ))}
        </p>
        <a href={p.url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 truncate text-xs text-accent hover:underline">
          <span className="truncate">{p.url}</span>
          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
        </a>
        {/* The WhatsApp groups live on the Brand tab now — grouped by brand
            rather than repeated under every link that carries it. */}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {/* What each brand on this link pays — read-only, since the rate is
            the marketer's to set. */}
        <CommissionButton onClick={() => setRates(true)} />
        <button onClick={() => setEdit(true)}
          className="cursor-pointer rounded-lg p-2 text-muted-fg transition-colors duration-200 hover:bg-accent/10 hover:text-accent"
          aria-label={`Edit ${handleFromUrl(p.url)}`}>
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
        <button onClick={onRemove}
          className="cursor-pointer rounded-lg p-2 text-muted-fg transition-colors duration-200 hover:bg-danger/10 hover:text-danger"
          aria-label={`Delete ${handleFromUrl(p.url)}`}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <CommissionSummary open={rates} brands={p.brands ?? []}
        onClose={() => setRates(false)} />
    </div>
  );
}

/* ── TikTok profiles (moved here from the dashboard) ── */

function TikTokProfilesCard() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const d = await fetch("/api/profiles").then((r) => r.json());
    setProfiles(d.profiles || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const atMax = profiles.length >= MAX_PROFILES;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setLabel(""); setUrl(""); load();
  }

  async function remove(id: number) {
    if (!(await confirmDialog({ title: "Delete this profile link?", danger: true }))) return;
    await fetch(`/api/profiles/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <section className="card">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold text-ink">
          <Link2 className="h-4 w-4 text-primary" aria-hidden="true" />
          My TikTok Profiles
        </h2>
        <span className="chip bg-muted text-muted-fg">{profiles.length}/{MAX_PROFILES}</span>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-fg">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Loading…
        </p>
      ) : (
        <>
          <div className="space-y-2">
            {profiles.map((p) => (
              <ProfileRow key={p.id} p={p} reload={load} onRemove={() => remove(p.id)} />
            ))}
            {profiles.length === 0 && (
              <p className="rounded-xl border border-dashed border-line py-6 text-center text-sm text-muted-fg">
                No profiles yet — add your first one below.
              </p>
            )}
          </div>

          {!atMax ? (
            <form onSubmit={add} className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
              <input className="input" type="url" placeholder="https://www.tiktok.com/@username"
                value={url} onChange={(e) => setUrl(e.target.value)} required aria-label="TikTok URL" />
              <button className="btn"><Plus className="h-4 w-4" aria-hidden="true" />Add</button>
            </form>
          ) : (
            <p className="mt-4 text-xs font-medium text-muted-fg">
              Maximum of {MAX_PROFILES} links reached.
            </p>
          )}
          {error && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-danger">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />{error}
            </p>
          )}
        </>
      )}
    </section>
  );
}
