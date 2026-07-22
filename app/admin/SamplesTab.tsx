"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Package, Truck, Loader2, AlertCircle, Check, PackageCheck,
  Phone, MapPin, StickyNote, Boxes,
} from "lucide-react";
import Modal from "@/components/Modal";
import TabBar from "@/components/TabBar";
import { useSearchParams } from "next/navigation";
import { fmtDate } from "@/lib/format";
import { SampleStatusBadge, type SampleRequest } from "../affiliate/SampleTab";
import type { Product } from "./ProductsTab";

type AdminSample = SampleRequest & {
  affiliate_name: string;
  affiliate_email: string;
};

const FILTERS = [
  { key: "all",        label: "All",        icon: Boxes },
  { key: "pending",    label: "Pending",    icon: Package },
  { key: "processing", label: "Processing", icon: Package },
  { key: "shipped",    label: "Shipped",    icon: Truck },
  { key: "received",   label: "Received",   icon: PackageCheck },
];

export default function SamplesTab() {
  const [requests, setRequests] = useState<AdminSample[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState<AdminSample | null>(null);
  const [tracking, setTracking] = useState<AdminSample | null>(null);

  const load = useCallback(async () => {
    const [s, p] = await Promise.all([
      fetch("/api/samples").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ]);
    setRequests(s.requests || []);
    setProducts(p.products || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const params = useSearchParams();
  const sub = params.get("sample") || "all";
  const [brand, setBrand] = useState("");

  const byStatus = sub === "all" ? requests : requests.filter((r) => r.status === sub);
  const shown = brand ? byStatus.filter((r) => r.brand_name === brand) : byStatus;

  const brandNames = [...new Set(requests.map((r) => r.brand_name).filter(Boolean))] as string[];

  if (loading)
    return (
      <p className="flex items-center gap-2 text-sm text-muted-fg">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Loading…
      </p>
    );

  const count = (k: string) =>
    k === "all" ? requests.length : requests.filter((r) => r.status === k).length;

  return (
    <>
      <h2 className="section-title mb-3">Sample Requests</h2>

      <TabBar
        active={sub}
        param="sample"
        tabs={FILTERS.map((f) => ({
          key: f.key,
          label: `${f.label} (${count(f.key)})`,
          icon: f.icon,
        }))}
      />

      {brandNames.length > 0 && (
        <div className="card mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[220px]">
            <label className="label" htmlFor="smp-brand">Brand</label>
            <select id="smp-brand" className="input cursor-pointer !py-2 text-sm"
              value={brand} onChange={(e) => setBrand(e.target.value)}>
              <option value="">All Brands</option>
              {brandNames.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <p className="pb-2 text-xs text-muted-fg">
            {brand ? "Menunjukkan satu brand sahaja." : "Menunjukkan semua brand."}
          </p>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {shown.length === 0 && (
          <p className="card text-center text-sm text-muted-fg">
            No sample requests here.
          </p>
        )}

        {shown.map((r) => (
          <div key={r.id} className="card space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <SampleStatusBadge status={r.status} />
                  {r.brand_name && (
                    <span className="chip bg-primary/10 text-primary">{r.brand_name}</span>
                  )}
                  {r.marketer_name && (
                    <span className="chip bg-accent/10 text-accent">{r.marketer_name}</span>
                  )}
                  <span className="text-xs text-muted-fg">
                    {fmtDate(String(r.created_at).slice(0, 10))}
                  </span>
                </div>
                <p className="mt-2 font-bold text-ink">{r.affiliate_name}</p>
                <p className="text-xs text-muted-fg">{r.affiliate_email}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button className="btn-ghost !py-2" onClick={() => setPicking(r)}>
                  <Package className="h-4 w-4" aria-hidden="true" />
                  {r.products.length > 0 ? "Edit products" : "Pick products"}
                </button>
                <button className="btn !py-2" onClick={() => setTracking(r)}
                  disabled={r.products.length === 0}
                  title={r.products.length === 0 ? "Pick the products first" : undefined}>
                  <Truck className="h-4 w-4" aria-hidden="true" />
                  {r.tracking_number ? "Edit tracking" : "Add tracking"}
                </button>
              </div>
            </div>

            <div className="grid gap-2 rounded-xl border border-line bg-white/60 p-3 text-sm sm:grid-cols-3">
              <p className="text-ink"><span className="label !mb-0">Name</span>{r.full_name}</p>
              <p className="text-ink">
                <span className="label !mb-0">Phone</span>
                <Phone className="mr-1 inline h-3 w-3 text-muted-fg" aria-hidden="true" />
                {r.phone || "—"}
              </p>
              <p className="text-ink">
                <span className="label !mb-0">Address</span>
                <MapPin className="mr-1 inline h-3 w-3 text-muted-fg" aria-hidden="true" />
                {r.address || "—"}
              </p>
            </div>

            {r.note && (
              <p className="rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-fg">
                <StickyNote className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />
                {r.note}
              </p>
            )}

            {r.products.length > 0 && (
              <div>
                <p className="label">Sample given ({r.products.length})</p>
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

      <PickProductsModal request={picking} products={products}
        onClose={() => setPicking(null)} onSaved={load} />
      <TrackingModal request={tracking}
        onClose={() => setTracking(null)} onSaved={load} />
    </>
  );
}

/* ── Bulk product picker — moves pending -> processing ── */

function PickProductsModal({
  request, products, onClose, onSaved,
}: {
  request: AdminSample | null;
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [picked, setPicked] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!request) return;
    setPicked(request.products.map((p) => p.id));
    setError("");
  }, [request]);

  function toggle(id: number) {
    setPicked((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
  }

  async function save() {
    if (!request) return;
    setSaving(true); setError("");
    const res = await fetch(`/api/samples/${request.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_products", product_ids: picked }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setError(data.error || "Could not save.");
    onClose(); onSaved();
  }

  return (
    <Modal open={!!request} onClose={onClose}
      title={request ? `Sample for ${request.affiliate_name}` : "Sample"}>
      <p className="mb-3 text-sm text-muted-fg">
        Tick every product being sent. Saving moves a pending request to{" "}
        <span className="font-semibold text-ink">Processing</span>.
      </p>

      {products.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line py-6 text-center text-sm text-muted-fg">
          No products in the catalogue yet — add them in the Product tab first.
        </p>
      ) : (
        <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
          {products.map((p) => {
            const on = picked.includes(p.id);
            return (
              <label key={p.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition-colors duration-200 ${
                  on ? "border-primary bg-primary/5" : "border-line bg-white/60 hover:bg-white"
                }`}>
                <input type="checkbox" checked={on} onChange={() => toggle(p.id)}
                  className="h-4 w-4 cursor-pointer accent-primary" />
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-fg">
                    <Package className="h-4 w-4" aria-hidden="true" />
                  </span>
                )}
                <span className="flex-1 text-sm font-semibold text-ink">{p.name}</span>
              </label>
            );
          })}
        </div>
      )}

      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-danger">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />{error}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-sm text-muted-fg">{picked.length} selected</span>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={save} disabled={saving || picked.length === 0}>
            {saving
              ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Saving…</>
              : <><Check className="h-4 w-4" aria-hidden="true" />Update sample</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Tracking number — moves processing -> shipped ── */

function TrackingModal({
  request, onClose, onSaved,
}: {
  request: AdminSample | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [courier, setCourier] = useState("");
  const [number, setNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!request) return;
    setCourier(request.courier || "");
    setNumber(request.tracking_number || "");
    setError("");
  }, [request]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!request) return;
    setSaving(true); setError("");
    const res = await fetch(`/api/samples/${request.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "set_tracking", tracking_number: number, courier,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setError(data.error || "Could not save.");
    onClose(); onSaved();
  }

  return (
    <Modal open={!!request} onClose={onClose} title="Tracking Number">
      <form onSubmit={save} className="space-y-4">
        <p className="text-sm text-muted-fg">
          Saving marks this parcel{" "}
          <span className="font-semibold text-ink">Shipped</span>, and the
          affiliate gets a Received button to confirm arrival.
        </p>

        <div>
          <label className="label" htmlFor="tr-courier">Courier</label>
          <input id="tr-courier" className="input" value={courier}
            onChange={(e) => setCourier(e.target.value)}
            placeholder="e.g. J&T, Pos Laju, Ninja Van" />
        </div>

        <div>
          <label className="label" htmlFor="tr-number">Tracking number</label>
          <input id="tr-number" className="input" value={number}
            onChange={(e) => setNumber(e.target.value)} required
            placeholder="e.g. JT1234567890" />
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
              ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Saving…</>
              : <><Truck className="h-4 w-4" aria-hidden="true" />Mark shipped</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}
