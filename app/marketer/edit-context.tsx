"use client";

import { createContext, useContext } from "react";

/**
 * Whether the current dashboard view may be edited.
 *
 * True for a marketer, and for a leader on their own "Saya" workspace. False
 * whenever an overseer is *monitoring* someone else — a leader viewing their
 * team or one teammate, or a director viewing anything. Write controls (Add,
 * Import, Edit, Delete, entry forms) read this and hide themselves, so a
 * monitoring view is genuinely look-but-don't-touch.
 *
 * Defaults to true so any control rendered outside the provider (e.g. the
 * admin screens) keeps working unchanged.
 */
export const EditContext = createContext<boolean>(true);

export const useCanEdit = () => useContext(EditContext);
