"use client";

/**
 * A tiny global "something is loading" counter.
 *
 * The App Router has no router events, so navigations started with
 * router.push give no built-in signal. Every in-app navigation goes through
 * useNavigate(), which increments this while React is transitioning and
 * decrements when the new screen is painted. A counter rather than a boolean
 * so overlapping navigations don't switch the bar off early.
 */

let pending = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function navStart() {
  pending += 1;
  emit();
}

export function navDone() {
  pending = Math.max(0, pending - 1);
  emit();
}

export function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getPending() {
  return pending;
}

/** Server render always reports idle — there is no navigation in flight. */
export function getServerPending() {
  return 0;
}
