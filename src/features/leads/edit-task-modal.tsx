"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Select, TextInput } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { canDistribute } from "@/features/assignment/handover";
import { useAuth } from "@/features/auth/auth-provider";
import { errorMessage } from "@/lib/api/errors";
import { DueField, dueToIso, local } from "./follow-up-fields";
import { useAssignees, useEngagementActions } from "./hooks";
import type { LeadTask } from "./types";

/**
 * Change a follow-up: move it to another time, reword it, and (managers and admins) give it to someone else. The time
 * starts as the follow-up's own, so an overdue one asks for a new time before it can be saved.
 */
export function EditTaskModal({ leadId, task, onClose }: { leadId: string; task: LeadTask | null; onClose: () => void }) {
  return task ? <EditTaskForm leadId={leadId} task={task} onClose={onClose} /> : null;
}

function EditTaskForm({ leadId, task, onClose }: { leadId: string; task: LeadTask; onClose: () => void }) {
  const toast = useToast();
  const { user } = useAuth();
  const { update } = useEngagementActions(leadId);
  const mayReassign = canDistribute(user?.role);
  const assignees = useAssignees(mayReassign);
  const [title, setTitle] = useState(task.title);
  const [due, setDue] = useState(() => local(new Date(task.dueAt)));
  const [assigneeId, setAssigneeId] = useState("");
  const [touched, setTouched] = useState(false);
  const titleError = touched && title.trim() === "" ? "Say what to do" : undefined;
  const dueError = touched && !dueToIso(due) ? "Choose when" : undefined;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    const dueAt = dueToIso(due);
    if (title.trim() === "" || !dueAt) return;
    const changes = {
      taskId: task.id,
      ...(title.trim() !== task.title ? { title: title.trim() } : {}),
      ...(new Date(dueAt).getTime() !== new Date(task.dueAt).getTime() ? { dueAt } : {}),
      ...(assigneeId ? { assigneeId } : {}),
    };
    if (Object.keys(changes).length === 1) {
      onClose();
      return;
    }
    update.mutate(changes, { onSuccess: () => { toast.show("Follow-up updated", "success"); onClose(); } });
  }

  return (
    <Modal
      open
      title="Change follow-up"
      subtitle={task.assignee ? `With ${task.assignee}` : "Not assigned yet"}
      onClose={update.isPending ? () => undefined : onClose}
      width={480}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={update.isPending}>Cancel</Button>
          <Button type="submit" form="edit-task-form" variant="cta" icon="check" loading={update.isPending}>Save changes</Button>
        </>
      }
    >
      <form id="edit-task-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-[18px]">
        {update.isError ? <Alert>{errorMessage(update.error)}</Alert> : null}
        <Field label="What to do" error={titleError}>{({ id, describedBy, invalid }) => (
          <TextInput id={id} value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} invalid={invalid} aria-describedby={describedBy} autoFocus />
        )}</Field>
        <DueField value={due} onChange={setDue} error={dueError} label="Due" />
        {mayReassign ? (
          <Field label="Give to" hint="Leave as it is to keep it with the same person">{({ id, describedBy }) => (
            <Select id={id} value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} aria-describedby={describedBy}>
              <option value="">{task.assignee ?? "Not assigned yet"}</option>
              {assignees.data?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          )}</Field>
        ) : null}
      </form>
    </Modal>
  );
}
