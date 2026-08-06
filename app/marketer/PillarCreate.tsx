"use client";

import { useEffect, useMemo, useState } from "react";
import {
  HelpCircle, Save, Loader2, Check, AlertCircle, Layers, CalendarDays, X, Tag, Eye,
} from "lucide-react";
import { BrandSelect } from "./BrandsTab";
import { PILLARS, PILLAR_COLUMNS, getPillar, type PillarColumnKey } from "@/lib/pillars";
import { todayKL } from "@/lib/daterange";
import { useCanEdit } from "./edit-context";

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

const CUSTOM_NO = 17;

type Draft = { rows: Record<number, Row>; customName: string };

export default function PillarCreate() {
  const canEdit = useCanEdit();
  const [level, setLevel] = useState(1);
  const [date, setDate] = useState(todayKL());
  const [brand, setBrand] = useState("");
  // Drafts are kept for EVERY level in memory, so switching levels (and filling
  // several) never loses unsaved input — one Submit writes them all at once.
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [loaded, setLoaded] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [hint, setHint] = useState<{ name: string; text: string } | null>(null);

  const pillar = getPillar(level)!;
  const cur: Draft = drafts[level] || { rows: {}, customName: "" };
  const rows = cur.rows;
  const customName = cur.customName;

  // A new brand/date is a fresh sheet — drop every level's draft and reload.
  useEffect(() => {
    setDrafts({}); setLoaded(new Set()); setSaved(null); setError("");
  }, [brand, date]);

  // Load the current level once (lazy). Already-loaded (or edited) levels keep
  // their draft, so a level you filled but didn't submit is never refetched.
  useEffect(() => {
    if (!brand || loaded.has(level)) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/pillars?level=${level}&date=${date}&brand=${brand}`)
      .then((r): any => (r.ok ? r.json() : {}))
      .then((d) => {
        if (cancelled) return;
        const next: Record<number, Row> = {};
        let cname = "";
        for (const e of d.entries || []) {
          next[e.item_no] = {
            problem: e.problem || "", solution: e.solution || "",
            planning: e.planning || "", execution: e.execution || "",
          };
          if (e.item_no === CUSTOM_NO && e.item_name) cname = e.item_name;
        }
        setDrafts((c) => ({ ...c, [level]: { rows: next, customName: cname } }));
        setLoaded((s) => new Set(s).add(level));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [level, brand, date, loaded]);

  function set(no: number, col: PillarColumnKey, val: string) {
    setDrafts((c) => {
      const d = c[level] || { rows: {}, customName: "" };
      return { ...c, [level]: { ...d, rows: { ...d.rows, [no]: { ...(d.rows[no] || EMPTY), [col]: val } } } };
    });
    setSaved(null);
  }
  function setCustom(val: string) {
    setDrafts((c) => {
      const d = c[level] || { rows: {}, customName: "" };
      return { ...c, [level]: { ...d, customName: val } };
    });
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

  // How many levels currently hold some input — shown next to Submit so the
  // marketer knows the whole batch (not just the visible level) will be saved.
  const levelsWithContent = useMemo(() => {
    let n = 0;
    for (const d of Object.values(drafts)) {
      const has = Object.values(d.rows).some((r) => PILLAR_COLUMNS.some((c) => (r[c.key] || "").trim()))
        || !!d.customName.trim();
      if (has) n++;
    }
    return n;
  }, [drafts]);

  async function submit() {
    if (!brand) return setError("Pilih brand dahulu.");
    setSubmitting(true); setError(""); setSaved(null);
    const levels: Record<string, { rows: Record<number, Row>; custom_name: string }> = {};
    for (const [lvl, d] of Object.entries(drafts)) {
      levels[lvl] = { rows: d.rows, custom_name: d.customName };
    }
    const res = await fetch("/api/pillars/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, brand_id: brand, levels }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) return setError(data.error || "Could not save.");
    const lvls = (data.levels || []).map((l: number) => `L${l}`).join(", ");
    setSaved(`${data.saved} item disimpan${data.cleared ? `, ${data.cleared} dikosongkan` : ""}${lvls ? ` · ${lvls}` : ""} · Laporan dihantar ke Telegram`);
  }

  if (!canEdit) return (
    <p className="card flex items-center gap-2 text-sm text-muted-fg">
      <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
      Create Pillar hanya untuk workspace anda sendiri. Guna <b>Reporting Pillar</b> untuk lihat pillar marketer ini.
    </p>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="section-title">Create Pillar</h2>
          <p className="text-sm text-muted-fg">
            Isi mana-mana level — boleh tukar level tanpa hilang data. Tekan <b>Submit semua</b> sekali untuk simpan semua &amp; hantar laporan penuh ke Telegram.
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
          {levelsWithContent > 0 && (
            <span className="hidden text-xs text-muted-fg sm:inline">
              {levelsWithContent} level ada isi
            </span>
          )}
          <button className="btn" onClick={submit} disabled={submitting || !brand}
            title={!brand ? "Pilih brand dahulu" : "Simpan semua level & hantar laporan penuh ke Telegram"}>
            {submitting
              ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Menghantar…</>
              : <><Save className="h-4 w-4" aria-hidden="true" />Submit semua</>}
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

              {/* Row 17 — a custom item the marketer names themselves. */}
              {(() => {
                const row = rows[CUSTOM_NO] || EMPTY;
                const active = !!customName.trim() || PILLAR_COLUMNS.some((c) => (row[c.key] || "").trim());
                return (
                  <tr className={`border-t border-line/60 align-top ${active ? "bg-primary/[0.03]" : ""}`}>
                    <td className="px-3 py-3 text-center text-muted-fg">{CUSTOM_NO}</td>
                    <td className="px-3 py-3">
                      <input
                        value={customName}
                        disabled={!brand}
                        onChange={(e) => setCustom(e.target.value)}
                        placeholder="Nama item tambahan…"
                        aria-label="Nama item tambahan"
                        className="w-full rounded-lg border border-dashed border-line bg-white/70 px-2.5 py-1.5 text-sm font-semibold text-ink outline-none transition-colors duration-200 focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-muted/40"
                      />
                    </td>
                    {PILLAR_COLUMNS.map((c) => (
                      <td key={c.key} className="px-2 py-2">
                        <textarea
                          rows={2}
                          value={row[c.key]}
                          disabled={!brand}
                          onChange={(e) => set(CUSTOM_NO, c.key, e.target.value)}
                          aria-label={`Item tambahan — ${c.label}`}
                          className={`w-full min-w-[180px] resize-y rounded-lg border border-line bg-white/70 px-2.5 py-1.5 text-sm text-ink outline-none transition-colors duration-200 focus:ring-2 disabled:cursor-not-allowed disabled:bg-muted/40 ${COL_TINT[c.key]}`}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })()}
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
