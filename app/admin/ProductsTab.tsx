"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Package, Plus, Pencil, Trash2, Loader2, AlertCircle, ImagePlus, Check,
} from "lucide-react";
import Modal from "@/components/Modal";
import { compressScreenshot, fmtBytes, MAX_UPLOAD_BYTES } from "@/lib/image";

export type Product = { id: number; name: string; image_url: string | null };

export default function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const d = await fetch("/api/products").then((r) => r.json());
    setProducts(d.products || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function remove(p: Product) {
    if (!confirm(`Delete "${p.name}"?`)) return;
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

      {products.length === 0 ? (
        <p className="card text-center text-sm text-muted-fg">
          No products yet — add the first one so samples can be assigned.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
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

              <p className="min-w-0 flex-1 truncate font-bold text-ink">{p.name}</p>

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
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(product?.name || "");
    setPreview(product?.image_url || null);
    setFile(null);
    setError("");
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
