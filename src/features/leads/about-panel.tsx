"use client";

import { AnimatePresence, m } from "motion/react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { relativeTime } from "@/lib/format";
import { fast } from "@/lib/motion";
import { CopyButton } from "./copy-button";
import { formatPhone } from "./lead-display";
import { VslJourney } from "./vsl-journey";
import type { LeadDetail } from "./types";

const USER_TYPE = { WORKING_PROFESSIONAL: "Working professional", STUDENT: "Student", UNKNOWN: "Not known" } as const;
const stamp = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

function Section({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-border last:border-b-0">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-2 px-4 py-3 text-left">
        <Icon name="chev" size={14} className={cn("text-muted transition-transform", !open && "-rotate-90")} />
        <span className="text-small font-semibold tracking-wide text-text-2 uppercase">{title}</span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1, transition: fast }} exit={{ height: 0, opacity: 0, transition: { duration: 0.12 } }} className="overflow-hidden">
            <div className="flex flex-col px-4 pb-3">{children}</div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

/** A label above its value, in the flat property-list style: nothing in a box, nothing to open to read it. */
function Row({ label, children, copy, empty }: { label: string; children?: ReactNode; copy?: { value: string; label: string }; empty?: boolean }) {
  return (
    <div className="group/row flex items-start gap-2 rounded-md py-1.5">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-small text-muted">{label}</span>
        <span className={cn("min-w-0 text-body break-words", empty ? "text-muted" : "text-text")}>{children}</span>
      </div>
      {copy ? <CopyButton value={copy.value} label={copy.label} /> : null}
    </div>
  );
}

/** Everything known about the person: how to reach them, who owns them, what they told us. */
export function AboutPanel({ lead, vsl }: { lead: LeadDetail["lead"]; vsl: LeadDetail["vsl"] }) {
  const profile: Array<[string, string | null]> = [
    ["Current company", lead.company],
    ["CTC range", lead.ctc],
    ["Graduation year", lead.graduationYear],
    ["Current domain", lead.domain],
    ["Working professional or student", lead.userType === "UNKNOWN" ? null : USER_TYPE[lead.userType]],
    ...lead.customFields.map((f): [string, string | null] => [f.label, f.value]),
  ];
  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface shadow-card">
      <Section title="Contact">
        <Row label="Phone" empty={!lead.phone} copy={lead.phone ? { value: lead.phone, label: "phone number" } : undefined}>
          {lead.phone ? <a href={`tel:${lead.phone}`} className="text-primary hover:underline">{formatPhone(lead.phone)}</a> : "No phone"}
        </Row>
        <Row label="Email" empty={!lead.email} copy={lead.email ? { value: lead.email, label: "email" } : undefined}>
          {lead.email ? <a href={`mailto:${lead.email}`} className="text-primary hover:underline">{lead.email}</a> : "No email"}
        </Row>
      </Section>
      {vsl ? (
        <Section title="VSL journey">
          <VslJourney vsl={vsl} />
        </Section>
      ) : null}
      <Section title="Ownership">
        <Row label="Owner" empty={!lead.owner}>
          {lead.owner ? <span className="flex items-center gap-2"><Avatar name={lead.owner.name} size={22} />{lead.owner.name}</span> : "Unassigned"}
        </Row>
        <Row label="Source">{lead.source}</Row>
        <Row label="First seen">{stamp.format(new Date(lead.createdAt))}</Row>
        <Row label="Last activity" empty={!lead.lastActivityAt}>{lead.lastActivityAt ? relativeTime(lead.lastActivityAt) : "None yet"}</Row>
      </Section>
      <Section title="Profile">
        {profile.map(([label, value]) => (
          <Row key={label} label={label} empty={!value}>{value || "Not provided"}</Row>
        ))}
      </Section>
      <Section title={`Lists (${lead.lists.length})`}>
        {lead.lists.length === 0 ? (
          <p className="py-1 text-body text-text-2">Not on any list.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5 py-1">
            {lead.lists.map((l) => (
              <li key={l.id}>
                <Link href={`/leads?list=${l.id}`} className="inline-flex items-center gap-1.5 rounded-md bg-primary-soft px-2.5 py-1 text-small font-medium text-primary transition hover:brightness-95">
                  <Icon name="list" size={13} /> {l.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
