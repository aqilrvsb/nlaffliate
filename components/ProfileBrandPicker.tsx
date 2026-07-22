"use client";

import { useEffect, useState } from "react";
import { Tag, Loader2, Check, AlertCircle } from "lucide-react";

type Brand = { id: number; name: string };

/**
 * Tag one TikTok link with the brands it runs.
 *
 * One account often carries several brands, and each brand has its own
 * WhatsApp group — so this is a set, not a choice. Ticking is what decides
 * which groups the affiliate sees against that account, which is why it sits
 * with commission: set by the marketer, never by the affiliate.
 */
export default function ProfileBrandPicker({
  profileId,
  initial,
}: {
  profileId: number;
  /** Brand ids already on this link. */
  initial: number[];
}) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [picked, setPicked] = useState<number[]>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/brands")
      .then((r) => r.json())
      .then((d) => setBrands(d.brands || []))
      .catch(() => setBrands([]));
  }, []);

  async function toggle(id: number) {
    const next = picked.includes(id)
      ? picked.filter((x) => x !== id)
      : [...picked, id];
    setPicked(next);
    setBusy(true); setError(""); setSaved(false);

    const res = await fetch(`/api/profiles/${profileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brand_ids: next }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setPicked(picked); // put the tick back — the save did not happen
      return setError(data.error || "Save failed.");
    }
    setSaved(true);
  }

  return (
    <div className="mt-1.5">
      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-fg">
        <Tag className="h-3 w-3" aria-hidden="true" />
        Brand
        {busy && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
        {saved && !busy && <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />}
      </p>

      {brands.length === 0 ? (
        <p className="text-[11px] text-muted-fg/70">Tiada brand lagi.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {brands.map((b) => {
            const on = picked.includes(b.id);
            return (
              <button key={b.id} type="button" disabled={busy}
                onClick={() => toggle(b.id)}
                aria-pressed={on}
                className={`cursor-pointer rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors duration-200 disabled:opacity-60 ${
                  on
                    ? "border-primary bg-primary text-primary-fg"
                    : "border-line bg-white/60 text-muted-fg hover:border-primary/40 hover:text-ink"
                }`}>
                {on && <Check className="mr-1 inline h-3 w-3" aria-hidden="true" />}
                {b.name}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-danger">
          <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />{error}
        </p>
      )}
    </div>
  );
}
