"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/icon";

export function Topbar() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `/leads?q=${encodeURIComponent(q)}` : "/leads");
  }

  return (
    <header className="sticky top-0 z-20 hidden h-16 items-center gap-4 border-b border-border bg-surface px-8 lg:flex">
      <form onSubmit={onSubmit} role="search" className="flex h-10 w-[420px] max-w-full items-center gap-2 rounded-lg border border-border bg-surface-alt px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <Icon name="search" size={16} className="text-muted" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search leads by name, email or phone"
          aria-label="Search leads"
          className="min-w-0 flex-1 bg-transparent text-body text-text outline-none placeholder:text-muted"
        />
        <kbd className="text-small font-medium text-muted">⌘K</kbd>
      </form>
      <div className="flex-1" />
      <button type="button" aria-label="Notifications" className="flex size-10 items-center justify-center rounded-lg border border-border text-text-2 hover:bg-surface-alt">
        <Icon name="bell" size={18} />
      </button>
      <Link href="/leads?new=1" className="flex h-9 items-center gap-2 rounded-lg bg-cta px-3.5 text-body font-medium text-white shadow-cta hover:brightness-110">
        <Icon name="plus" size={16} />
        New lead
      </Link>
    </header>
  );
}
