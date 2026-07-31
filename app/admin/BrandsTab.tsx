"use client";

import { useCallback, useEffect, useState } from "react";
import { Tag, Plus, Pencil, Trash2, Loader2, AlertCircle, Check, Users, UserPlus, Search } from "lucide-react";
import Modal from "@/components/Modal";
import { confirmDialog } from "@/lib/swal";

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
  const [assignFor, setAssignFor] = useState<CatalogueBrand | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/brands?scope=catalogue");
      const d = r.ok ? await r.json() : {};
      setBrands(d.brands || []);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function remove(b: CatalogueBrand) {
    const go = await confirmDialog({
      title: `Remove "${b.name}" from the catalogue?`,
      danger: true, confirmText: "Remove",
    });
    if (!go) return;
    setError("");

    let res = await fetch(`/api/brands/${b.id}`, { method: "DELETE" });
    let data = await res.json();

    // The API refuses while marketers still have it and says how many, so the
    // second prompt can name the cost instead of asking blind.
    if (res.status === 409 && data.needsConfirm) {
      const anyway = await confirmDialog({
        title: "Remove it anyway?", text: data.error,
        danger: true, confirmText: "Remove",
      });
      if (!anyway) return;
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
            Senarai induk brand. Cipta sekali, kemudian tugaskan (
            <UserPlus className="inline h-3.5 w-3.5" aria-hidden="true" />) kepada
            seberapa banyak marketer — semua kongsi produk &amp; data yang sama.
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
                <button onClick={() => setAssignFor(b)}
                  className="cursor-pointer rounded-lg p-2 text-muted-fg transition-colors duration-200 hover:bg-primary/10 hover:text-primary"
                  aria-label={`Assign ${b.name} to marketers`} title="Assign to marketers">
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                </button>
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

      <AssignBrandModal brand={assignFor}
        onClose={() => setAssignFor(null)} onSaved={load} />
    </div>
  );
}

/**
 * Share one catalogue brand with many marketers at once. Checkboxes reflect who
 * holds it now; Save syncs the set. Removing a marketer who has data on the
 * brand is confirmed against the cost before it goes through.
 */
function AssignBrandModal({
  brand, onClose, onSaved,
}: { brand: CatalogueBrand | null; onClose: () => void; onSaved: () => void }) {
  type Mk = { id: number; name: string; staff_id: string | null; role: string; assigned: boolean };
  const [marketers, setMarketers] = useState<Mk[]>([]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!brand) return;
    setError(""); setQ(""); setLoading(true);
    (async () => {
      try {
        const r = await fetch(`/api/admin/assign-brand?catalogue_id=${brand.id}`);
        const d = r.ok ? await r.json() : { marketers: [] };
        const list: Mk[] = d.marketers || [];
        setMarketers(list);
        setPicked(new Set(list.filter((m) => m.assigned).map((m) => m.id)));
      } catch {
        setMarketers([]); setPicked(new Set());
      } finally {
        setLoading(false);
      }
    })();
  }, [brand]);

  function toggle(id: number) {
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function save(force = false) {
    if (!brand) return;
    setSaving(true); setError("");
    const res = await fetch("/api/admin/assign-brand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ catalogue_id: brand.id, marketer_ids: [...picked], force }),
    });
    const data = await res.json().catch(() => ({}));

    // Unchecking a marketer with data is refused until confirmed.
    if (res.status === 409 && data.needsConfirm) {
      setSaving(false);
      const go = await confirmDialog({
        title: "Buang brand daripada marketer ini?",
        text: data.error, danger: true, confirmText: "Buang & simpan",
      });
      if (!go) return;
      return save(true);
    }

    setSaving(false);
    if (!res.ok) return setError(data.error || "Gagal simpan.");
    onClose(); onSaved();
  }

  const query = q.trim().toLowerCase();
  const shown = marketers.filter((m) =>
    !query || `${m.name} ${m.staff_id ?? ""}`.toLowerCase().includes(query)
  );
  const currentlyAssigned = marketers.filter((m) => m.assigned).length;

  return (
    <Modal open={!!brand} onClose={onClose}
      title={brand ? `Assign — ${brand.name}` : "Assign brand"}
      subtitle="Tanda marketer yang patut ada brand ini. Semua kongsi produk & data yang sama.">
      {loading ? (
        <p className="flex items-center gap-2 py-6 text-sm text-muted-fg">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Loading…
        </p>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg" aria-hidden="true" />
            <input className="input !pl-9" placeholder="Cari marketer…"
              value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-fg">
            <span>{picked.size} dipilih · {currentlyAssigned} sedia ada</span>
            <div className="flex gap-2">
              <button type="button" className="cursor-pointer font-semibold text-primary hover:underline"
                onClick={() => setPicked(new Set(marketers.map((m) => m.id)))}>Pilih semua</button>
              <button type="button" className="cursor-pointer font-semibold text-muted-fg hover:underline"
                onClick={() => setPicked(new Set())}>Kosongkan</button>
            </div>
          </div>

          <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-line p-1">
            {shown.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-fg">Tiada marketer sepadan.</p>
            ) : shown.map((m) => (
              <label key={m.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-primary/5">
                <input type="checkbox" className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--primary)]"
                  checked={picked.has(m.id)} onChange={() => toggle(m.id)} />
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-xs font-bold text-white">
                  {m.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{m.name}</span>
                  <span className="block truncate font-mono text-[11px] text-muted-fg">
                    {m.staff_id || "—"}{m.role === "leader" ? " · Leader" : ""}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-sm text-danger">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />{error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="button" className="btn" disabled={saving} onClick={() => save(false)}>
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Saving…</>
                : <><Check className="h-4 w-4" aria-hidden="true" />Save</>}
            </button>
          </div>
        </div>
      )}
    </Modal>
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
