"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Tag, Plus, Pencil, Trash2, Loader2, AlertCircle, Check,
} from "lucide-react";
// Tag doubles as the brand-filter icon below.
import Modal from "@/components/Modal";

export type Brand = { id: number; name: string; catalogue_id?: number | null };
type CatalogueBrand = { id: number; name: string };

export default function BrandsTab({ onChange }: { onChange?: () => void }) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const d = await fetch("/api/brands").then((r) => r.json());
    setBrands(d.brands || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function remove(b: Brand) {
    if (!confirm(`Delete "${b.name}"?`)) return;
    setError("");

    let res = await fetch(`/api/brands/${b.id}`, { method: "DELETE" });
    let data = await res.json();

    // The API refuses when the brand still carries data and reports exactly
    // what would go with it, so the second prompt can name the cost.
    if (res.status === 409 && data.needsConfirm) {
      if (!confirm(`${data.error}\n\nDelete "${b.name}" anyway?`)) return;
      res = await fetch(`/api/brands/${b.id}?force=1`, { method: "DELETE" });
      data = await res.json();
    }

    if (!res.ok) return setError(data.error || "Delete failed.");
    load(); onChange?.();
  }

  if (loading)
    return (
      <p className="flex items-center gap-2 text-sm text-muted-fg">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Loading…
      </p>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="section-title">Brand</h2>
          <p className="text-sm text-muted-fg">
            Brand anda. Pilih dari senarai brand admin — Overall dan Pillar
            disimpan mengikut brand.
          </p>
        </div>
        <button className="btn !py-2"
          onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Brand
        </button>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-sm text-danger">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />{error}
        </p>
      )}

      {brands.length === 0 ? (
        <p className="card text-center text-sm text-muted-fg">
          Belum ada brand — klik Add Brand dan pilih dari senarai admin.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((b) => (
            <div key={b.id} className="card flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Tag className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="min-w-0 flex-1 truncate font-bold text-ink">{b.name}</p>
              <div className="flex shrink-0 items-center gap-1">
                {/* Adopted brands carry the admin's name, so only a brand the
                    marketer typed themselves is theirs to rename. */}
                {!b.catalogue_id && (
                <button onClick={() => { setEditing(b); setOpen(true); }}
                  className="cursor-pointer rounded-lg p-2 text-muted-fg transition-colors duration-200 hover:bg-accent/10 hover:text-accent"
                  aria-label={`Edit ${b.name}`}>
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
                )}
                <button onClick={() => remove(b)}
                  className="cursor-pointer rounded-lg p-2 text-muted-fg transition-colors duration-200 hover:bg-danger/10 hover:text-danger"
                  aria-label={`Delete ${b.name}`}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <BrandModal open={open} brand={editing}
        onClose={() => setOpen(false)}
        onSaved={() => { load(); onChange?.(); }} />
    </div>
  );
}

function BrandModal({
  open, brand, onClose, onSaved,
}: {
  open: boolean; brand: Brand | null;
  onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [pick, setPick] = useState("");
  const [catalogue, setCatalogue] = useState<CatalogueBrand[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(brand?.name || "");
    setPick("");
    setError("");
    // Adding is picking from admin's master list, so load it each time the
    // modal opens — admin may have added a brand since the page loaded.
    if (!brand) {
      fetch("/api/brands?scope=catalogue")
        .then((r) => r.json())
        .then((d) => setCatalogue(d.brands || []))
        .catch(() => setCatalogue([]));
    }
  }, [open, brand]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const res = await fetch(brand ? `/api/brands/${brand.id}` : "/api/brands", {
      method: brand ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(brand ? { name } : { catalogue_id: pick }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setError(data.error || "Save failed.");
    onClose(); onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={brand ? "Edit Brand" : "Add Brand"}>
      <form onSubmit={submit} className="space-y-4">
        {brand ? (
          <div>
            <label className="label" htmlFor="brand-name">Name Brand</label>
            <input id="brand-name" className="input" value={name} autoFocus
              onChange={(e) => setName(e.target.value)} required
              placeholder="e.g. Bloom & Grow" />
          </div>
        ) : (
          <div>
            <label className="label" htmlFor="brand-pick">Pilih Brand</label>
            <select id="brand-pick" className="input cursor-pointer" value={pick}
              onChange={(e) => setPick(e.target.value)} required autoFocus>
              <option value="">— Pilih brand —</option>
              {catalogue.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-fg">
              {catalogue.length === 0
                ? "Admin belum tambah sebarang brand — minta admin tambah dahulu."
                : "Senarai brand dari admin. Brand yang dipilih menjadi brand anda."}
            </p>
          </div>
        )}

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
              : <><Check className="h-4 w-4" aria-hidden="true" />Save</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ── Shared brand picker ─────────────────────────────── */

/**
 * The standard "filter this tab by brand" card. Every tab that reports
 * brand-scoped data shows the same control, defaulting to All Brands.
 */
export function BrandFilterCard({
  value, onChange, id,
}: { value: string; onChange: (v: string) => void; id: string }) {
  return (
    <div className="card flex flex-wrap items-end gap-3">
      <div className="min-w-[220px]">
        <label className="label" htmlFor={id}>
          <Tag className="mr-1 inline h-3 w-3" aria-hidden="true" />
          Brand
        </label>
        <BrandSelect id={id} value={value} onChange={onChange} allowAll
          className="!py-2 text-sm" />
      </div>
      <p className="pb-2 text-xs text-muted-fg">
        {value ? "Menunjukkan satu brand sahaja." : "Menunjukkan semua brand."}
      </p>
    </div>
  );
}

/** Dropdown of the marketer's brands. `allowAll` adds an "All Brands" option. */
export function BrandSelect({
  value, onChange, allowAll, id, className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  allowAll?: boolean;
  id?: string;
  className?: string;
}) {
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    fetch("/api/brands")
      .then((r) => r.json())
      .then((d) => setBrands(d.brands || []));
  }, []);

  return (
    <select id={id} className={`input cursor-pointer ${className}`}
      value={value} onChange={(e) => onChange(e.target.value)}>
      {allowAll ? (
        <option value="">All Brands</option>
      ) : (
        <option value="">— Pilih brand —</option>
      )}
      {brands.map((b) => (
        <option key={b.id} value={b.id}>{b.name}</option>
      ))}
    </select>
  );
}
