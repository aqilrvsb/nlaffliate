"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, AlertCircle, Trash2, Pencil, Check } from "lucide-react";
import { confirmDialog, alertDialog } from "@/lib/swal";
import Modal from "@/components/Modal";

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
 * Edit a link's TikTok URL — affiliates paste the wrong one (Studio link,
 * tracking junk) and the marketer fixes it. Any marketer managing the affiliate
 * may edit, since the links are shared.
 */
export function EditProfileLink({ id, url }: { id: number; url: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await fetch(`/api/profiles/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: val }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(d.error || "Gagal simpan.");
    setOpen(false); router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => { setVal(url); setError(""); setOpen(true); }}
        className="shrink-0 cursor-pointer rounded-lg p-1.5 text-muted-fg transition-colors duration-200 hover:bg-accent/10 hover:text-accent"
        aria-label="Edit link" title="Edit link">
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit link TikTok">
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="label" htmlFor={`edit-link-${id}`}>TikTok URL</label>
            <input id={`edit-link-${id}`} className="input" type="url" required value={val}
              autoFocus onChange={(e) => setVal(e.target.value)}
              placeholder="https://www.tiktok.com/@username" />
          </div>
          {error && (
            <p className="flex items-center gap-1.5 text-sm text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn" disabled={busy}>
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Saving…</>
                    : <><Check className="h-4 w-4" aria-hidden="true" />Save</>}
            </button>
          </div>
        </form>
      </Modal>
    </>
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
