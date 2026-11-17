"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/api/errors";
import { DueField, dueToIso } from "./follow-up-fields";
import { useEngagementActions } from "./hooks";

export function TaskModal({ leadId, leadName, open, onClose }: { leadId: string; leadName: string; open: boolean; onClose: () => void }) {
  return open ? <TaskForm leadId={leadId} leadName={leadName} onClose={onClose} /> : null;
}

function TaskForm({ leadId, leadName, onClose }: { leadId: string; leadName: string; onClose: () => void }) {
  const toast = useToast();
  const { createTask } = useEngagementActions(leadId);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [touched, setTouched] = useState(false);
  const titleError = touched && title.trim() === "" ? "Say what to do" : undefined;
  const dueError = touched && due === "" ? "Choose when" : undefined;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    const dueAt = dueToIso(due);
    if (title.trim() === "" || !dueAt) return;
    createTask.mutate({ title: title.trim(), dueAt }, { onSuccess: () => { toast.show("Follow-up added", "success"); onClose(); } });
  }

  return (
    <Modal
      open
      title={`New follow-up · ${leadName}`}
      onClose={createTask.isPending ? () => undefined : onClose}
      width={480}
      footer={
        <>
          <Button variant="secondary" icon="x" onClick={onClose} disabled={createTask.isPending}>Cancel</Button>
          <Button type="submit" form="task-form" variant="cta" icon="check" loading={createTask.isPending}>Add follow-up</Button>
        </>
      }
    >
      <form id="task-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-[18px]">
        {createTask.isError ? <Alert>{errorMessage(createTask.error)}</Alert> : null}
        <Field label="What to do" error={titleError}>{({ id, describedBy, invalid }) => (
          <TextInput id={id} value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} placeholder="For example: send the fee structure" invalid={invalid} aria-describedby={describedBy} autoFocus />
        )}</Field>
        <DueField value={due} onChange={setDue} error={dueError} />
      </form>
    </Modal>
  );
}
