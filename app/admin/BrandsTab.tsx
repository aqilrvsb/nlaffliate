"use client";

import { useCallback, useEffect, useState } from "react";
import { Tag, Plus, Pencil, Trash2, Loader2, AlertCircle, Check, Users } from "lucide-react";
import Modal from "@/components/Modal";

type CatalogueBrand = { id: number; name: string; adopted: number };

/**
 * The master brand list. Admin keeps it; marketers pick from it and the brand
 * becomes theirs. Renaming here follows through to every marketer who adopted
 * it, so the catalogue stays the single source of truth for brand names.
 */
export default function AdminBrandsTab() {
  const [brands, setBrands] = useState<CatalogueBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CatalogueBrand | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const d = await fetch("/api/brands?scope=catalogue").then((r) => r.json());
    setBrands(d.brands || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function remove(b: CatalogueBrand) {
    if (!confirm(`Remove "${b.name}" from the catalogue?`)) return;
    setError("");

    let res = await fetch(`/api/brands/${b.id}`, { method: "DELETE" });
    let data = await res.json();

    // The API refuses while marketers still have it and says how many, so the
    // second prompt can name the cost instead of asking blind.
    if (res.status === 409 && data.needsConfirm) {
      if (!confirm(`${data.error}\n\nRemove it anyway?`)) return;
      res = await fetch(`/api/brands/${b.id}?force=1`, { method: "DELETE" });
      data = await res.json();
    }

    if (!res.ok) return setError(data.error || "Delete failed.");
    load();
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
            Senarai induk brand. Marketer pilih dari sini dan ia menjadi brand mereka.
          </p>
        </div>
        <button className="btn !py-2" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create Brand
        </button>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-sm text-danger">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />{error}
        </p>
      )}

      {brands.length === 0 ? (
        <p className="card text-center text-sm text-muted-fg">
          Belum ada brand — tambah brand pertama supaya marketer boleh pilih.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((b) => (
            <div key={b.id} className="card flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Tag className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink">{b.name}</p>
                <p className="flex items-center gap-1 text-xs text-muted-fg">
                  <Users className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {b.adopted === 0
                    ? "Belum diambil marketer"
                    : `${b.adopted} marketer`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => { setEditing(b); setOpen(true); }}
                  className="cursor-pointer rounded-lg p-2 text-muted-fg transition-colors duration-200 hover:bg-accent/10 hover:text-accent"
                  aria-label={`Edit ${b.name}`}>
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
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
        onClose={() => setOpen(false)} onSaved={load} />
    </div>
  );
}

function BrandModal({
  open, brand, onClose, onSaved,
}: {
  open: boolean; brand: CatalogueBrand | null;
  onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(brand?.name || "");
    setError("");
  }, [open, brand]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const res = await fetch(brand ? `/api/brands/${brand.id}` : "/api/brands", {
      method: brand ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setError(data.error || "Save failed.");
    onClose(); onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={brand ? "Edit Brand" : "Create Brand"}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="cat-brand-name">Name Brand</label>
          <input id="cat-brand-name" className="input" value={name} autoFocus
            onChange={(e) => setName(e.target.value)} required
            placeholder="e.g. Bloom & Grow" />
          {brand && brand.adopted > 0 && (
            <p className="mt-1 text-xs text-muted-fg">
              Menukar nama akan turut menukar nama brand pada {brand.adopted} marketer.
            </p>
          )}
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
              : <><Check className="h-4 w-4" aria-hidden="true" />Save</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}
