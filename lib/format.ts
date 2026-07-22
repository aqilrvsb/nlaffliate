/** "14:30" -> "2:30 PM". Returns "" for empty/invalid input. */
export function fmtTime(t?: string | null): string {
  if (!t) return "";
  const [hRaw, mRaw] = String(t).split(":");
  const h24 = Number(hRaw);
  if (!Number.isFinite(h24)) return String(t);
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return `${h12}:${(mRaw ?? "00").padStart(2, "0")} ${suffix}`;
}

/**
 * "2026-07-21" -> "21-07-2026". Dates are stored ISO (sortable) and only
 * formatted for display.
 */
export function fmtDate(d?: string | null): string {
  if (!d) return "";
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : String(d);
}

/** "10:00","12:00" -> "10:00 AM – 12:00 PM". End is optional. */
export function fmtTimeRange(start?: string | null, end?: string | null): string {
  const s = fmtTime(start);
  const e = fmtTime(end);
  return e ? `${s} – ${e}` : s;
}

/**
 * Parse a live duration into seconds. Handles the TikTok recap format
 * ("2h 0m 25s", "45m 10s", "90s") and clock format ("02:00:25", "20:15").
 * Returns 0 for anything unrecognised so sums stay safe.
 */
export function durationToSeconds(d?: string | null): number {
  if (!d) return 0;
  const str = String(d).trim();

  const h = str.match(/(\d+)\s*h/i);
  const m = str.match(/(\d+)\s*m/i);
  const s = str.match(/(\d+)\s*s/i);
  if (h || m || s) {
    return (
      (h ? Number(h[1]) * 3600 : 0) +
      (m ? Number(m[1]) * 60 : 0) +
      (s ? Number(s[1]) : 0)
    );
  }

  // clock style hh:mm:ss or mm:ss
  const parts = str.split(":").map((p) => Number(p));
  if (parts.length && parts.every((n) => Number.isFinite(n))) {
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
  }
  return 0;
}

/** 7225 -> "2h 0m". Under an hour -> "45m 10s". Under a minute -> "25s". */
export function fmtDuration(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Split a stored duration into hours/minutes/seconds for editing.
 * Anything unparseable comes back as zeros rather than throwing.
 */
export function splitDuration(d?: string | null): { h: number; m: number; s: number } {
  const total = durationToSeconds(d);
  return {
    h: Math.floor(total / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}

/**
 * Build the stored form from parts: always "Xh Ym Zs".
 *
 * Kept full even when a part is zero — the recap screenshots read "2h 0m 25s",
 * and durationToSeconds round-trips it exactly. Returns "" for a zero
 * duration so an untouched field stores NULL instead of "0h 0m 0s".
 */
export function joinDuration(h: number, m: number, s: number): string {
  const total = (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
  if (total <= 0) return "";
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  return `${hh}h ${mm}m ${ss}s`;
}

/**
 * Whole hours used for hourly commission.
 *
 * Part-hours are dropped rather than pro-rated: the rule is "1-5 minit
 * bundarkan ke 0", i.e. a stray remainder is not paid for. 2h 05m bills as
 * 2 hours. Kept here beside the other duration maths so the payout rule and
 * the parsing never drift apart.
 */
export function billableHours(totalSeconds: number): number {
  return Math.floor(Math.max(0, totalSeconds) / 3600);
}

export type CommissionInput = {
  commission_type: "percent" | "hour" | null;
  commission_value: number | null;
};

/**
 * What one TikTok link earned.
 *   percent -> rate% of sales
 *   hour    -> rate x whole hours streamed
 * Returns 0 when no commission is configured, so totals stay additive.
 */
export function commissionFor(
  c: CommissionInput,
  sales: number,
  totalSeconds: number
): number {
  if (!c.commission_type || c.commission_value == null) return 0;
  const amount =
    c.commission_type === "percent"
      ? (sales * c.commission_value) / 100
      : billableHours(totalSeconds) * c.commission_value;
  return Math.round(amount * 100) / 100;
}

/** Sum a list of duration strings and format the total. */
export function sumDurations(list: (string | null | undefined)[]): string {
  return fmtDuration(list.reduce((acc, d) => acc + durationToSeconds(d), 0));
}
