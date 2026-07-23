"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Check, Pencil, Trash2, Power } from "lucide-react";
import Modal from "@/components/Modal";
import { confirmDialog, alertDialog } from "@/lib/swal";

export type ManagedAffiliate = {
  id: number; name: string; email?: string | null; staff_id?: string | null;
  phone: string | null; address: string | null;
};

/**
 * Registering an affiliate here assigns them to this marketer immediately and
 * sends their login details by WhatsApp (message #1). The account is still
 * frozen until the marketer presses Aktifkan, which opens the dashboard and
 * sends the "system ready" WhatsApp (message #2).
 */
export function AffiliateModal({
  open, affiliate, onClose,
}: {
  open: boolean; affiliate: ManagedAffiliate | null; onClose: () => void;
}) {
  const router = useRouter();
  const [f, setF] = useState({ name: "", phone: "", address: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setF({
      name: affiliate?.name || "",
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

    // On edit an empty password means "leave the login alone". On create there
    // is no password field: the Staff ID and its matching first password are
    // generated server-side.
    const body: Record<string, string> = {
      name: f.name, phone: f.phone, address: f.address,
    };
    if (affiliate && f.password) body.password = f.password;

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

    // Login details (WhatsApp #1) are sent at create. The account is still
    // frozen: point the marketer at setting up TikTok links then pressing
    // Aktifkan, and say plainly if the message did not go out.
    if (!affiliate && data.staff_id) {
      const sent = data.notified
        ? `Butiran login (ID Staff + password) telah dihantar kepada affiliate melalui WhatsApp.`
        : `WhatsApp TIDAK dihantar${data.notify_note ? `: ${data.notify_note}` : ""}. Sila beri ID Staff kepada affiliate secara manual (password = ID Staff).`;
      await alertDialog({
        title: "Affiliate didaftarkan",
        text: `ID Staff: ${data.staff_id}\n\n${sent}\n\nAkaun belum aktif. Sediakan link TikTok mereka, kemudian tekan "Aktifkan" untuk buka dashboard dan hantar notifikasi kedua "sistem sedia".`,
        variant: data.notified ? "success" : "warning",
      });
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="af-phone">No WhatsApp</label>
            <input id="af-phone" className="input" value={f.phone} onChange={set("phone")}
              required placeholder="0123456789" />
          </div>
          {affiliate && (
            <div>
              <label className="label" htmlFor="af-pass">
                Reset Password <span className="font-normal text-muted-fg">(biar kosong = tak tukar)</span>
              </label>
              <input id="af-pass" type="text" className="input" value={f.password}
                onChange={set("password")} placeholder="••••••" />
            </div>
          )}
        </div>
        <div>
          <label className="label" htmlFor="af-addr">Alamat <span className="font-normal text-muted-fg">(optional)</span></label>
          <input id="af-addr" className="input" value={f.address} onChange={set("address")}
            placeholder="Alamat penghantaran sample" />
        </div>

        {!affiliate && (
          <p className="rounded-xl bg-primary/5 px-3 py-2 text-xs text-muted-fg">
            ID Staff (AFL-###) dijana automatik dan butiran login dihantar terus
            melalui WhatsApp. Affiliate belum aktif — sediakan link TikTok mereka,
            kemudian tekan "Aktifkan" untuk buka dashboard dan hantar notifikasi
            "sistem sedia".
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
      const ok = await confirmDialog({
        title: `Padam affiliate "${data.name}" (${data.staff_id ?? ""})?`,
        text:
          (lines ? `This affects:\n${lines}\n\n` : "") +
          `${data.note}\n\nThis cannot be undone.`,
        danger: true,
      });

      if (!ok) { setBusy(false); return; }
      res = await fetch(`/api/marketer/affiliates/${affiliate.id}?force=1`, { method: "DELETE" });
      data = await res.json();
    }

    setBusy(false);
    if (!res.ok)
      return alertDialog({ title: "Could not delete", text: data.error, variant: "error" });
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

/**
 * The one-time Activate button.
 *
 * An affiliate is created frozen; pressing this opens their dashboard and
 * sends their login details by WhatsApp. Set up their TikTok links first, then
 * activate — that is the moment they are told they can log in. Once active it
 * becomes a plain "Aktif" badge with no way back, since re-notifying would
 * only confuse.
 */
export function ActivateAffiliate({
  id, activated, name,
}: { id: number; activated: boolean; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (activated) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
        <Check className="h-3 w-3" aria-hidden="true" />Aktif
      </span>
    );
  }

  async function activate() {
    const ok = await confirmDialog({
      title: `Aktifkan ${name}?`,
      text: "Dashboard mereka akan terbuka dan notifikasi \"sistem sedia\" dihantar melalui WhatsApp. Pastikan link TikTok sudah disediakan.",
      confirmText: "Aktifkan",
    });
    if (!ok) return;
    setBusy(true);
    const res = await fetch(`/api/marketer/affiliates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activate: true }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      return alertDialog({ title: "Tidak boleh aktifkan", text: d.error, variant: "error" });
    }
    if (d.notified === false) {
      await alertDialog({
        title: "Diaktifkan",
        text: `Akaun sudah aktif, tetapi notifikasi "sistem sedia" tidak dihantar${d.notify_note ? `: ${d.notify_note}` : ""}. Affiliate masih boleh log masuk — butiran login sudah dihantar semasa pendaftaran.`,
        variant: "warning",
      });
    }
    router.refresh();
  }

  return (
    <button onClick={activate} disabled={busy} type="button"
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-fg shadow-lift transition-opacity duration-200 hover:opacity-90 disabled:opacity-50">
      {busy
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        : <Power className="h-3.5 w-3.5" aria-hidden="true" />}
      Aktifkan
    </button>
  );
}
