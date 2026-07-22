"use client";

import { useState } from "react";
import { PlayCircle, ExternalLink } from "lucide-react";
import Modal from "@/components/Modal";

const VIDEO_URL = "https://vimeo.com/1212142766";
const EMBED_URL = "https://player.vimeo.com/video/1212142766";

/**
 * The walkthrough video, played in place.
 *
 * The written guides sit behind each tab's question mark; this is the same
 * thing shown rather than read, for anyone who would rather watch once than
 * read six pages. A direct Vimeo link sits underneath in case the embed is
 * blocked — a video that silently fails to load is worse than a plain link.
 */
export default function VideoSop() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-lift transition-colors duration-200 hover:opacity-90">
        <PlayCircle className="h-4 w-4" aria-hidden="true" />
        Video SOP
      </button>

      <Modal open={open} onClose={() => setOpen(false)}
        title="Video SOP"
        subtitle="Tonton panduan penuh cara guna sistem ini.">
        <div className="space-y-3">
          <div className="relative w-full overflow-hidden rounded-xl bg-ink"
            style={{ paddingTop: "56.25%" }}>
            <iframe
              src={EMBED_URL}
              title="Video SOP NL Affiliate Army"
              className="absolute inset-0 h-full w-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <a href={VIDEO_URL} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Buka di Vimeo
            </a>
            <button type="button" className="btn !py-2" onClick={() => setOpen(false)}>
              Tutup
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
