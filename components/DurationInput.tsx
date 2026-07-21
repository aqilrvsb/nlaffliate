"use client";

import { splitDuration, joinDuration } from "@/lib/format";

/**
 * Duration entered as three numbers instead of one free-text field.
 *
 * The value stays the canonical "Xh Ym Zs" string the rest of the app already
 * sums and displays — this only changes how it is typed. Minutes and seconds
 * roll over (75s becomes 1m 15s) so a mistyped figure self-corrects rather
 * than being stored as nonsense.
 */
export default function DurationInput({
  value,
  onChange,
  idPrefix,
  compact,
}: {
  value: string;
  onChange: (v: string) => void;
  idPrefix: string;
  /** Tighter styling for the inline marketer panel. */
  compact?: boolean;
}) {
  const { h, m, s } = splitDuration(value);

  function set(part: "h" | "m" | "s", raw: string) {
    const n = Math.max(0, Math.floor(Number(raw) || 0));
    onChange(
      joinDuration(
        part === "h" ? n : h,
        part === "m" ? n : m,
        part === "s" ? n : s
      )
    );
  }

  const box = compact
    ? "input !py-1.5 w-full text-center text-sm"
    : "input !py-1.5 w-full text-center text-sm";

  const field = (
    label: string,
    part: "h" | "m" | "s",
    val: number,
    max?: number
  ) => (
    <div className="flex-1">
      <input
        id={`${idPrefix}-${part}`}
        type="number"
        min={0}
        max={max}
        inputMode="numeric"
        className={box}
        value={val}
        aria-label={label}
        onChange={(e) => set(part, e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
      />
      <span className="mt-0.5 block text-center text-[10px] font-semibold uppercase tracking-wide text-muted-fg">
        {label}
      </span>
    </div>
  );

  return (
    <div className="flex items-start gap-1.5">
      {field("Hours", "h", h)}
      {field("Minutes", "m", m, 59)}
      {field("Seconds", "s", s, 59)}
    </div>
  );
}
