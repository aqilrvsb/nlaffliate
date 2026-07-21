"use client";

import { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { createPortal } from "react-dom";

/**
 * "Lihat contoh" link that opens a reference screenshot.
 *
 * The examples are static files under /public/examples, so they come off
 * Vercel's CDN and are only fetched when the link is actually clicked —
 * the import forms stay light for the common case where the marketer
 * already knows what to upload.
 */
export default function ExampleHint({
  src,
  alt,
  label = "Lihat contoh",
  caption,
}: {
  src: string;
  alt: string;
  label?: string;
  caption?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-accent transition-colors duration-200 hover:underline"
      >
        <HelpCircle className="h-3 w-3" aria-hidden="true" />
        {label}
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/30 p-4 backdrop-blur-sm"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div className="glass w-full max-w-3xl rounded-2xl p-5" role="dialog" aria-modal="true">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-ink">{alt}</h2>
                  {caption && <p className="text-xs text-muted-fg">{caption}</p>}
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Tutup"
                  className="shrink-0 cursor-pointer rounded-lg p-2 text-muted-fg transition-colors duration-200 hover:bg-white hover:text-ink"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt}
                className="w-full rounded-xl border border-line bg-white"
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
