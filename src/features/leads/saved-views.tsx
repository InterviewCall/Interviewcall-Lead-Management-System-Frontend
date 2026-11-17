"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { errorMessage, toApiError } from "@/lib/api/errors";
import { createSavedView, deleteSavedView, listSavedViews, savedViewKeys } from "./api";
import type { LeadQuery, SavedFilters, SavedView } from "./types";

export const useSavedViews = () => useQuery({ queryKey: savedViewKeys.all, queryFn: listSavedViews, staleTime: 60_000 });

/** The filters of the list as a saved view remembers them: only what is set. */
export function filtersOf(q: Pick<LeadQuery, "view" | "search" | "sourceId" | "temperature" | "stage" | "lifecycle" | "ownerId" | "listId" | "from" | "to">): SavedFilters {
  const f: SavedFilters = { view: q.view };
  if (q.search.trim()) f.search = q.search.trim();
  if (q.sourceId !== null) f.sourceId = q.sourceId;
  if (q.temperature) f.temperature = q.temperature;
  if (q.stage) f.stage = q.stage;
  if (q.lifecycle) f.lifecycle = q.lifecycle;
  if (q.ownerId) f.ownerId = q.ownerId;
  if (q.listId) f.listId = q.listId;
  if (q.from) f.from = q.from;
  if (q.to) f.to = q.to;
  return f;
}

/** Whether two sets of filters are the same, ignoring a missing "all leads" view. */
export function sameFilters(a: SavedFilters, b: SavedFilters): boolean {
  const norm = (f: SavedFilters) => JSON.stringify(Object.entries({ ...f, view: f.view ?? "all" }).sort(([x], [y]) => x.localeCompare(y)));
  return norm(a) === norm(b);
}

export function SaveViewModal({ filters, canShare, open, onClose, onSaved }: { filters: SavedFilters; canShare: boolean; open: boolean; onClose: () => void; onSaved: () => void }) {
  return open ? <SaveViewForm filters={filters} canShare={canShare} onClose={onClose} onSaved={onSaved} /> : null;
}

function SaveViewForm({ filters, canShare, onClose, onSaved }: { filters: SavedFilters; canShare: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [shared, setShared] = useState(false);
  const [touched, setTouched] = useState(false);
  const save = useMutation({
    mutationFn: () => createSavedView({ name: name.trim(), filters, shared }),
    onSuccess: (view) => {
      toast.show(`${view.name} saved`, "success");
      void queryClient.invalidateQueries({ queryKey: savedViewKeys.all });
      onSaved();
      onClose();
    },
  });
  const fieldError = touched && name.trim().length < 2 ? "Enter a name" : save.isError ? toApiError(save.error).fields?.name : undefined;
  const count = Object.keys(filters).filter((k) => k !== "view").length + (filters.view && filters.view !== "all" ? 1 : 0);

  function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (name.trim().length < 2) return;
    save.mutate();
  }

  return (
    <Modal
      open
      title="Save this view"
      subtitle={count > 0 ? "It remembers the tab, search and filters you have set now." : "No filters are set, so this saves the full list."}
      onClose={save.isPending ? () => undefined : onClose}
      width={440}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button type="submit" form="save-view-form" variant="cta" icon="check" loading={save.isPending}>Save view</Button>
        </>
      }
    >
      <form id="save-view-form" onSubmit={submit} noValidate className="flex flex-col gap-[18px]">
        {save.isError && !toApiError(save.error).fields ? <Alert>{errorMessage(save.error)}</Alert> : null}
        <Field label="Name" error={fieldError}>{({ id, describedBy, invalid }) => (
          <TextInput id={id} value={name} maxLength={40} placeholder="For example: Hot, not called yet" onChange={(e) => setName(e.target.value)} invalid={invalid} aria-describedby={describedBy} autoFocus />
        )}</Field>
        {canShare ? (
          <label className="flex items-start gap-2.5 text-body text-text">
            <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} className="mt-1 size-4 accent-[var(--color-primary)]" />
            <span>Share with the whole team<span className="block text-small text-text-2">Everyone sees it as a tab. Only you and admins can delete it.</span></span>
          </label>
        ) : null}
      </form>
    </Modal>
  );
}

/** Removes a saved view, with the same quiet toast as saving. */
export function useDeleteView() {
  const toast = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (view: SavedView) => deleteSavedView(view.id),
    onSuccess: (_d, view) => {
      toast.show(`${view.name} deleted`);
      void queryClient.invalidateQueries({ queryKey: savedViewKeys.all });
    },
    onError: (e) => toast.show(errorMessage(e), "error"),
  });
}
