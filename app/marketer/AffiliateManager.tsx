"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Check, Pencil, Trash2 } from "lucide-react";
import Modal from "@/components/Modal";

export type ManagedAffiliate = {
  id: number; name: string; email: string;
  phone: string | null; address: string | null;
};

/**
 * Registering an affiliate here assigns them to this marketer immediately, so
 * unlike self-registration there is no waiting for admin approval — the
 * marketer adding them IS the approval. The affiliate still gets the same
 * welcome WhatsApp.
 */
export function AffiliateModal({
  open, affiliate, onClose,
}: {
  open: boolean; affiliate: ManagedAffiliate | null; onClose: () => void;
}) {
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", phone: "", address: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setF({
      name: affiliate?.name || "",
      email: affiliate?.email || "",
      phone: affiliate?.phone || "",
      address: affiliate?.address || "",
      password: "",
    });
    setError(""); setNote("");
  }, [open, affiliate]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(""); setNote("");

    // On edit an empty password means "leave the login alone", so it is only
    // sent when the marketer actually typed a new one.
    const body: Record<string, string> = {
      name: f.name, email: f.email, phone: f.phone, address: f.address,
    };
    if (f.password || !affiliate) body.password = f.password;

    const res = await fetch(
      affiliate ? `/api/marketer/affiliates/${affiliate.id}` : "/api/marketer/affiliates",
      {
        method: affiliate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setError(data.error || "Save failed.");

    // Say plainly when the welcome message did not go out — silence would read
    // as "notified" and the affiliate would be left waiting for a link.
    if (!affiliate && data.notified === false && data.notify_note) {
      alert(`Affiliate created.\n\nWhatsApp not sent: ${data.notify_note}`);
    }
    onClose();
    router.refresh();
  }

  return (
    <Modal open={open} onClose={onClose}
      title={affiliate ? "Update Affiliate" : "Add Affiliate"}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label" htmlFor="af-name">Full name</label>
          <input id="af-name" className="input" value={f.name} onChange={set("name")}
            required autoFocus placeholder="e.g. Nur Aisyah" />
        </div>
        <div>
          <label className="label" htmlFor="af-email">Email</label>
          <input id="af-email" type="email" className="input" value={f.email}
            onChange={set("email")} required placeholder="nama@email.com" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="af-phone">No WhatsApp</label>
            <input id="af-phone" className="input" value={f.phone} onChange={set("phone")}
              required placeholder="0123456789" />
          </div>
          <div>
            <label className="label" htmlFor="af-pass">
              Password {affiliate && <span className="font-normal text-muted-fg">(biar kosong = tak tukar)</span>}
            </label>
            <input id="af-pass" type="text" className="input" value={f.password}
              onChange={set("password")} required={!affiliate}
              placeholder={affiliate ? "••••••" : "min. 6 aksara"} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="af-addr">Alamat</label>
          <input id="af-addr" className="input" value={f.address} onChange={set("address")}
            required placeholder="Alamat penghantaran sample" />
        </div>

        {!affiliate && (
          <p className="rounded-xl bg-primary/5 px-3 py-2 text-xs text-muted-fg">
            Affiliate ini terus di bawah anda — boleh login serta-merta dan akan
            terima notifikasi WhatsApp selamat datang.
          </p>
        )}

        {error && (
          <p className="flex items-center gap-1.5 text-sm text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{error}
          </p>
        )}
        {note && <p className="text-sm text-muted-fg">{note}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={saving}>
            {saving
              ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Saving…</>
              : <><Check className="h-4 w-4" aria-hidden="true" />Save</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Edit / delete buttons for one affiliate card. */
export function AffiliateActions({
  affiliate, onEdit,
}: {
  affiliate: ManagedAffiliate; onEdit: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    let res = await fetch(`/api/marketer/affiliates/${affiliate.id}`, { method: "DELETE" });
    let data = await res.json();

    // First call always refuses and reports what would go, so the operator
    // confirms against the real list rather than a generic warning.
    if (res.status === 409 && data.needsConfirm) {
      const lines = Object.entries(data.impact as Record<string, number>)
        .filter(([, n]) => n > 0)
        .map(([k, n]) => `  • ${n} ${k.replace(/_/g, " ")}`)
        .join("\n");
      const ok = confirm(
        `Delete affiliate "${data.name}" (${data.email})?\n\n` +
        (lines ? `This affects:\n${lines}\n\n` : "") +
        `${data.note}\n\nThis cannot be undone.`
      );
      if (!ok) { setBusy(false); return; }
      res = await fetch(`/api/marketer/affiliates/${affiliate.id}?force=1`, { method: "DELETE" });
      data = await res.json();
    }

    setBusy(false);
    if (!res.ok) return alert(data.error || "Could not delete.");
    router.refresh();
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <button onClick={onEdit} type="button"
        className="cursor-pointer rounded-lg p-2 text-muted-fg transition-colors duration-200 hover:bg-accent/10 hover:text-accent"
        aria-label={`Edit ${affiliate.name}`} title="Update affiliate">
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </button>
      <button onClick={remove} type="button" disabled={busy}
        className="cursor-pointer rounded-lg p-2 text-muted-fg transition-colors duration-200 hover:bg-danger/10 hover:text-danger disabled:opacity-50"
        aria-label={`Delete ${affiliate.name}`} title="Delete affiliate">
        {busy
          ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          : <Trash2 className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
}
