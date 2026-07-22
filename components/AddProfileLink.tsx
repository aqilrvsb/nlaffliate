"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, AlertCircle, Trash2 } from "lucide-react";
import { confirmDialog, alertDialog } from "@/lib/swal";

/**
 * Add a TikTok link on someone else's behalf.
 *
 * Affiliates often get these wrong — a Studio URL, a share link with tracking
 * junk — and the marketer is the one chasing them to fix it, so they can add
 * it directly. No label is asked for: the link is named by the brand assigned
 * to it, exactly as on the affiliate's own page.
 */
export default function AddProfileLink({ userId }: { userId: number }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, user_id: userId }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(d.error || "Could not add.");
    setUrl("");
    router.refresh();
  }

  return (
    <form onSubmit={add} className="mt-2">
      <div className="flex items-center gap-1.5">
        <input className="input !py-1.5 text-xs" type="url" required value={url}
          onChange={(e) => setUrl(e.target.value)}
          aria-label="TikTok URL"
          placeholder="https://www.tiktok.com/@username" />
        <button className="btn shrink-0 !px-3 !py-1.5 text-xs" disabled={busy}>
          {busy
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            : <><Plus className="h-3.5 w-3.5" aria-hidden="true" />Add</>}
        </button>
      </div>
      {error && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-danger">
          <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />{error}
        </p>
      )}
    </form>
  );
}

/**
 * Remove a link the marketer or affiliate added by mistake. The API refuses
 * once lives are booked on it — that history would be orphaned — and says so
 * rather than failing silently.
 */
export function DeleteProfileLink({ id, name }: { id: number; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!(await confirmDialog({ title: `Padam link "${name}"?`, danger: true }))) return;
    setBusy(true);
    const res = await fetch(`/api/profiles/${id}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      return alertDialog({ title: "Tidak boleh padam", text: d.error, variant: "error" });
    }
    router.refresh();
  }

  return (
    <button onClick={remove} disabled={busy} type="button"
      className="shrink-0 cursor-pointer rounded-lg p-1.5 text-muted-fg transition-colors duration-200 hover:bg-danger/10 hover:text-danger disabled:opacity-50"
      aria-label={`Padam ${name}`} title="Padam link">
      {busy
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
    </button>
  );
}
