"use client";

import { createContext, useContext } from "react";

/**
 * Whether a plain marketer may switch a brand tab to "All Team" (the aggregate
 * of everyone working the same brand), and whether that mode is currently on.
 * `teamAvailable` is false for leaders/directors/admin (they have their own
 * switcher) and for a marketer who shares no brand with anyone.
 */
export type MarketerScope = { teamAvailable: boolean; teamMode: boolean };

export const MarketerScopeContext = createContext<MarketerScope>({
  teamAvailable: false,
  teamMode: false,
});

export const useMarketerScope = () => useContext(MarketerScopeContext);
