"use client";

import type { ReactNode } from "react";
import { Button } from "./button";
import { Modal } from "./modal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, children, confirmLabel, danger, loading, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={loading ? () => undefined : onCancel}
      width={440}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="text-body text-text-2">{children}</div>
    </Modal>
  );
}
