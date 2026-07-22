"use client";

import { useEffect, useState } from "react";
import { Tag, Loader2, Check, AlertCircle } from "lucide-react";

type Brand = { id: number; name: string };

/**
 * Tag one TikTok link with a brand.
 *
 * This is what decides which WhatsApp group the affiliate sees against that
 * account — one creator running two brands gets the right group next to the
 * right profile — so it sits with commission, set by the marketer, not the
 * affiliate.
 */
export default function ProfileBrandPicker({
  profileId,
  initial,
}: {
  profileId: number;
  initial: number | null | undefined;
}) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [value, setValue] = useState(initial != null ? String(initial) : "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/brands")
      .then((r) => r.json())
      .then((d) => setBrands(d.brands || []))
      .catch(() => setBrands([]));
  }, []);

  async function save(next: string) {
    setValue(next);
    setBusy(true); setError(""); setSaved(false);
    const res = await fetch(`/api/profiles/${profileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brand_id: next }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Save failed.");
    setSaved(true);
  }

  return (
    <div className="mt-1.5">
      <label className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-fg"
        htmlFor={`pb-${profileId}`}>
        <Tag className="h-3 w-3" aria-hidden="true" />
        Brand
        {busy && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
        {saved && !busy && <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />}
      </label>
      <select id={`pb-${profileId}`} className="input cursor-pointer !py-1.5 text-xs"
        value={value} onChange={(e) => save(e.target.value)} disabled={busy}>
        <option value="">— Tiada brand —</option>
        {brands.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
      {error && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-danger">
          <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />{error}
        </p>
      )}
    </div>
  );
}
