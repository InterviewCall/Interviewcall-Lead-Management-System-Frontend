"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AnimatePresence, m } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Icon, type IconName } from "@/components/ui/icon";
import { useAuth } from "@/features/auth/auth-provider";
import { listLeads } from "@/features/leads/api";
import { formatPhone, HeatBars, STAGE } from "@/features/leads/lead-display";
import type { Lead } from "@/features/leads/types";
import { cn } from "@/lib/cn";
import { ADD_LEAD_ROLES, visibleGroups } from "./nav";

/** Anything can open the palette by firing this event (the search box, the phone header's search icon). */
export const OPEN_PALETTE = "crm:open-palette";
export const openPalette = () => window.dispatchEvent(new Event(OPEN_PALETTE));

interface Item {
  key: string;
  group: "Leads" | "Go to" | "Actions";
  label: string;
  hint?: string;
  icon?: IconName;
  lead?: Lead;
  run: () => void;
}

/**
 * Press ⌘K (Ctrl K) anywhere: find a lead by name, phone or email as you type, jump to any screen, or start an
 * action, without touching the mouse. Built for the moment a lead calls back and you need their page now.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_PALETTE, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_PALETTE, onOpen);
    };
  }, []);
  return <AnimatePresence>{open ? <Palette key="palette" onClose={() => setOpen(false)} /> : null}</AnimatePresence>;
}

function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(input.trim()), 160);
    return () => clearTimeout(timer);
  }, [input]);

  const leads = useQuery({
    queryKey: ["leads", "palette", search],
    queryFn: () => listLeads({ view: "all", search, sourceId: null, temperature: "", stage: "", lifecycle: "", ownerId: "", listId: "", page: 1, pageSize: 6 }),
    enabled: search.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

  const go = useCallback((href: string) => {
    onClose();
    router.push(href);
  }, [onClose, router]);

  const items = useMemo<Item[]>(() => {
    const q = input.trim().toLowerCase();
    const out: Item[] = [];
    if (search.length >= 2) {
      for (const lead of leads.data?.leads ?? []) {
        out.push({ key: `lead-${lead.id}`, group: "Leads", label: lead.name, lead, run: () => go(`/leads/${lead.id}`) });
      }
      out.push({ key: "all-results", group: "Leads", label: `See every lead matching “${search}”`, icon: "search", run: () => go(`/leads?q=${encodeURIComponent(search)}`) });
    }
    if (user) {
      for (const item of visibleGroups(user.role).flatMap((g) => g.items)) {
        if (!q || item.label.toLowerCase().includes(q)) out.push({ key: `nav-${item.href}`, group: "Go to", label: item.label, icon: item.icon, run: () => go(item.href) });
      }
      const actions: Array<{ label: string; icon: IconName; href: string; show: boolean }> = [
        { label: "Add a new lead", icon: "plus", href: "/leads?new=1", show: ADD_LEAD_ROLES.includes(user.role) },
        { label: "Change my password", icon: "key", href: "/change-password", show: true },
      ];
      for (const a of actions) {
        if (a.show && (!q || a.label.toLowerCase().includes(q))) out.push({ key: `act-${a.href}`, group: "Actions", label: a.label, icon: a.icon, run: () => go(a.href) });
      }
    }
    return out;
  }, [input, search, leads.data, user, go]);

  // Keep the highlight on a real row as the list changes, and in view as it moves.
  const current = Math.min(active, Math.max(0, items.length - 1));
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${current}"]`)?.scrollIntoView({ block: "nearest" });
  }, [current]);

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current + 1) % Math.max(1, items.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current - 1 + items.length) % Math.max(1, items.length));
    } else if (event.key === "Enter") {
      event.preventDefault();
      items[current]?.run();
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  }

  let index = -1;
  const groups = (["Leads", "Go to", "Actions"] as const).map((g) => ({ name: g, rows: items.filter((i) => i.group === g) })).filter((g) => g.rows.length > 0);
  const searching = search.length >= 2 && leads.isFetching;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-3 pt-[12vh]" role="presentation">
      <m.div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} />
      <m.div
        role="dialog"
        aria-modal="true"
        aria-label="Search and jump"
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.1 } }}
        transition={{ type: "spring", stiffness: 520, damping: 38 }}
        className="relative flex max-h-[70vh] w-full max-w-[620px] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-pop"
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Icon name="search" size={18} className={cn("shrink-0", searching ? "animate-pulse text-primary" : "text-muted")} />
          <input
            autoFocus
            value={input}
            onChange={(e) => { setInput(e.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            placeholder="Find a lead by name, phone or email, or type a screen"
            aria-label="Search leads and screens"
            aria-controls="palette-list"
            aria-activedescendant={items[current] ? `palette-${items[current].key}` : undefined}
            className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-text outline-none placeholder:text-muted"
          />
          <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 text-[11px] font-medium text-muted sm:block">Esc</kbd>
        </div>

        <div ref={listRef} id="palette-list" role="listbox" className="thin-scroll min-h-0 flex-1 overflow-y-auto p-2">
          {search.length >= 2 && !leads.isFetching && (leads.data?.leads.length ?? 0) === 0 ? (
            <p className="px-3 pt-3 pb-1 text-small text-text-2">No lead matches “{search}”. Check the spelling, or search by the last digits of the phone.</p>
          ) : null}
          {search.length < 2 && input.length === 0 ? (
            <p className="px-3 pt-2 pb-1 text-small text-text-2">Type at least two letters or digits to search leads.</p>
          ) : null}
          {groups.map((g) => (
            <div key={g.name} className="pt-1.5">
              <p className="px-3 pt-1 pb-1.5 text-small font-medium text-muted">{g.name}</p>
              {g.rows.map((item) => {
                index += 1;
                const i = index;
                const selected = i === current;
                return (
                  <button
                    key={item.key}
                    id={`palette-${item.key}`}
                    data-index={i}
                    role="option"
                    aria-selected={selected}
                    type="button"
                    onMouseMove={() => setActive(i)}
                    onClick={item.run}
                    className={cn("relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left", selected ? "text-text" : "text-text-2")}
                  >
                    {selected ? <m.span layoutId="palette-active" transition={{ type: "spring", stiffness: 600, damping: 44 }} className="absolute inset-0 rounded-xl bg-primary-soft" /> : null}
                    {item.lead ? (
                      <>
                        <span className="relative"><Avatar name={item.lead.name} size={32} /></span>
                        <span className="relative flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-body font-semibold text-text">{item.lead.name}</span>
                          <span className="truncate text-small text-text-2">
                            {[item.lead.phone ? formatPhone(item.lead.phone) : null, item.lead.email].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <span className="relative hidden flex-col items-end gap-1 sm:flex">
                          <span className="flex items-center gap-1.5 text-small font-medium text-text">
                            <HeatBars code={item.lead.temperature} />
                            {item.lead.stage ? STAGE[item.lead.stage].label : "No open deal"}
                          </span>
                          <span className="text-[11px] leading-3 text-muted">{item.lead.owner?.name ?? "Unassigned"}</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <span className={cn("relative flex size-8 items-center justify-center rounded-lg", selected ? "bg-white text-primary" : "bg-bg text-text-2")}>
                          <Icon name={item.icon ?? "right"} size={16} />
                        </span>
                        <span className="relative flex-1 truncate text-body font-medium">{item.label}</span>
                      </>
                    )}
                    {selected ? <Icon name="right" size={14} className="relative shrink-0 text-primary" /> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 border-t border-border bg-surface-alt px-4 py-2 text-[11px] text-muted">
          <span><kbd className="font-sans font-semibold text-text-2">↑ ↓</kbd> move</span>
          <span><kbd className="font-sans font-semibold text-text-2">Enter</kbd> open</span>
          <span className="hidden sm:inline"><kbd className="font-sans font-semibold text-text-2">⌘K</kbd> open or close from anywhere</span>
        </div>
      </m.div>
    </div>
  );
}
