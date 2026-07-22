"use client";

import { useEffect, useRef, useState } from "react";
import { Tag, Loader2, Check, AlertCircle, ChevronDown, X } from "lucide-react";

type Brand = { id: number; name: string };

/**
 * Tag one TikTok link with the brands it runs.
 *
 * One account often carries several brands, each with its own WhatsApp group,
 * so this is a set rather than a choice. Only the chosen brands stay on
 * screen — listing every brand inline turned a two-brand link into a wall of
 * mostly-unselected options once a marketer had ten of them.
 *
 * Set by whoever sets commission: the marketer, never the affiliate.
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
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/brands")
      .then((r) => r.json())
      .then((d) => setBrands(d.brands || []))
      .catch(() => setBrands([]));
  }, []);

  // Close on an outside click or Escape — a panel that traps you is worse
  // than the wall of chips it replaced.
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  async function save(next: number[]) {
    const before = picked;
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
      setPicked(before); // the save did not happen — put it back
      return setError(data.error || "Save failed.");
    }
    setSaved(true);
  }

  const toggle = (id: number) =>
    save(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);

  const chosen = brands.filter((b) => picked.includes(b.id));

  return (
    <div className="mt-1.5" ref={box}>
      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-fg">
        <Tag className="h-3 w-3" aria-hidden="true" />
        Brand
        {busy && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
        {saved && !busy && <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />}
      </p>

      <div className="relative">
        <button type="button" onClick={() => setOpen((o) => !o)}
          aria-expanded={open} aria-haspopup="listbox"
          className="flex w-full cursor-pointer items-center gap-1.5 rounded-xl border border-line bg-white/70 px-2.5 py-1.5 text-left transition-colors duration-200 hover:border-primary/40">
          <span className="flex min-w-0 flex-1 flex-wrap gap-1">
            {chosen.length === 0 ? (
              <span className="text-xs text-muted-fg">— Pilih brand —</span>
            ) : (
              chosen.map((b) => (
                <span key={b.id}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                  {b.name}
                  <X className="h-2.5 w-2.5 cursor-pointer hover:opacity-70"
                    aria-hidden="true"
                    onClick={(e) => { e.stopPropagation(); toggle(b.id); }} />
                </span>
              ))
            )}
          </span>
          <ChevronDown aria-hidden="true"
            className={`h-3.5 w-3.5 shrink-0 text-muted-fg transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`} />
        </button>

        {open && (
          <div role="listbox"
            className="absolute z-30 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-lift">
            {brands.length === 0 ? (
              <p className="px-2 py-1.5 text-[11px] text-muted-fg">Tiada brand lagi.</p>
            ) : (
              brands.map((b) => {
                const on = picked.includes(b.id);
                return (
                  <button key={b.id} type="button" role="option" aria-selected={on}
                    disabled={busy} onClick={() => toggle(b.id)}
                    className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors duration-200 disabled:opacity-60 ${
                      on ? "font-semibold text-primary" : "text-ink hover:bg-primary/5"
                    }`}>
                    <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                      on ? "border-primary bg-primary text-white" : "border-line"
                    }`}>
                      {on && <Check className="h-2.5 w-2.5" aria-hidden="true" />}
                    </span>
                    {b.name}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-danger">
          <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />{error}
        </p>
      )}
    </div>
  );
}
