"use client";

import { useState } from "react";
import { Check, Loader2, Percent, Clock, AlertCircle } from "lucide-react";

export type Commission = {
  commission_type: "percent" | "hour" | null;
  commission_value: number | null;
};

/** How a commission reads once set: "12%" or "RM25 / jam". */
export function commissionLabel(c: Commission): string | null {
  if (!c.commission_type || c.commission_value == null) return null;
  return c.commission_type === "percent"
    ? `${c.commission_value}%`
    : `RM${c.commission_value} / jam`;
}

/**
 * Set the commission on one TikTok link.
 *
 * Percent and hour are mutually exclusive — a link is paid one way or the
 * other — so the type is a two-way toggle rather than two independent
 * fields, and the unit on the amount follows it.
 */
export default function CommissionEditor({
  profileId,
  initial,
  onSaved,
}: {
  profileId: number;
  initial: Commission;
  onSaved?: (c: Commission) => void;
}) {
  const [type, setType] = useState<"percent" | "hour" | "">(
    initial.commission_type ?? ""
  );
  const [value, setValue] = useState(
    initial.commission_value != null ? String(initial.commission_value) : ""
  );
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true); setError(""); setSaved(false);
    const res = await fetch(`/api/profiles/${profileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commission_type: type || null,
        commission_value: type ? Number(value) : null,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || "Could not save.");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    onSaved?.({ commission_type: data.commission_type, commission_value: data.commission_value });
  }

  const pill = (k: "percent" | "hour", Icon: typeof Percent, label: string) => (
    <button
      type="button"
      onClick={() => { setType(type === k ? "" : k); setError(""); }}
      className={`flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors duration-200 ${
        type === k
          ? "bg-primary text-primary-fg shadow-lift"
          : "border border-line bg-white/70 text-muted-fg hover:text-ink"
      }`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </button>
  );

  return (
    <div className="mt-2 rounded-lg border border-line bg-white/60 p-2">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-fg">
        Jenis komisyen
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {pill("percent", Percent, "Percent")}
        {pill("hour", Clock, "Hour")}

        {type && (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={type === "percent" ? 100 : undefined}
              step="any"
              className="input !w-24 !py-1 text-sm"
              placeholder={type === "percent" ? "e.g. 12" : "e.g. 25"}
              value={value}
              aria-label={type === "percent" ? "Peratus komisyen" : "RM sejam"}
              onChange={(e) => { setValue(e.target.value); setError(""); }}
            />
            <span className="text-[11px] font-semibold text-muted-fg">
              {type === "percent" ? "%" : "RM / jam"}
            </span>
          </div>
        )}

        <button
          onClick={save}
          disabled={busy || (!!type && value === "")}
          className="btn !py-1 text-[11px] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                : <Check className="h-3 w-3" aria-hidden="true" />}
          {type ? "Simpan" : "Kosongkan"}
        </button>

        {saved && <span className="text-[11px] font-medium text-emerald-600">Saved</span>}
        {error && (
          <span className="flex items-center gap-1 text-[11px] text-danger">
            <AlertCircle className="h-3 w-3" aria-hidden="true" />{error}
          </span>
        )}
      </div>
    </div>
  );
}
