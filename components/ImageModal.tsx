"use client";

import { useState } from "react";
import Modal from "./Modal";

/**
 * A screenshot thumbnail that opens the full image in a centered modal.
 * Used on live-result cards for both affiliate and marketer views.
 */
export default function ImageModal({
  src,
  alt = "Screenshot",
  title = "Screenshot",
  className = "",
}: {
  src: string;
  alt?: string;
  title?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}
        className={`block cursor-zoom-in overflow-hidden rounded-xl border border-line ${className}`}
        aria-label="View screenshot">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="w-full" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="mx-auto max-h-[75vh] w-auto rounded-xl border border-line" />
      </Modal>
    </>
  );
}
