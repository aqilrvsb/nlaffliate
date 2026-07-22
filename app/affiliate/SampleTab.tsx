"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PackagePlus, Package, Truck, Check, Clock, Loader2, AlertCircle,
  Trash2, PackageCheck, MapPin, Phone, UserRound, StickyNote,
} from "lucide-react";
import Modal from "@/components/Modal";
import { fmtDate } from "@/lib/format";

export type SampleProduct = { id: number; name: string; image_url: string | null };
export type SampleRequest = {
  id: number;
  full_name: string;
  phone: string | null;
  address: string | null;
  note: string | null;
  brand_id: number | null;
  brand_name: string | null;
  marketer_name: string | null;
  status: "pending" | "processing" | "shipped" | "received";
  tracking_number: string | null;
  courier: string | null;
  created_at: string;
  products: SampleProduct[];
};

export const SAMPLE_STATUS: Record<
  string,
  { label: string; cls: string; Icon: typeof Clock }
> = {
  pending:    { label: "Pending",    cls: "bg-amber-100 text-amber-700",     Icon: Clock },
  processing: { label: "Processing", cls: "bg-sky-100 text-sky-700",         Icon: Package },
  shipped:    { label: "Shipped",    cls: "bg-violet-100 text-violet-700",   Icon: Truck },
  received:   { label: "Received",   cls: "bg-emerald-100 text-emerald-700", Icon: Check },
};

export function SampleStatusBadge({ status }: { status: string }) {
  const s = SAMPLE_STATUS[status] ?? {
    label: status, cls: "bg-muted text-muted-fg", Icon: Clock,
  };
  const Icon = s.Icon;
  return (
    <span className={`chip ${s.cls}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {s.label}
    </span>
  );
}

export default function SampleTab() {
  const [requests, setRequests] = useState<SampleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const d = await fetch("/api/samples").then((r) => r.json());
    setRequests(d.requests || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function confirmReceived(id: number) {
    await fetch(`/api/samples/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "receive" }),
    });
    load();
  }

  async function withdraw(id: number) {
    if (!confirm("Cancel this sample request?")) return;
    await fetch(`/api/samples/${id}`, { method: "DELETE" });
    load();
  }

  if (loading)
    return (
      <p className="flex items-center gap-2 text-sm text-muted-fg">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Loading…
      </p>
    );

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="section-title">Sample Request</h2>
        <button className="btn !py-2" onClick={() => setOpen(true)}>
          <PackagePlus className="h-4 w-4" aria-hidden="true" />
          Request Sample
        </button>
      </div>

      {requests.length === 0 ? (
        <p className="card text-center text-sm text-muted-fg">
          No sample requests yet — click Request Sample to make your first one.
        </p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="card space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <SampleStatusBadge status={r.status} />
                    {r.brand_name && (
                      <span className="chip bg-primary/10 text-primary">{r.brand_name}</span>
                    )}
                    <span className="text-xs text-muted-fg">
                      {fmtDate(String(r.created_at).slice(0, 10))}
                    </span>
                  </div>
                  <p className="mt-2 font-bold text-ink">{r.full_name}</p>
                  <p className="text-xs text-muted-fg">
                    {r.phone}
                    {r.address ? ` · ${r.address}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {r.status === "shipped" && (
                    <button className="btn !py-2" onClick={() => confirmReceived(r.id)}>
                      <PackageCheck className="h-4 w-4" aria-hidden="true" />
                      Received
                    </button>
                  )}
                  {r.status === "pending" && (
                    <button
                      onClick={() => withdraw(r.id)}
                      className="cursor-pointer rounded-lg p-2 text-muted-fg transition-colors duration-200 hover:bg-danger/10 hover:text-danger"
                      aria-label="Cancel request"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              {r.note && (
                <p className="rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-fg">
                  <StickyNote className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />
                  {r.note}
                </p>
              )}

              {r.products.length > 0 && (
                <div>
                  <p className="label">Sample diberi ({r.products.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {r.products.map((p) => (
                      <span key={p.id}
                        className="flex items-center gap-2 rounded-xl border border-line bg-white/60 py-1.5 pl-1.5 pr-3">
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-fg">
                            <Package className="h-4 w-4" aria-hidden="true" />
                          </span>
                        )}
                        <span className="text-sm font-semibold text-ink">{p.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {r.tracking_number && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-violet-200 bg-violet-50/60 px-3 py-2">
                  <Truck className="h-4 w-4 text-violet-600" aria-hidden="true" />
                  <span className="text-sm text-ink">
                    {r.courier ? `${r.courier} · ` : ""}
                    <span className="font-bold">{r.tracking_number}</span>
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <RequestModal open={open} onClose={() => setOpen(false)} onSaved={load} />
    </>
  );
}

/* ── Request modal — prefilled from the affiliate's profile ── */

function RequestModal({
  open, onClose, onSaved,
}: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [brand, setBrand] = useState("");
  const [brands, setBrands] = useState<{ id: number; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  // Prefill on open so the affiliate normally just hits Submit, but every
  // field stays editable in case this parcel goes somewhere else.
  useEffect(() => {
    if (!open) return;
    setError(""); setReady(false); setBrand("");
    Promise.all([
      fetch("/api/profile").then((r) => r.json()),
      fetch("/api/brands").then((r) => r.json()),
    ]).then(([me, br]) => {
      setName(me.profile?.name || "");
      setPhone(me.profile?.phone || "");
      setAddress(me.profile?.address || "");
      setNote("");
      setBrands(br.brands || []);
      setReady(true);
    });
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const res = await fetch("/api/samples", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: name, phone, address, note, brand_id: brand }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setError(data.error || "Could not submit.");
    onClose(); onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title="Request Sample">
      {!ready ? (
        <p className="flex items-center gap-2 py-6 text-sm text-muted-fg">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Loading your details…
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label" htmlFor="s-brand">Brand</label>
            <select id="s-brand" className="input cursor-pointer" value={brand}
              onChange={(e) => setBrand(e.target.value)} required>
              <option value="">— Pilih brand —</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {brands.length === 0 && (
              <p className="mt-1 text-xs text-muted-fg">
                Marketer anda belum tambah brand — hubungi mereka dahulu.
              </p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="s-name">Full Name</label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg"
                aria-hidden="true" />
              <input id="s-name" className="input pl-9" value={name}
                onChange={(e) => setName(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="s-phone">Phone</label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg"
                aria-hidden="true" />
              <input id="s-phone" className="input pl-9" type="tel" inputMode="tel"
                value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="s-address">Address</label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-fg"
                aria-hidden="true" />
              <textarea id="s-address" className="input resize-none pl-9" rows={3}
                value={address} onChange={(e) => setAddress(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="s-note">Nota</label>
            <textarea id="s-note" className="input resize-none" rows={3}
              placeholder="Contoh: nak sample untuk live hujung minggu ni"
              value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-sm text-danger">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />{error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn" disabled={saving}>
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Submitting…</>
                : "Submit"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
