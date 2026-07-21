"use client";

import { useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

/**
 * Autoplaying UGC clip with real controls.
 *
 * Browsers only allow autoplay while muted, so we start muted and loop; the
 * sound button is the user gesture that unmutes. Clicking the video itself
 * toggles play/pause — without this the clip looked frozen and dead.
 */
export default function UgcVideo({
  src,
  label,
  className = "",
}: {
  src: string;
  label?: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);

  function togglePlay() {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }

  function toggleSound(e: React.MouseEvent) {
    e.stopPropagation(); // don't also pause the video
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted && v.paused) {
      v.play();
      setPlaying(true);
    }
  }

  return (
    <div
      className={`group relative cursor-pointer overflow-hidden rounded-2xl shadow-glass ${className}`}
      onClick={togglePlay}
      role="button"
      tabIndex={0}
      aria-label={playing ? "Pause video" : "Play video"}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          togglePlay();
        }
      }}
    >
      <video
        ref={ref}
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
      />

      {label && (
        <span className="pointer-events-none absolute left-2 top-2 rounded-lg bg-black/55 px-2 py-1 text-[10px] font-bold text-white backdrop-blur">
          {label}
        </span>
      )}

      {/* Sound toggle — the click that legally unmutes */}
      <button
        onClick={toggleSound}
        aria-label={muted ? "Unmute video" : "Mute video"}
        className="absolute right-2 top-2 cursor-pointer rounded-lg bg-black/55 p-1.5 text-white backdrop-blur transition-colors duration-200 hover:bg-black/75"
      >
        {muted ? (
          <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>

      {/* Play affordance: always visible when paused, on hover when playing */}
      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
          playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"
        }`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur">
          {playing ? (
            <Pause className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Play className="ml-0.5 h-5 w-5" aria-hidden="true" />
          )}
        </span>
      </div>
    </div>
  );
}
