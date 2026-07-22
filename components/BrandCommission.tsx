"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Percent, Clock, Check, Loader2, AlertCircle, Wallet, Tag,
} from "lucide-react";
import Modal from "@/components/Modal";

export type LinkBrand = {
  id: number;
  name: string;
  commission_type?: "percent" | "hour" | null;
  commission_value?: number | string | null;
};

/** How a rate reads once set: "12%" or "RM30 / jam". */
export function rateLabel(b: LinkBrand): string | null {
  if (!b.commission_type || b.commission_value == null) return null;
  return b.commission_type === "percent"
    ? `${b.commission_value}%`
    : `RM${b.commission_value} / jam`;
}

/**
 * Set the commission for one brand on one link.
 *
 * A creator can run four brands off a single account at four different rates,
 * so the rate belongs to the brand-on-this-link, not to the link. Percent and
 * hour are mutually exclusive — a brand is paid one way or the other — so the
 * type is a toggle and the unit on the amount follows it.
 */
export function BrandCommissionModal({
  open, profileId, brand, onClose,
}: {
  open: boolean;
  profileId: number;
  brand: LinkBrand | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [type, setType] = useState<"percent" | "hour" | "">("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !brand) return;
    setType(brand.commission_type ?? "");
    setValue(brand.commission_value != null ? String(brand.commission_value) : "");
    setError("");
  }, [open, brand]);

  async function save(clear = false) {
    if (!brand) return;
    setBusy(true); setError("");
    const res = await fetch(`/api/profiles/${profileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brand_id: brand.id,
        commission_type: clear ? "" : type,
        commission_value: clear ? null : value,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(d.error || "Save failed.");
    onClose();
    router.refresh();
  }

  return (
    <Modal open={open} onClose={onClose}
      title="Komisyen Brand"
      subtitle={brand ? `Kadar untuk ${brand.name} pada link ini.` : undefined}>
      <div className="space-y-4">
        <div>
          <p className="label">Jenis Komisyen</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setType("percent")}
              className={type === "percent" ? "btn !py-2" : "btn-ghost !py-2"}>
              <Percent className="h-4 w-4" aria-hidden="true" />Percent
            </button>
            <button type="button" onClick={() => setType("hour")}
              className={type === "hour" ? "btn !py-2" : "btn-ghost !py-2"}>
              <Clock className="h-4 w-4" aria-hidden="true" />Hour
            </button>
          </div>
        </div>

        {type && (
          <div>
            <label className="label" htmlFor="bc-value">
              {type === "percent" ? "Peratus (%)" : "Kadar sejam (RM)"}
            </label>
            <input id="bc-value" className="input" type="number" min="0" step="any"
              value={value} onChange={(e) => setValue(e.target.value)} autoFocus
              placeholder={type === "percent" ? "12" : "30"} />
            <p className="mt-1 text-xs text-muted-fg">
              {type === "percent"
                ? "Peratus daripada jualan brand ini."
                : "Dikira ikut tempoh live sebenar, sampai ke saat."}
            </p>
          </div>
        )}

        {error && (
          <p className="flex items-center gap-1.5 text-sm text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{error}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-ghost !py-2" onClick={() => save(true)}
            disabled={busy}>
            Kosongkan
          </button>
          <button type="button" className="btn-ghost !py-2" onClick={onClose}>Cancel</button>
          <button type="button" className="btn !py-2" onClick={() => save()}
            disabled={busy || !type || value === ""}>
            {busy
              ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Saving…</>
              : <><Check className="h-4 w-4" aria-hidden="true" />Simpan</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Every brand on this link and what each pays — the whole picture in one
 * place, since the per-brand rates are otherwise only visible one chip at a
 * time.
 */
export function CommissionSummary({
  open, brands, onClose, onPick,
}: {
  open: boolean;
  brands: LinkBrand[];
  onClose: () => void;
  onPick: (b: LinkBrand) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Komisyen"
      subtitle="Kadar bagi setiap brand pada link ini.">
      {brands.length === 0 ? (
        <p className="text-sm text-muted-fg">
          Link ini belum ada brand. Pilih brand dahulu.
        </p>
      ) : (
        <ul className="space-y-2">
          {brands.map((b) => (
            <li key={b.id}>
              <button type="button"
                onClick={() => { onClose(); onPick(b); }}
                className="flex w-full cursor-pointer items-center gap-2 rounded-xl border border-line bg-white/60 px-3 py-2 text-left transition-colors duration-200 hover:border-primary/40">
                <Tag className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                  {b.name}
                </span>
                {rateLabel(b) ? (
                  <span className="chip shrink-0 bg-emerald-100 text-emerald-700">
                    {rateLabel(b)}
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-muted-fg">Belum set</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex justify-end">
        <button type="button" className="btn-ghost !py-2" onClick={onClose}>Tutup</button>
      </div>
    </Modal>
  );
}

/** The "Komisyen" opener that sits on each link row. */
export function CommissionButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-line bg-white/60 px-2 py-1 text-[11px] font-semibold text-muted-fg transition-colors duration-200 hover:border-primary/40 hover:text-ink">
      <Wallet className="h-3 w-3" aria-hidden="true" />
      Komisyen
    </button>
  );
}
