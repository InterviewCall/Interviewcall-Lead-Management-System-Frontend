"use client";

import { useSyncExternalStore } from "react";

/** One person to call, in the order My Day put them. */
export interface QueueEntry {
  leadId: string;
  name: string;
  note: string;
}

const KEY = "crm.call-queue";
const listeners = new Set<() => void>();
let memory: QueueEntry[] | null = null;

function read(): QueueEntry[] {
  if (memory !== null) return memory;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    memory = raw ? (JSON.parse(raw) as QueueEntry[]) : [];
  } catch {
    memory = [];
  }
  return memory;
}

function write(entries: QueueEntry[]) {
  memory = entries;
  try {
    if (entries.length === 0) window.sessionStorage.removeItem(KEY);
    else window.sessionStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    // Blocked storage: the queue still works until the tab is reloaded.
  }
  listeners.forEach((l) => l());
}

const EMPTY: QueueEntry[] = [];
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** The calling queue for this browser tab: started from My Day, walked through on the lead pages. */
export function useCallQueue() {
  const entries = useSyncExternalStore(subscribe, read, () => EMPTY);
  return { entries, start: write, stop: () => write([]) };
}
