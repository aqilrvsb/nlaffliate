"use client";

import { useState } from "react";
import { HelpCircle, Target, ListChecks, Info } from "lucide-react";
import Modal from "@/components/Modal";
import { AFFILIATE_SOP, MARKETER_SOP, type Sop } from "@/lib/sop";

/**
 * Panduan halaman semasa.
 *
 * Setiap tab ada tujuan dan langkah kerjanya sendiri, dan pengguna baharu
 * selalunya tidak tahu tab mana yang sepatutnya digunakan bila. Butang ini
 * duduk di sebelah tajuk halaman supaya jawapannya ada di tempat soalan itu
 * timbul, bukan di dokumen berasingan yang tiada siapa buka.
 *
 * Tiada panduan bermakna tiada butang — lebih baik senyap daripada membuka
 * kotak kosong.
 */
export default function SopButton({
  role, tab, variant = "default",
}: {
  role: "affiliate" | "marketer";
  tab: string;
  /** "pill" sits inside a tab pill and inherits its colour. */
  variant?: "default" | "pill";
}) {
  const [open, setOpen] = useState(false);
  const sop: Sop | undefined =
    role === "affiliate" ? AFFILIATE_SOP[tab] : MARKETER_SOP[tab];

  if (!sop) return null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        aria-label={`Panduan ${sop.title}`}
        title="Panduan halaman ini"
        className={
          variant === "pill"
            ? "inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full opacity-60 transition-opacity duration-200 hover:opacity-100"
            : "inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-fg transition-colors duration-200 hover:bg-primary/10 hover:text-primary"
        }>
        <HelpCircle className={variant === "pill" ? "h-4 w-4" : "h-[18px] w-[18px]"}
          aria-hidden="true" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)}
        title={`Panduan — ${sop.title}`}
        subtitle="Baca ini kalau anda baru mula guna halaman ini.">
        <div className="space-y-5">
          <section>
            <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-ink">
              <Target className="h-4 w-4 text-primary" aria-hidden="true" />
              Tujuan Halaman Ini
            </h3>
            <p className="text-sm leading-relaxed text-muted-fg">{sop.purpose}</p>
          </section>

          <section>
            <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-ink">
              <ListChecks className="h-4 w-4 text-primary" aria-hidden="true" />
              SOP — Langkah Kerja
            </h3>
            <ol className="space-y-2">
              {sop.steps.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-muted-fg">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </section>

          {sop.note && (
            <section className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-amber-800">{sop.note}</p>
            </section>
          )}

          <div className="flex justify-end">
            <button type="button" className="btn !py-2" onClick={() => setOpen(false)}>
              Faham
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
