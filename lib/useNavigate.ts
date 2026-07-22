"use client";

import { useCallback, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { navStart, navDone } from "@/lib/navprogress";

/**
 * Navigate within the app with visible feedback.
 *
 * Wraps router.push in a transition so React keeps the current screen
 * interactive while the next one streams in, and drives the global progress
 * bar for the duration. Returns `pending` so the control that was clicked can
 * show its own spinner — a global bar alone leaves the user unsure which
 * click registered.
 *
 * Also exposes prefetch(), so hovering a tab warms it before the click.
 */
export function useNavigate() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const counted = useRef(false);

  // Mirror the transition into the global counter. Tied to `pending` rather
  // than done inside the callback because the transition ends asynchronously,
  // after the new screen commits.
  useEffect(() => {
    if (pending && !counted.current) {
      counted.current = true;
      navStart();
    } else if (!pending && counted.current) {
      counted.current = false;
      navDone();
    }
  }, [pending]);

  // A navigation in flight when the component unmounts would otherwise leave
  // the counter stuck above zero and the bar showing forever.
  useEffect(() => () => {
    if (counted.current) {
      counted.current = false;
      navDone();
    }
  }, []);

  const navigate = useCallback(
    (href: string, opts?: { scroll?: boolean }) => {
      startTransition(() => {
        router.push(href, { scroll: opts?.scroll ?? false });
      });
    },
    [router]
  );

  const prefetch = useCallback(
    (href: string) => {
      try {
        router.prefetch(href);
      } catch {
        // Prefetch is an optimisation; never let it break a click.
      }
    },
    [router]
  );

  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  return { navigate, prefetch, refresh, pending };
}
