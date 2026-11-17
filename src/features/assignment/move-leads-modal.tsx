"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { getLoads, type DistributeResult } from "./api";

async function ownedCount(userId: string): Promise<number> {
  const { data } = await api.get<{ count: number }>("/assignment/owned", { params: { userId } });
  return data.count;
}

async function moveFrom(input: { fromUserId: string; toUserIds: string[] }): Promise<DistributeResult> {
  const { data } = await api.post<DistributeResult>("/assignment/move-from", input);
  return data;
}

/**
 * Hands everything a person owns (every lead not yet enrolled, with its opportunity, follow-ups and booked
 * calls) to the chosen BDAs, shared one after another. For someone leaving the team or away for long.
 */
export function MoveLeadsModal({ person, onClose }: { person: { id: string; name: string } | null; onClose: () => void }) {
  return person ? <MoveLeadsForm person={person} onClose={onClose} /> : null;
}

function MoveLeadsForm({ person, onClose }: { person: { id: string; name: string }; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const count = useQuery({ queryKey: ["assignment", "owned", person.id], queryFn: () => ownedCount(person.id) });
  const loads = useQuery({ queryKey: ["assignment", "loads"], queryFn: getLoads });
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const move = useMutation({
    mutationFn: moveFrom,
    onSuccess: () => {
      for (const key of ["assignment", "leads", "pipeline", "my-day", "staff"]) void queryClient.invalidateQueries({ queryKey: [key] });
    },
  });

  const bdas = (loads.data?.bdas ?? []).filter((b) => b.id !== person.id);
  const chosen = bdas.filter((b) => !b.leaveUntil && !excluded.has(b.id)).map((b) => b.id);
  const n = count.data ?? 0;

  function submit() {
    move.mutate(
      { fromUserId: person.id, toUserIds: chosen },
      {
        onSuccess: (r) => {
          toast.show(`${formatNumber(r.assigned)} ${r.assigned === 1 ? "lead" : "leads"} moved from ${person.name}`, "success");
          onClose();
        },
      },
    );
  }

  return (
    <Modal
      open
      title={`Move ${person.name}'s leads`}
      subtitle="Every lead not yet enrolled, with its open opportunity, follow-ups and booked calls, shared one after another"
      onClose={move.isPending ? () => undefined : onClose}
      width={480}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={move.isPending}>{n === 0 ? "Close" : "Not now"}</Button>
          {n > 0 ? (
            <Button variant="cta" icon="swap" onClick={submit} disabled={chosen.length === 0} loading={move.isPending}>
              Move {formatNumber(n)} {n === 1 ? "lead" : "leads"}
            </Button>
          ) : null}
        </>
      }
    >
      {count.isPending || loads.isPending ? (
        <div className="py-8"><Spinner className="mx-auto text-primary" /></div>
      ) : count.isError || loads.isError ? (
        <Alert>{errorMessage(count.error ?? loads.error)}</Alert>
      ) : n === 0 ? (
        <p className="text-body text-text-2">{person.name} holds no leads that are still in play. Nothing needs to move.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {move.isError ? <Alert>{errorMessage(move.error)}</Alert> : null}
          <p className="text-body text-text">
            {formatNumber(n)} {n === 1 ? "lead goes" : "leads go"} to the BDAs ticked below, best leads first. Each new owner is told.
          </p>
          <div className="flex flex-col gap-1">
            {bdas.length === 0 ? <p className="text-body text-text-2">There are no other active BDAs.</p> : null}
            {bdas.map((b) => {
              const away = Boolean(b.leaveUntil);
              const on = !away && !excluded.has(b.id);
              const share = on && chosen.length > 0 ? Math.floor(n / chosen.length) + (chosen.indexOf(b.id) < n % chosen.length ? 1 : 0) : 0;
              return (
                <label key={b.id} className={cn("flex items-center gap-3 rounded-lg px-2 py-2", away ? "opacity-70" : "cursor-pointer hover:bg-surface-alt")}>
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={away}
                    onChange={() => setExcluded((s) => { const next = new Set(s); if (next.has(b.id)) next.delete(b.id); else next.add(b.id); return next; })}
                    className="size-[18px] accent-primary"
                  />
                  <Avatar name={b.name} size={30} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body font-medium text-text">{b.name}</span>
                    <span className={cn("text-small", away ? "text-warn" : "text-text-2")}>{away ? "On leave" : `${formatNumber(b.open)} open leads`}</span>
                  </span>
                  {on ? <span className="text-body font-semibold text-primary">+{formatNumber(share)}</span> : null}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}
