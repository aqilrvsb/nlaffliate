"use client";

import { useEffect, useRef, useState } from "react";
import { Tag, Loader2, Check, AlertCircle, ChevronDown } from "lucide-react";

type Brand = { id: number; name: string };

/**
 * Add brands to a TikTok link.
 *
 * The control stays empty — the brands already on the link are shown as
 * labels beside the link title, so repeating them here said the same thing
 * twice and crowded the row. Ticks are held as a draft until Save, because
 * choosing three brands should be one write, not three.
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
  const [saved, setSaved] = useState<number[]>(initial);
  const [draft, setDraft] = useState<number[]>(initial);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/brands")
      .then((r) => r.json())
      .then((d) => setBrands(d.brands || []))
      .catch(() => setBrands([]));
  }, []);

  // Close on outside click or Escape, discarding the draft — a panel you
  // clicked away from should not have quietly saved.
  useEffect(() => {
    if (!open) return;
    const close = () => { setOpen(false); setDraft(saved); };
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) close();
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open, saved]);

  function toggle(id: number) {
    setDraft((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  }

  async function save() {
    setBusy(true); setError(""); setDone(false);
    const res = await fetch(`/api/profiles/${profileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brand_ids: draft }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Save failed.");

    setSaved(draft);
    setDone(true);
    setOpen(false);
    // The labels beside the link title are rendered from the server, so a
    // refresh is what makes the new brands appear there.
    window.location.reload();
  }

  return (
    <div className="mt-1.5" ref={box}>
      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-fg">
        <Tag className="h-3 w-3" aria-hidden="true" />
        Brand
        {busy && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
        {done && !busy && <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />}
      </p>

      <div className="relative">
        <button type="button"
          onClick={() => { setDraft(saved); setOpen((o) => !o); }}
          aria-expanded={open} aria-haspopup="listbox"
          className="flex w-full cursor-pointer items-center gap-1.5 rounded-xl border border-line bg-white/70 px-2.5 py-1.5 text-left transition-colors duration-200 hover:border-primary/40">
          <span className="min-w-0 flex-1 text-xs text-muted-fg">— Pilih brand —</span>
          <ChevronDown aria-hidden="true"
            className={`h-3.5 w-3.5 shrink-0 text-muted-fg transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`} />
        </button>

        {open && (
          <div role="listbox"
            className="absolute z-30 mt-1 w-full rounded-xl border border-line bg-white p-1 shadow-lift">
            <div className="max-h-52 overflow-y-auto">
              {brands.length === 0 ? (
                <p className="px-2 py-1.5 text-[11px] text-muted-fg">Tiada brand lagi.</p>
              ) : (
                brands.map((b) => {
                  const on = draft.includes(b.id);
                  return (
                    <button key={b.id} type="button" role="option" aria-selected={on}
                      onClick={() => toggle(b.id)}
                      className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors duration-200 ${
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

            <div className="mt-1 flex justify-end gap-1.5 border-t border-line pt-1.5">
              <button type="button" className="btn-ghost !px-2.5 !py-1 text-[11px]"
                onClick={() => { setOpen(false); setDraft(saved); }}>
                Cancel
              </button>
              <button type="button" className="btn !px-2.5 !py-1 text-[11px]"
                onClick={save} disabled={busy}>
                {busy
                  ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  : <><Check className="h-3 w-3" aria-hidden="true" />Save</>}
              </button>
            </div>
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
