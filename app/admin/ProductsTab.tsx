"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Package, Plus, Pencil, Trash2, Loader2, AlertCircle, ImagePlus, Check, ExternalLink,
} from "lucide-react";
import Modal from "@/components/Modal";
import { compressScreenshot, fmtBytes, MAX_UPLOAD_BYTES } from "@/lib/image";
import { confirmDialog } from "@/lib/swal";

export type Product = {
  id: number; name: string; image_url: string | null;
  sku: string | null; product_url: string | null;
  info: string | null; document_url: string | null;
  brand_id: number | null; brand_name: string | null;
};

export default function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  // "" = All Brands, the default.
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    const d = await fetch("/api/products").then((r) => r.json());
    setProducts(d.products || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  // "__none" is its own choice: products with no brand are the ones most
  // likely to need attention, so they must be findable.
  const shown = !filter
    ? products
    : filter === "__none"
      ? products.filter((p) => !p.brand_name)
      : products.filter((p) => p.brand_name === filter);

  async function remove(p: Product) {
    if (!(await confirmDialog({ title: `Delete "${p.name}"?`, danger: true }))) return;
    setError("");
    const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
    const data = await res.json();
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
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="section-title">Product Catalogue</h2>
        <button className="btn !py-2"
          onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Product
        </button>
      </div>

      {error && (
        <p className="mb-3 flex items-center gap-1.5 text-sm text-danger">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />{error}
        </p>
      )}

      {(() => {
        const names = [...new Set(products.map((p) => p.brand_name).filter(Boolean))] as string[];
        return names.length > 0 ? (
          <div className="card mb-3 flex flex-wrap items-end gap-3">
            <div className="min-w-[220px]">
              <label className="label" htmlFor="pf-brand">Brand</label>
              <select id="pf-brand" className="input cursor-pointer !py-2 text-sm"
                value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="">All Brands</option>
                {names.map((b) => <option key={b} value={b}>{b}</option>)}
                <option value="__none">— Tiada brand —</option>
              </select>
            </div>
            <p className="pb-2 text-xs text-muted-fg">
              {filter ? "Menunjukkan satu brand sahaja." : "Menunjukkan semua brand."}
            </p>
          </div>
        ) : null;
      })()}

      {shown.length === 0 ? (
        <p className="card text-center text-sm text-muted-fg">
          {products.length === 0
            ? "No products yet — add the first one so samples can be assigned."
            : "No products for this brand."}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => (
            <div key={p.id} className="card flex items-center gap-3">
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt=""
                  className="h-16 w-16 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-fg">
                  <Package className="h-6 w-6" aria-hidden="true" />
                </span>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink">{p.name}</p>
                {p.sku && <p className="truncate font-mono text-[11px] text-muted-fg">{p.sku}</p>}
                {p.brand_name
                  ? <span className="chip mt-1 bg-primary/10 text-primary">{p.brand_name}</span>
                  : <span className="mt-1 block text-[11px] text-muted-fg/60">Tiada brand</span>}
                {p.product_url && (
                  <a href={p.product_url} target="_blank" rel="noopener noreferrer"
                    className="mt-1 flex items-center gap-1 truncate text-[11px] text-accent hover:underline">
                    <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />Buka link
                  </a>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => { setEditing(p); setOpen(true); }}
                  className="cursor-pointer rounded-lg p-2 text-muted-fg transition-colors duration-200 hover:bg-accent/10 hover:text-accent"
                  aria-label={`Edit ${p.name}`}>
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
                <button onClick={() => remove(p)}
                  className="cursor-pointer rounded-lg p-2 text-muted-fg transition-colors duration-200 hover:bg-danger/10 hover:text-danger"
                  aria-label={`Delete ${p.name}`}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProductModal open={open} product={editing}
        onClose={() => setOpen(false)} onSaved={load} />
    </>
  );
}

function ProductModal({
  open, product, onClose, onSaved,
}: {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [link, setLink] = useState("");
  const [info, setInfo] = useState("");
  const [doc, setDoc] = useState<File | null>(null);
  const [brand, setBrand] = useState("");
  const [brands, setBrands] = useState<
    { id: number; name: string; marketer_name?: string | null }[]
  >([]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(product?.name || "");
    setSku(product?.sku || "");
    setLink(product?.product_url || "");
    setInfo(product?.info || "");
    setDoc(null);
    setBrand(product?.brand_id != null ? String(product.brand_id) : "");
    setPreview(product?.image_url || null);
    setFile(null);
    setError("");
    fetch("/api/brands?scope=catalogue").then((r) => r.json()).then((d) => setBrands(d.brands || []));
  }, [open, product]);

  async function pick(f: File | null) {
    if (!f) {
      setFile(null);
      setPreview(product?.image_url || null);
      return;
    }
    // Vercel caps a serverless request body at 4.5 MB, and a photo straight
    // off a phone is routinely 6–8 MB — it would hang and then fail. Shrink
    // it in the browser first, same as the live-screenshot flow.
    setError("");
    const { file: out } = await compressScreenshot(f);
    setFile(out);
    setPreview(URL.createObjectURL(out));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (file && file.size > MAX_UPLOAD_BYTES) {
      return setError(`Image too large (${fmtBytes(file.size)}). Use one under ${fmtBytes(MAX_UPLOAD_BYTES)}.`);
    }
    setSaving(true); setError("");

    const fd = new FormData();
    fd.append("name", name);
    fd.append("sku", sku);
    fd.append("product_url", link);
    fd.append("info", info);
    if (doc) fd.append("document", doc);
    fd.append("brand_id", brand);
    if (file) fd.append("image", file);

    const res = await fetch(
      product ? `/api/products/${product.id}` : "/api/products",
      { method: product ? "PUT" : "POST", body: fd }
    );
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setError(data.error || "Save failed.");
    onClose(); onSaved();
  }

  return (
    <Modal open={open} onClose={onClose}
      title={product ? "Edit Product" : "Add Product"}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="pr-name">Name Product</label>
          <input id="pr-name" className="input" value={name}
            onChange={(e) => setName(e.target.value)} required
            placeholder="e.g. Bloom & Grow Hair Serum" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="pr-brand">Brand</label>
            <select id="pr-brand" className="input cursor-pointer" value={brand}
              onChange={(e) => setBrand(e.target.value)}>
              <option value="">— Tiada brand —</option>
              {/* The company brand list, shared by everyone — a product is
                  not owned by whichever marketer happens to file it. */}
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="pr-sku">SKU</label>
            <input id="pr-sku" className="input font-mono" value={sku}
              onChange={(e) => setSku(e.target.value)} placeholder="e.g. BG-SERUM-30ML" />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="pr-link">Product link</label>
          <input id="pr-link" className="input" type="url" value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://shop.tiktok.com/…" />
          <p className="mt-1 text-[11px] text-muted-fg">
            Affiliates can open this from the sample form to see the product.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="pr-info">Product Info</label>
          <textarea id="pr-info" className="input resize-y" rows={4} value={info}
            onChange={(e) => setInfo(e.target.value)}
            placeholder="Cara guna, kandungan, selling points — affiliate akan baca ini." />
        </div>

        <div>
          <label className="label" htmlFor="pr-doc">Document (PDF)</label>
          <input id="pr-doc" type="file" accept=".pdf,application/pdf"
            onChange={(e) => setDoc(e.target.files?.[0] ?? null)}
            className="block w-full cursor-pointer text-sm text-muted-fg file:mr-3 file:cursor-pointer file:rounded-xl file:border-0 file:bg-muted file:px-4 file:py-2 file:text-sm file:font-semibold file:text-ink" />
          <p className="mt-1 text-[11px] text-muted-fg">
            Affiliate boleh muat turun ini bila sample dihantar.
          </p>
          {product?.document_url && !doc && (
            <a href={product.document_url} download target="_blank" rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline">
              <ExternalLink className="h-3 w-3" aria-hidden="true" />Document semasa
            </a>
          )}
        </div>

        <div>
          <label className="label" htmlFor="pr-img">Images Product</label>
          <div className="flex items-center gap-3">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt=""
                className="h-20 w-20 shrink-0 rounded-xl object-cover" />
            ) : (
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-fg">
                <ImagePlus className="h-6 w-6" aria-hidden="true" />
              </span>
            )}
            <input id="pr-img" type="file" accept="image/*"
              onChange={(e) => pick(e.target.files?.[0] || null)}
              className="block w-full cursor-pointer text-sm text-muted-fg file:mr-3 file:cursor-pointer file:rounded-xl file:border-0 file:bg-muted file:px-4 file:py-2 file:text-sm file:font-semibold file:text-ink" />
          </div>
          {product && (
            <p className="mt-1.5 text-xs text-muted-fg">
              Leave blank to keep the current image.
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
