"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, LogIn } from "lucide-react";
import AuthShell from "@/components/AuthShell";

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Login failed");
    router.push(
      data.role === "admin" ? "/admin" : data.role === "marketer" ? "/marketer" : "/affiliate"
    );
    router.refresh();
  }

  return (
    <AuthShell subtitle="TikTok Live scheduling & results">
      <form onSubmit={submit} className="card space-y-4">
        <h2 className="text-lg font-bold text-ink">Log in</h2>

        {error && (
          <p className="flex items-start gap-2 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        <div>
          <label className="label" htmlFor="login">ID Staff</label>
          <input id="login" className="input font-mono" autoComplete="username"
            placeholder="MNL-001 / AFL-001"
            value={login} onChange={(e) => setLogin(e.target.value)} required autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" className="input" type="password" autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        <button className="btn w-full" disabled={loading}>
          <LogIn className="h-4 w-4" aria-hidden="true" />
          {loading ? "Logging in…" : "Log in"}
        </button>

      </form>
    </AuthShell>
  );
}
