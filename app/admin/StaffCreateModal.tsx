"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Check } from "lucide-react";
import Modal from "@/components/Modal";
import { alertDialog } from "@/lib/swal";

/**
 * Admin provisions a marketer.
 *
 * No email, no chosen password — the Staff ID (MNL-###) and its matching first
 * password are generated server-side and handed over by WhatsApp. Admin sees
 * them on screen too, so a failed message never leaves the account unusable.
 */
export default function StaffCreateModal({
  open, onClose,
}: {
  open: boolean; onClose: () => void;
}) {
  const router = useRouter();
  const [f, setF] = useState({ name: "", phone: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setF({ name: "", phone: "", address: "" });
    setError("");
  }, [open]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, role: "marketer" }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setError(data.error || "Gagal.");

    const sent = data.notified
      ? "Butiran login (ID Staff + password) telah dihantar kepada marketer melalui WhatsApp."
      : `WhatsApp TIDAK dihantar${data.notify_note ? `: ${data.notify_note}` : ""}. Sila beri ID Staff kepada marketer secara manual (password = ID Staff).`;
    await alertDialog({
      title: "Marketer dibuka",
      text: `ID Staff: ${data.staff_id}\n\n${sent}`,
      variant: data.notified ? "success" : "warning",
    });
    onClose();
    router.refresh();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Marketer">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label" htmlFor="mk-name">Full name</label>
          <input id="mk-name" className="input" value={f.name} onChange={set("name")}
            required autoFocus placeholder="e.g. Ahmad Faiz" />
        </div>
        <div>
          <label className="label" htmlFor="mk-phone">No WhatsApp</label>
          <input id="mk-phone" className="input" value={f.phone} onChange={set("phone")}
            required placeholder="0123456789" />
        </div>
        <div>
          <label className="label" htmlFor="mk-addr">
            Alamat <span className="font-normal text-muted-fg">(optional)</span>
          </label>
          <input id="mk-addr" className="input" value={f.address} onChange={set("address")}
            placeholder="Alamat" />
        </div>

        <p className="rounded-xl bg-primary/5 px-3 py-2 text-xs text-muted-fg">
          ID Staff (MNL-###) dan password dijana automatik dan dihantar melalui
          WhatsApp. Marketer boleh login serta-merta dan tukar password kemudian.
        </p>

        {error && (
          <p className="flex items-center gap-1.5 text-sm text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{error}
          </p>
        )}

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
