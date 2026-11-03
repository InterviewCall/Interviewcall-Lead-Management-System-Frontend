"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { KpiCard } from "@/components/ui/kpi-card";
import { RowMenu, type MenuItem } from "@/components/ui/menu";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented, type SegmentOption } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-provider";
import { errorMessage } from "@/lib/api/errors";
import { relativeTime } from "@/lib/format";
import { ROLE_LABEL, ROLE_TONE, type Role, type Tone } from "@/lib/roles";
import {
  useDeactivateStaff, useReactivateStaff, useResetStaffPassword, useStaffCounts, useStaffList,
} from "./hooks";
import { EditStaffModal, InviteModal } from "./staff-forms";
import type { StaffMember, StaffStatus } from "./types";

const PAGE_SIZE = 10;

const STATUS_BADGE: Record<StaffStatus, { label: string; tone: Tone }> = {
  ACTIVE: { label: "Active", tone: "success" },
  PENDING: { label: "Invited", tone: "warning" },
  DEACTIVATED: { label: "Deactivated", tone: "neutral" },
};

type RoleFilter = "ALL" | Role;
type StatusFilter = "ALL" | StaffStatus;

const PERMISSIONS: Array<{ role: Role; label: string; items: string[] }> = [
  { role: "BDA", label: "BDA", items: ["See only their own leads", "Log calls, notes and next steps", "Move leads through lifecycle stages"] },
  { role: "CLOSER", label: "Closer", items: ["See leads with an open opportunity", "Move opportunities between stages", "Record payment and enrolment"] },
  { role: "SALES_MANAGER", label: "Sales Manager", items: ["See every lead and every BDA", "Reassign leads and run imports", "Open all reports"] },
  { role: "ADMIN", label: "Ops and Admin", items: ["Everything a manager can do", "Manage users and source keys", "Open the Intake monitor"] },
];

type PendingAction = { kind: "deactivate" | "reactivate" | "reset"; member: StaffMember } | null;

export function TeamScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const list = useStaffList({
    search: search || undefined,
    role: roleFilter === "ALL" ? undefined : roleFilter,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    page,
    pageSize: PAGE_SIZE,
  });
  const counts = useStaffCounts();
  const deactivate = useDeactivateStaff();
  const reactivate = useReactivateStaff();
  const reset = useResetStaffPassword();

  const c = counts.data;
  const segments: SegmentOption<RoleFilter>[] = [
    { value: "ALL", label: "All", count: c?.total },
    { value: "BDA", label: "BDA", count: c?.byRole.BDA },
    { value: "CLOSER", label: "Closer", count: c?.byRole.CLOSER },
    { value: "SALES_MANAGER", label: "Manager", count: c?.byRole.SALES_MANAGER },
    { value: "OPS", label: "Ops", count: c?.byRole.OPS },
    { value: "ADMIN", label: "Admin", count: c?.byRole.ADMIN },
  ];

  const total = list.data?.total ?? 0;
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function menuFor(member: StaffMember): MenuItem[] {
    const isSelf = member.id === user?.id;
    if (member.status === "DEACTIVATED") {
      return [{ label: "Reactivate", icon: "userCheck", onSelect: () => setPending({ kind: "reactivate", member }) }];
    }
    return [
      { label: "Edit details", icon: "edit", onSelect: () => setEditing(member) },
      { label: "Reset password", icon: "key", onSelect: () => setPending({ kind: "reset", member }) },
      ...(isSelf ? [] : [{ label: "Deactivate", icon: "userX" as const, danger: true, onSelect: () => setPending({ kind: "deactivate", member }) }]),
    ];
  }

  function confirm() {
    if (!pending) return;
    const { kind, member } = pending;
    const done = (message: string) => () => {
      toast.show(message);
      setPending(null);
    };
    const failed = (error: unknown) => {
      toast.show(errorMessage(error), "error");
      setPending(null);
    };
    if (kind === "deactivate") {
      deactivate.mutate(member.id, { onSuccess: done(`${member.name} is deactivated and signed out everywhere.`), onError: failed });
    } else if (kind === "reactivate") {
      reactivate.mutate(member.id, { onSuccess: done(`${member.name} is active again. A new one-time password was emailed.`), onError: failed });
    } else {
      reset.mutate(member.id, { onSuccess: done(`A new one-time password was emailed to ${member.email}.`), onError: failed });
    }
  }

  const busy = deactivate.isPending || reactivate.isPending || reset.isPending;

  return (
    <>
      <PageHeader
        title="Team and roles"
        subtitle="Who can sign in, what they can see, and how many leads each BDA is carrying."
        actions={<Button variant="cta" icon="plus" onClick={() => setInviteOpen(true)}>Invite user</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Active users" value={c?.active ?? 0} icon="users" tone="primary" hint={c && c.pending > 0 ? `${c.pending} invited` : undefined} loading={counts.isPending} />
        <KpiCard label="BDAs" value={c?.byRole.BDA ?? 0} icon="phone" tone="info" loading={counts.isPending} />
        <KpiCard label="Closers" value={c?.byRole.CLOSER ?? 0} icon="check" tone="violet" loading={counts.isPending} />
        <KpiCard label="Managers and admins" value={(c?.byRole.SALES_MANAGER ?? 0) + (c?.byRole.ADMIN ?? 0)} icon="shield" tone="success" loading={counts.isPending} />
      </div>

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        <Card className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3.5">
            <div className="flex min-w-0 flex-1 basis-48 flex-col gap-0.5">
              <h2 className="text-body font-semibold text-text">Users</h2>
              <p className="text-small text-text-2">Roles decide which leads and screens a person can open</p>
            </div>
            <div className="max-w-full overflow-x-auto">
              <Segmented
                ariaLabel="Filter by role"
                options={segments}
                value={roleFilter}
                onChange={(v) => {
                  setRoleFilter(v);
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-b border-border bg-surface-alt px-5 py-3">
            <label className="flex h-9 min-w-48 flex-1 items-center gap-2 rounded-lg border border-border-strong bg-surface px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <Icon name="search" size={16} className="text-muted" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name or email"
                aria-label="Search users"
                className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-muted"
              />
            </label>
            <Select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setPage(1);
              }}
              className="h-9 w-44"
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Invited</option>
              <option value="DEACTIVATED">Deactivated</option>
            </Select>
          </div>

          {list.isError ? (
            <div className="flex flex-col items-start gap-3 p-5">
              <Alert className="w-full">{errorMessage(list.error)}</Alert>
              <Button variant="secondary" icon="refresh" onClick={() => void list.refetch()}>Try again</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="h-10 border-b border-border bg-surface-alt">
                    {["User", "Role", "Status", "Last seen", ""].map((h) => (
                      <th key={h || "actions"} className="px-4 text-cap font-semibold tracking-[0.5px] text-text-2 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.isPending ? (
                    <tr><td colSpan={5} className="py-14 text-center text-text-2"><Spinner className="mx-auto text-primary" /></td></tr>
                  ) : list.data && list.data.staff.length === 0 ? (
                    <tr><td colSpan={5} className="py-14 text-center text-body text-text-2">No one matches these filters.</td></tr>
                  ) : (
                    list.data?.staff.map((member) => {
                      const status = STATUS_BADGE[member.status];
                      const isSelf = member.id === user?.id;
                      return (
                        <tr key={member.id} className="h-[60px] border-b border-border last:border-b-0">
                          <td className="px-4">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={member.name} />
                              <div className="flex min-w-0 flex-col gap-px">
                                <span className="truncate text-body font-medium text-text">{member.name}{isSelf ? <span className="ml-1.5 text-small font-normal text-text-2">(you)</span> : null}</span>
                                <span className="truncate text-small text-text-2">{member.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4"><Badge tone={ROLE_TONE[member.role]}>{ROLE_LABEL[member.role]}</Badge></td>
                          <td className="px-4"><Badge tone={status.tone}>{status.label}</Badge></td>
                          <td className="px-4 text-small whitespace-nowrap text-text-2">{isSelf ? "Now" : relativeTime(member.lastLoginAt)}</td>
                          <td className="px-3 text-right"><RowMenu label={`Actions for ${member.name}`} items={menuFor(member)} /></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
            <p className="text-small text-text-2">{total === 0 ? "No users" : `Showing ${from}–${to} of ${total}`}</p>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page <= 1 || list.isFetching} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="secondary" disabled={page >= lastPage || list.isFetching} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </Card>

        <Card className="w-full xl:w-[380px] xl:shrink-0">
          <CardHeader title="What each role can do" subtitle="Fixed in V1 · custom roles come later" />
          <div className="flex flex-col gap-3.5 p-5">
            {PERMISSIONS.map((p) => (
              <div key={p.role} className="flex flex-col gap-2">
                <div><Badge tone={ROLE_TONE[p.role]}>{p.label}</Badge></div>
                {p.items.map((item) => (
                  <div key={item} className="flex items-start gap-2 text-small text-text-2">
                    <Icon name="check" size={14} className="mt-0.5 text-ok" />
                    {item}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <EditStaffModal member={editing} isSelf={editing?.id === user?.id} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={pending?.kind === "deactivate"}
        title={`Deactivate ${pending?.member.name ?? ""}?`}
        confirmLabel="Deactivate"
        danger
        loading={busy}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      >
        They are signed out everywhere and cannot sign in until you reactivate them. Their history stays.
      </ConfirmDialog>
      <ConfirmDialog
        open={pending?.kind === "reactivate"}
        title={`Reactivate ${pending?.member.name ?? ""}?`}
        confirmLabel="Reactivate"
        loading={busy}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      >
        They get a new one-time password by email and choose their own when they sign in.
      </ConfirmDialog>
      <ConfirmDialog
        open={pending?.kind === "reset"}
        title={`Reset password for ${pending?.member.name ?? ""}?`}
        confirmLabel="Reset password"
        loading={busy}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      >
        Their current password stops working and they are signed out everywhere. A new one-time password is emailed to {pending?.member.email}.
      </ConfirmDialog>
    </>
  );
}
