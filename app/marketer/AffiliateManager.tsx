"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Check, Pencil, Trash2 } from "lucide-react";
import Modal from "@/components/Modal";
import { confirmDialog, alertDialog } from "@/lib/swal";

export type ManagedAffiliate = {
  id: number; name: string; email?: string | null; staff_id?: string | null;
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

    // Hand the generated login over to the marketer, and say plainly if the
    // WhatsApp did not go out — otherwise nobody knows the affiliate's details.
    if (!affiliate && data.staff_id) {
      const sent = data.notified
        ? "Butiran juga dihantar melalui WhatsApp."
        : `WhatsApp TIDAK dihantar${data.notify_note ? `: ${data.notify_note}` : ""}. Sila beri butiran ini secara manual.`;
      await alertDialog({
        title: "Affiliate dibuka",
        text: `ID Staff: ${data.staff_id}\nPassword: ${data.password}\n\n${sent}`,
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
            ID Staff (AFL-###) dan password akan dijana automatik dan dihantar
            melalui WhatsApp. Affiliate boleh login serta-merta dan tukar
            password kemudian.
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
