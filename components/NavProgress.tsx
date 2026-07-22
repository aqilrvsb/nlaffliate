"use client";

import { useSyncExternalStore } from "react";
import { subscribe, getPending, getServerPending } from "@/lib/navprogress";

/**
 * Thin progress bar across the top while any navigation is in flight.
 *
 * Deliberately not a blocking overlay: the previous screen stays readable and
 * clickable during a transition, and a full-screen spinner would make a
 * 150ms navigation feel slower than it is.
 */
export default function NavProgress() {
  const pending = useSyncExternalStore(subscribe, getPending, getServerPending);
  const active = pending > 0;

  return (
    <div
      aria-hidden={!active}
      className={`pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 transition-opacity duration-200 ${
        active ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="nav-progress-bar h-full bg-gradient-to-r from-primary via-secondary to-primary" />
      <span className="sr-only" role="status" aria-live="polite">
        {active ? "Memuatkan…" : ""}
      </span>
    </div>
  );
}
