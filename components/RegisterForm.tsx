"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, UserPlus } from "lucide-react";
import AuthShell from "@/components/AuthShell";

type Role = "affiliate" | "marketer" | "admin";

const roleMeta: Record<Role, { title: string; subtitle: string; home: string; tone: string }> = {
  affiliate: {
    title: "Affiliate Sign Up",
    subtitle: "Create your affiliate account",
    home: "/affiliate",
    tone: "bg-primary/10 text-primary",
  },
  marketer: {
    title: "Marketer Sign Up",
    subtitle: "Create your marketer account",
    home: "/marketer",
    tone: "bg-accent/10 text-accent",
  },
  admin: {
    title: "Admin Sign Up",
    subtitle: "Create an admin account",
    home: "/admin",
    tone: "bg-accent/10 text-accent",
  },
};

export default function RegisterForm({ role }: { role: Role }) {
  const router = useRouter();
  const meta = roleMeta[role];

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, email, address, password, role }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Registration failed");
    router.push(meta.home);
    router.refresh();
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
            onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="phone">WhatsApp No.</label>
          <input id="phone" className="input" type="tel" inputMode="tel" autoComplete="tel"
            placeholder="e.g. 0123456789" value={phone}
            onChange={(e) => setPhone(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="address">Address</label>
          <textarea id="address" className="input resize-none" rows={2} autoComplete="street-address"
            placeholder="Your address" value={address}
            onChange={(e) => setAddress(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" className="input" type="password" autoComplete="new-password"
            value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <p className="mt-1 text-xs text-muted-fg">At least 6 characters.</p>
        </div>

        <button className="btn w-full" disabled={loading}>
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          {loading ? "Creating…" : "Create account"}
        </button>

        <p className="text-center text-sm text-muted-fg">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">Log in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
