/**
 * Excel imports can carry Indonesian-Rupiah amounts (an IDR TikTok Ads export).
 * When the marketer marks an upload as IDR, every money column is multiplied by
 * the IDR→MYR rate before it is stored, so all reporting stays in MYR whatever
 * the source currency. Counts (orders, views) and ratios (ROI) are never scaled.
 */

export type MoneyScaler = {
  isIdr: boolean;
  /** IDR→MYR multiplier (1 for MYR uploads). */
  factor: number;
  /** Scale a nullable money value into MYR, rounded to the sen. */
  scale: (n: number | null) => number | null;
};

/** The default IDR→MYR rate shown in the form (1 IDR ≈ RM0.00023). */
export const DEFAULT_IDR_RATE = 0.00023;

/**
 * Build a money scaler from the import form's `currency` + `rate` fields.
 * MYR (or missing) is a no-op. IDR needs a positive rate or the import is
 * refused, so a bad rate never silently mis-scales real money.
 */
export function moneyScalerFromForm(
  currencyRaw: unknown,
  rateRaw: unknown
):
  | { ok: true; scaler: MoneyScaler }
  | { ok: false; error: string } {
  const isIdr = String(currencyRaw ?? "MYR").toUpperCase() === "IDR";
  if (!isIdr) {
    return { ok: true, scaler: { isIdr: false, factor: 1, scale: (n) => n } };
  }
  const rate = Number(String(rateRaw ?? "").replace(/[^0-9.\-]/g, ""));
  if (!Number.isFinite(rate) || rate <= 0) {
    return { ok: false, error: "Masukkan kadar tukaran IDR→MYR yang sah (cth: 0.00023)." };
  }
  return {
    ok: true,
    scaler: {
      isIdr: true,
      factor: rate,
      scale: (n) => (n == null ? null : Math.round(n * rate * 100) / 100),
    },
  };
}
