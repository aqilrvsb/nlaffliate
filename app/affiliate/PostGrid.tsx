"use client";

import { useState } from "react";
import {
  CalendarDays, Check, Loader2, AlertCircle, Image as ImageIcon,
  Link as LinkIcon, Play, Video, Download,
} from "lucide-react";
import Pagination from "@/components/Pagination";
import Modal from "@/components/Modal";
import { getPage, paginate } from "@/lib/pagination";
import { fmtDate } from "@/lib/format";
import { useSearchParams } from "next/navigation";

export type PostItem = {
  id: number;
  post_date: string;
  video_url: string;
  caption: string | null;
  cover_title: string | null;
  cover_subtitle: string | null;
  cover_thumbnail_url: string | null;
  tiktok_url: string | null;
  status: string;
};

// 5 columns x 6 rows per page.
const GRID_SIZE = 30;

const ACTION = {
  download: "linear-gradient(135deg, #0ea5e9, #38bdf8)", // sky — download video
  cover: "linear-gradient(135deg, #3b82f6, #60a5fa)",    // blue — image cover
  link: "linear-gradient(135deg, #7c4dff, #b388ff)",     // purple — tiktok link
  save: "linear-gradient(135deg, #22c55e, #4ade80)",     // green — save
};

export default function PostGrid({
  items, emptyText, reload,
}: {
  items: PostItem[];
  emptyText: string;
  reload: () => void;
}) {
  const params = useSearchParams();
  const page = getPage(params.get("page"));
  const pageItems = paginate(items, page, GRID_SIZE);

  if (items.length === 0) {
    return <p className="card text-center text-sm text-muted-fg">{emptyText}</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {pageItems.map((it) => (
          <PostCard key={it.id} it={it} reload={reload} />
        ))}
      </div>
      <Pagination page={page} total={items.length} size={GRID_SIZE} />
    </>
  );
}

function PostCard({ it, reload }: { it: PostItem; reload: () => void }) {
  const done = it.status === "done";
  const [playing, setPlaying] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [captionOpen, setCaptionOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(it.tiktok_url || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function saveLink() {
    setBusy(true); setError("");
    const res = await fetch(`/api/posts/${it.id}/tiktok-url`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tiktok_url: url }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || "Could not save");
    setEditing(false);
    reload(); // saving a link moves this card to Done Post
  }

  return (
    <article className="glass flex flex-col overflow-hidden rounded-2xl">
      {/* Video — click to play inline */}
      <div className="relative aspect-[9/16] bg-black">
        {playing ? (
          <video src={it.video_url} controls autoPlay playsInline
            className="h-full w-full object-contain" />
        ) : (
          <button onClick={() => setPlaying(true)}
            className="group h-full w-full cursor-pointer"
            aria-label="Play video">
            {it.cover_thumbnail_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={it.cover_thumbnail_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center">
                <Video className="h-6 w-6 text-white/40" aria-hidden="true" />
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors duration-200 group-hover:bg-black/40">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lift">
                <Play className="ml-0.5 h-4 w-4 fill-ink text-ink" aria-hidden="true" />
              </span>
            </span>
          </button>
        )}

        <span className={`absolute right-2 top-2 rounded-lg px-2 py-1 text-[10px] font-bold backdrop-blur ${
          done ? "bg-emerald-500/90 text-white" : "bg-amber-400/90 text-amber-950"
        }`}>
          {done ? "DONE" : "PENDING"}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="flex items-center gap-1 text-[11px] font-semibold text-ink">
          <CalendarDays className="h-3 w-3 shrink-0 text-muted-fg" aria-hidden="true" />
          {fmtDate(it.post_date)}
        </p>
        {/* Text the affiliate needs to paste into TikTok — shown inline */}
        <TextBlock label="Main Text" value={it.cover_title} bold />
        <TextBlock label="Sub Text" value={it.cover_subtitle} />
        <TextBlock label="Caption" value={it.caption} scroll />

        {editing ? (
          <input className="input !px-2 !py-1 text-[11px]" type="url" autoFocus
            placeholder="https://www.tiktok.com/@you/video/…"
            value={url} onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveLink()}
            aria-label="TikTok link" />
        ) : it.tiktok_url ? (
          <a href={it.tiktok_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 truncate text-[11px] text-accent hover:underline">
            <LinkIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{it.tiktok_url}</span>
          </a>
        ) : null}

        {error && (
          <p className="flex items-start gap-1 text-[10px] leading-tight text-danger">
            <AlertCircle className="mt-px h-3 w-3 shrink-0" aria-hidden="true" />{error}
          </p>
        )}

        {/* Actions: cover · caption · tiktok link */}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
          {/* Download + cover are only useful while the post is still to be
              published — Done Post just needs the link editor. */}
          {!done && (
            <>
              <a href={it.video_url} target="_blank" rel="noopener noreferrer" download
                title="Download video" aria-label="Download video"
                className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white shadow-lift transition-transform duration-200 hover:scale-105"
                style={{ background: ACTION.download }}>
                <Download className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
              </a>

              <ActionBtn title="Image cover" bg={ACTION.cover}
                onClick={() => setCoverOpen(true)} disabled={!it.cover_thumbnail_url}>
                <ImageIcon className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
              </ActionBtn>
            </>
          )}

          {editing ? (
            <ActionBtn title="Save TikTok link" bg={ACTION.save}
              onClick={saveLink} disabled={busy}>
              <Check className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
            </ActionBtn>
          ) : (
            <ActionBtn title={it.tiktok_url ? "Edit TikTok link" : "Update TikTok link"}
              bg={ACTION.link}
              onClick={() => { setUrl(it.tiktok_url || ""); setEditing(true); }}>
              <LinkIcon className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
            </ActionBtn>
          )}
        </div>
      </div>

      {/* Image cover */}
      <Modal open={coverOpen} onClose={() => setCoverOpen(false)} title="Image Cover">
        {it.cover_thumbnail_url ? (
          <a href={it.cover_thumbnail_url} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.cover_thumbnail_url} alt="Cover"
              className="mx-auto max-h-[70vh] rounded-xl border border-line" />
          </a>
        ) : (
          <p className="text-sm text-muted-fg">No cover image for this post.</p>
        )}
      </Modal>

    </article>
  );
}

/** Labelled text shown on the card, with a one-click copy. */
function TextBlock({ label, value, bold, scroll }: {
  label: string; value: string | null; bold?: boolean; scroll?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;

  return (
    <div>
      <div className="flex items-center justify-between gap-1">
        <span className="text-[9px] font-bold uppercase tracking-wide text-muted-fg">
          {label}
        </span>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {}
          }}
          className="cursor-pointer text-[9px] font-semibold text-accent hover:underline">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className={`whitespace-pre-wrap rounded-lg border border-line bg-white/70 px-2 py-1 text-[11px] leading-snug text-ink ${
        bold ? "font-bold" : ""
      } ${scroll ? "max-h-20 overflow-y-auto" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function ActionBtn({ title, bg, onClick, disabled, children }: {
  title: string; bg: string; onClick?: () => void;
  disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} aria-label={title}
      className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white shadow-lift transition-transform duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
      style={{ background: bg }}>
      {disabled ? children : children}
    </button>
  );
}
