"use client";

import { useSyncExternalStore } from "react";

const KEY = "leadnest.leads-list-url";
const PLAIN = "/leads";

/** The Leads list as it was last left (tab, filters, page), kept for this browser tab so "Back to leads" returns to it. */
export function rememberListUrl(url: string): void {
  try {
    sessionStorage.setItem(KEY, url);
  } catch {
    // storage can be blocked; the back link then goes to the plain list
  }
}

function saved(): string {
  try {
    const url = sessionStorage.getItem(KEY);
    return url && url.startsWith(PLAIN) ? url : PLAIN;
  } catch {
    return PLAIN;
  }
}

const never = () => () => {};

/** Where "Back to leads" goes: the list as the person left it, or the plain list. The server renders the plain list, so nothing differs on hydration. */
export function useListHref(): string {
  return useSyncExternalStore(never, saved, () => PLAIN);
}
