"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, UserPlus, IdCard, Check, MessageCircle } from "lucide-react";
import AuthShell from "@/components/AuthShell";

type Role = "affiliate" | "marketer" | "admin";

const roleMeta: Record<Role, { title: string; subtitle: string; tone: string }> = {
  affiliate: {
    title: "Affiliate Sign Up",
    subtitle: "Daftar akaun affiliate",
    tone: "bg-primary/10 text-primary",
  },
  marketer: {
    title: "Marketer Sign Up",
    subtitle: "Daftar akaun marketer",
    tone: "bg-accent/10 text-accent",
  },
  admin: {
    title: "Admin Sign Up",
    subtitle: "—",
    tone: "bg-accent/10 text-accent",
  },
};

export default function RegisterForm({ role }: { role: Role }) {
  const meta = roleMeta[role];

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Once created, we show the generated login rather than a fresh form.
  const [done, setDone] = useState<{
    staff_id: string; password: string; notified: boolean; notify_note: string | null;
  } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, address, role }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Pendaftaran gagal.");
    setDone({
      staff_id: data.staff_id, password: data.password,
      notified: data.notified, notify_note: data.notify_note,
    });
  }

  if (done) {
    return (
      <AuthShell subtitle={meta.subtitle}>
        <div className="card space-y-4">
          <div className="flex items-center gap-2 text-emerald-700">
            <Check className="h-5 w-5" aria-hidden="true" />
            <h2 className="text-lg font-bold">Akaun berjaya dibuka</h2>
          </div>
          <p className="text-sm text-muted-fg">
            Ini ID Staff anda. Password dihantar melalui WhatsApp — boleh ditukar
            selepas log masuk.
          </p>

          <div>
            <p className="label"><IdCard className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />ID Staff</p>
            <input className="input font-mono font-bold" value={done.staff_id} readOnly />
          </div>

          {/* Password is never shown on screen — it goes only to WhatsApp. If
              the message failed, the fallback is safe: the first password is
              the ID Staff itself, so nobody is ever locked out. */}
          <p className={`flex items-start gap-1.5 rounded-xl px-3 py-2 text-xs ${
            done.notified ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
          }`}>
            <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {done.notified
              ? "Password telah dihantar melalui WhatsApp."
              : `WhatsApp tidak dihantar${done.notify_note ? `: ${done.notify_note}` : ""}. Password pertama anda ialah ID Staff anda (${done.staff_id}).`}
          </p>

          <Link href="/login" className="btn w-full">Ke halaman log masuk</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell subtitle={meta.subtitle}>
      <form onSubmit={submit} className="card space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-ink">{meta.title}</h2>
          <span className={`chip ${meta.tone} uppercase`}>{role}</span>
        </div>

        {error && (
          <p className="flex items-start gap-2 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" className="input" autoComplete="name" value={name}
            onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="phone">WhatsApp No.</label>
          <input id="phone" className="input" type="tel" inputMode="tel" autoComplete="tel"
            placeholder="e.g. 0123456789" value={phone}
            onChange={(e) => setPhone(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="address">
            Address <span className="font-normal text-muted-fg">(optional)</span>
          </label>
          <textarea id="address" className="input resize-none" rows={2} autoComplete="street-address"
            placeholder="Alamat" value={address}
            onChange={(e) => setAddress(e.target.value)} />
        </div>

        <p className="rounded-xl bg-primary/5 px-3 py-2 text-xs text-muted-fg">
          ID Staff dijana automatik dan dipaparkan selepas daftar. Password
          dihantar melalui WhatsApp.
        </p>

        <button className="btn w-full" disabled={loading}>
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          {loading ? "Creating…" : "Create account"}
        </button>

        <p className="text-center text-sm text-muted-fg">
          Sudah ada akaun?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">Log masuk</Link>
        </p>
      </form>
    </AuthShell>
  );
}
