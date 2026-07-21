"use client";

import { useState } from "react";
import {
  Camera, CalendarDays, Clock, Hash, Pencil, TrendingUp, Users,
  ShoppingBag, Timer, ExternalLink, Check, Loader2, AlertCircle,
  Link as LinkIcon, Download, Play, Send,
} from "lucide-react";
import Pagination from "@/components/Pagination";
import { getPage, paginate } from "@/lib/pagination";
import { fmtDate, fmtTimeRange } from "@/lib/format";
import { useSearchParams } from "next/navigation";

export type GridItem = {
  id: number;
  profile_label: string;
  profile_url: string;
  live_date: string;
  start_time: string;
  end_time: string | null;
  note: string | null;
  status: string;
  post_url: string | null;
  result_id: number | null;
  gmv: number | null;
  viewers: number | null;
  items_sold: number | null;
  duration_live: string | null;
  screenshot_path: string | null;
};

// 5 columns x 6 rows per page on desktop; anything beyond spills to page 2.
const GRID_COLS = 5;
const GRID_ROWS = 6;
const GRID_SIZE = GRID_COLS * GRID_ROWS; // 30

// Action button colours mirror the HCKCREA palette.
const ACTION = {
  download: "linear-gradient(135deg, #3b82f6, #60a5fa)", // blue
  edit: "linear-gradient(135deg, #7c4dff, #b388ff)",     // purple
  save: "linear-gradient(135deg, #22c55e, #4ade80)",     // green
  transfer: "linear-gradient(135deg, #22c55e, #4ade80)", // green
};

export default function LiveGrid({
  items,
  emptyText,
  reload,
}: {
  items: GridItem[];
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
          <LiveCard key={it.id} it={it} reload={reload} />
        ))}
      </div>
      <Pagination page={page} total={items.length} size={GRID_SIZE} />
    </>
  );
}

function LiveCard({ it, reload }: { it: GridItem; reload: () => void }) {
  const done = it.status === "completed";
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(it.post_url || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Saving the link auto-transfers the live to Done Post (the server only
  // holds it back if the screenshot is still missing).
  async function saveLink() {
    setBusy(true); setError("");
    const res = await fetch(`/api/bookings/${it.id}/post-url`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_url: url }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || "Could not save");
    setEditing(false);
    if (data.needsScreenshot) {
      setError("Link saved — upload the screenshot to move this to Done Post.");
    }
    reload();
  }

  // The thumbnail links to the posted video when we have one, so the card
  // itself is clickable to play; otherwise it opens the screenshot.
  const thumbHref = it.post_url || it.screenshot_path || undefined;

  return (
    <article className="glass flex flex-col overflow-hidden rounded-2xl">
      {/* Thumbnail — click to play the post */}
      <div className="relative aspect-video bg-white">
        {it.screenshot_path ? (
          <a href={thumbHref} target="_blank" rel="noopener noreferrer"
            className="group block h-full w-full"
            title={it.post_url ? "Play posted video" : "View screenshot"}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.screenshot_path} alt={`Live result ${it.live_date}`}
              className="h-full w-full object-contain" />
            {it.post_url && (
              <span className="absolute inset-0 flex items-center justify-center bg-ink/0 transition-colors duration-200 group-hover:bg-ink/25">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 opacity-0 shadow-lift transition-opacity duration-200 group-hover:opacity-100">
                  <Play className="h-4 w-4 fill-ink text-ink" aria-hidden="true" />
                </span>
              </span>
            )}
          </a>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-fg">
            <Camera className="h-5 w-5" aria-hidden="true" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">
              No screenshot
            </span>
          </div>
        )}

        <span className="absolute left-2 top-2 max-w-[70%] truncate rounded-lg bg-white/85 px-2 py-1 text-[10px] font-bold text-ink backdrop-blur">
          {it.profile_label}
        </span>
        <span className={`absolute right-2 top-2 rounded-lg px-2 py-1 text-[10px] font-bold backdrop-blur ${
          done ? "bg-emerald-500/90 text-white" : "bg-amber-400/90 text-amber-950"
        }`}>
          {done ? "DONE" : "PENDING"}
        </span>
      </div>

      {/* meta */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="flex items-center gap-1 text-[11px] font-semibold text-ink">
          <CalendarDays className="h-3 w-3 shrink-0 text-muted-fg" aria-hidden="true" />
          {fmtDate(it.live_date)}
        </p>
        <p className="flex items-center gap-1 text-[11px] text-muted-fg">
          <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
          {fmtTimeRange(it.start_time, it.end_time)}
        </p>
        <p className="flex items-center gap-1 text-[11px] text-muted-fg">
          <Hash className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="font-mono">live {it.id}</span>
        </p>
        <p className="flex items-center gap-1 text-[11px] text-muted-fg">
          <Pencil className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{it.note || "—"}</span>
        </p>

        {done && (
          <div className="mt-1 grid grid-cols-2 gap-1.5 border-t border-line pt-2">
            <MiniStat Icon={TrendingUp} label="GMV"
              value={it.gmv != null ? `RM${it.gmv}` : "—"} />
            <MiniStat Icon={Users} label="Viewers" value={it.viewers ?? "—"} />
            <MiniStat Icon={ShoppingBag} label="Items" value={it.items_sold ?? "—"} />
            <MiniStat Icon={Timer} label="Duration" value={it.duration_live ?? "—"} />
          </div>
        )}

        {/* Post link — inline editor or read-only row */}
        {editing ? (
          <input
            className="input !px-2 !py-1 text-[11px]"
            type="url" autoFocus
            placeholder="https://www.tiktok.com/@you/video/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveLink()}
            aria-label="Video post link"
          />
        ) : it.post_url ? (
          <a href={it.post_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 truncate text-[11px] text-accent hover:underline">
            <LinkIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{it.post_url}</span>
          </a>
        ) : (
          <p className="flex items-center gap-1 text-[11px] text-muted-fg">
            <LinkIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
            No video link yet
          </p>
        )}

        {error && (
          <p className="flex items-start gap-1 text-[10px] leading-tight text-danger">
            <AlertCircle className="mt-px h-3 w-3 shrink-0" aria-hidden="true" />{error}
          </p>
        )}

        {/* Action row — download + update link (saving the link moves the
            live to Done Post). */}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2">
          <ActionBtn
            title={it.screenshot_path ? "Download video screenshot" : "Nothing to download yet"}
            bg={ACTION.download}
            href={it.screenshot_path || undefined}
            download
            disabled={!it.screenshot_path}>
            <Download className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
          </ActionBtn>

          {editing ? (
            <ActionBtn title="Save link" bg={ACTION.save} onClick={saveLink} disabled={busy}>
              <Check className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
            </ActionBtn>
          ) : (
            <ActionBtn title={it.post_url ? "Edit video link" : "Update video link"}
              bg={ACTION.edit} onClick={() => { setUrl(it.post_url || ""); setEditing(true); }}>
              <Pencil className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
            </ActionBtn>
          )}
        </div>
      </div>
    </article>
  );
}

/** 28px gradient icon button — mirrors HCKCREA's ActionBtn. */
function ActionBtn({
  title, bg, onClick, href, download, disabled, children,
}: {
  title: string;
  bg: string;
  onClick?: () => void;
  href?: string;
  download?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const cls =
    "flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white shadow-lift transition-transform duration-200 hover:scale-105 disabled:opacity-50";

  if (href && !disabled) {
    return (
      <a href={href} title={title} aria-label={title} className={cls} style={{ background: bg }}
        target="_blank" rel="noopener noreferrer" download={download}>
        {children}
      </a>
    );
  }
  return (
    <button onClick={onClick} disabled={disabled} title={title} aria-label={title}
      className={cls} style={{ background: bg }}>
      {disabled ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : children}
    </button>
  );
}

function MiniStat({ Icon, label, value }: {
  Icon: typeof TrendingUp; label: string; value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-white/60 px-2 py-1.5 text-center">
      <Icon className="mx-auto mb-0.5 h-3 w-3 text-muted-fg" aria-hidden="true" />
      <p className="truncate text-[11px] font-extrabold leading-tight text-ink">{value}</p>
      <p className="text-[9px] uppercase tracking-wide text-muted-fg">{label}</p>
    </div>
  );
}
