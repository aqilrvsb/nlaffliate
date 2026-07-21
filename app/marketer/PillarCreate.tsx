"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HelpCircle, Save, Loader2, Check, AlertCircle, Layers, CalendarDays, X, Tag,
} from "lucide-react";
import { BrandSelect } from "./BrandsTab";
import { PILLARS, PILLAR_COLUMNS, getPillar, type PillarColumnKey } from "@/lib/pillars";
import { todayKL } from "@/lib/daterange";

type Row = Record<PillarColumnKey, string>;
const EMPTY: Row = { problem: "", solution: "", planning: "", execution: "" };

/** Tint per column so the four inputs stay distinguishable while scanning. */
const COL_TINT: Record<PillarColumnKey, string> = {
  problem:   "focus:border-red-400 focus:ring-red-100",
  solution:  "focus:border-amber-400 focus:ring-amber-100",
  planning:  "focus:border-sky-400 focus:ring-sky-100",
  execution: "focus:border-emerald-400 focus:ring-emerald-100",
};
const COL_HEAD: Record<PillarColumnKey, string> = {
  problem:   "bg-red-50 text-red-700",
  solution:  "bg-amber-50 text-amber-700",
  planning:  "bg-sky-50 text-sky-700",
  execution: "bg-emerald-50 text-emerald-700",
};

export default function PillarCreate() {
  const [level, setLevel] = useState(1);
  const [date, setDate] = useState(todayKL());
  const [brand, setBrand] = useState("");
  const [rows, setRows] = useState<Record<number, Row>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [hint, setHint] = useState<{ name: string; text: string } | null>(null);

  const pillar = getPillar(level)!;

  const load = useCallback(async () => {
    setLoading(true); setSaved(null); setError("");
    // Entries are per (brand, level, date) — with no brand chosen there is
    // nothing to load, so start from a blank sheet.
    if (!brand) {
      setRows({});
      setLoading(false);
      return;
    }
    const d = await fetch(
      `/api/pillars?level=${level}&date=${date}&brand=${brand}`
    ).then((r) => r.json());
    const next: Record<number, Row> = {};
    for (const e of d.entries || []) {
      next[e.item_no] = {
        problem: e.problem || "",
        solution: e.solution || "",
        planning: e.planning || "",
        execution: e.execution || "",
      };
    }
    setRows(next);
    setLoading(false);
  }, [level, date, brand]);

  useEffect(() => { load(); }, [load]);

  function set(no: number, col: PillarColumnKey, val: string) {
    setRows((cur) => ({ ...cur, [no]: { ...(cur[no] || EMPTY), [col]: val } }));
    setSaved(null);
  }

  const filled = useMemo(
    () =>
      pillar.items.filter((i) => {
        const r = rows[i.no];
        return r && PILLAR_COLUMNS.some((c) => (r[c.key] || "").trim());
      }).length,
    [rows, pillar]
  );

  async function save() {
    if (!brand) return setError("Pilih brand dahulu.");
    setSaving(true); setError(""); setSaved(null);
    const res = await fetch("/api/pillars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level, date, brand_id: brand, rows }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setError(data.error || "Could not save.");
    setSaved(`${data.saved} item disimpan${data.cleared ? `, ${data.cleared} dikosongkan` : ""}`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="section-title">Create Pillar</h2>
          <p className="text-sm text-muted-fg">
            Pilih level, isi kolum yang berkaitan. Tidak semua baris perlu diisi.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px]">
            <label className="label" htmlFor="pillar-brand">
              <Tag className="mr-1 inline h-3 w-3" aria-hidden="true" />
              Brand
            </label>
            <BrandSelect id="pillar-brand" value={brand} onChange={setBrand}
              className="!py-2" />
          </div>
          <div>
            <label className="label" htmlFor="pillar-date">
              <CalendarDays className="mr-1 inline h-3 w-3" aria-hidden="true" />
              Tarikh
            </label>
            <input id="pillar-date" type="date" className="input !py-2"
              value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
      </div>

      {!brand && (
        <p className="card flex items-center gap-2 border-amber-200 bg-amber-50/60 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Pilih brand dahulu sebelum mengisi — setiap pillar disimpan mengikut
          brand dan tarikh.
        </p>
      )}

      {/* Level picker */}
      <fieldset className="card">
        <legend className="sr-only">Pilih level pillar</legend>
        <div className="mb-3 flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="font-bold text-ink">Pilih Level</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {PILLARS.map((p) => {
            const on = p.level === level;
            return (
              <label key={p.level}
                className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all duration-200 ${
                  on
                    ? "border-primary bg-primary/5 shadow-lift"
                    : "border-line bg-white/60 hover:bg-white"
                }`}>
                <input type="radio" name="pillar-level" value={p.level} checked={on}
                  onChange={() => setLevel(p.level)}
                  className="h-4 w-4 cursor-pointer accent-primary" />
                <span className="min-w-0">
                  <span className={`block text-[10px] font-bold uppercase tracking-wide ${
                    on ? "text-primary" : "text-muted-fg"
                  }`}>
                    Level {p.level}
                  </span>
                  <span className="block truncate text-sm font-semibold text-ink">
                    {p.title}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Progress + save */}
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[220px] flex-1">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-bold text-ink">
              Level {pillar.level} — {pillar.title}
            </span>
            <span className="text-muted-fg">
              {filled}/{pillar.items.length} diisi
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary-hover transition-all duration-300"
              style={{ width: `${(filled / pillar.items.length) * 100}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saved && (
            <span className="flex items-center gap-1 text-sm font-medium text-emerald-600">
              <Check className="h-4 w-4" aria-hidden="true" />{saved}
            </span>
          )}
          {error && (
            <span className="flex items-center gap-1 text-sm text-danger">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />{error}
            </span>
          )}
          <button className="btn" onClick={save} disabled={saving || loading || !brand}
            title={!brand ? "Pilih brand dahulu" : undefined}>
            {saving
              ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Menyimpan…</>
              : <><Save className="h-4 w-4" aria-hidden="true" />Simpan</>}
          </button>
        </div>
      </div>

      {/* Checklist table */}
      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-fg">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Loading…
        </p>
      ) : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wide">
              <tr>
                <th className="w-10 px-3 py-3 text-center font-semibold text-muted-fg">#</th>
                <th className="w-[220px] px-3 py-3 font-semibold text-muted-fg">Item</th>
                {PILLAR_COLUMNS.map((c) => (
                  <th key={c.key} className={`px-3 py-3 font-semibold ${COL_HEAD[c.key]}`}>
                    <span className="whitespace-nowrap">{c.emoji} {c.label}</span>
                    <span className="block text-[10px] font-medium normal-case opacity-70">
                      ({c.owner})
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pillar.items.map((item) => {
                const row = rows[item.no] || EMPTY;
                const active = PILLAR_COLUMNS.some((c) => (row[c.key] || "").trim());
                return (
                  <tr key={item.no}
                    className={`border-t border-line/60 align-top transition-colors duration-200 ${
                      active ? "bg-primary/[0.03]" : ""
                    }`}>
                    <td className="px-3 py-3 text-center text-muted-fg">{item.no}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-start gap-1.5">
                        <span className="font-semibold leading-snug text-ink">{item.name}</span>
                        <button
                          onClick={() => setHint({ name: item.name, text: item.hint })}
                          aria-label={`Penerangan ${item.name}`}
                          className="mt-0.5 shrink-0 cursor-pointer rounded-full text-muted-fg transition-colors duration-200 hover:text-accent">
                          <HelpCircle className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                    {PILLAR_COLUMNS.map((c) => (
                      <td key={c.key} className="px-2 py-2">
                        <textarea
                          rows={2}
                          value={row[c.key]}
                          disabled={!brand}
                          onChange={(e) => set(item.no, c.key, e.target.value)}
                          aria-label={`${item.name} — ${c.label}`}
                          className={`w-full min-w-[180px] resize-y rounded-lg border border-line bg-white/70 px-2.5 py-1.5 text-sm text-ink outline-none transition-colors duration-200 focus:ring-2 disabled:cursor-not-allowed disabled:bg-muted/40 ${COL_TINT[c.key]}`}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Hint popover — plain panel rather than a title attribute so the
          longer multi-line references stay readable on touch devices. */}
      {hint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setHint(null); }}>
          <div className="glass w-full max-w-md rounded-2xl p-5" role="dialog" aria-modal="true">
            <div className="mb-2 flex items-start justify-between gap-3">
              <h3 className="font-bold text-ink">{hint.name}</h3>
              <button onClick={() => setHint(null)} aria-label="Tutup"
                className="shrink-0 cursor-pointer rounded-lg p-1.5 text-muted-fg transition-colors duration-200 hover:bg-white hover:text-ink">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-fg">
              {hint.text}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
