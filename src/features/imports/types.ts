/** Shapes returned by the imports API (`/api/v1/imports`). */

export type ImportStatus = "UPLOADED" | "MAPPED" | "QUEUED" | "RUNNING" | "DONE" | "FAILED" | "CANCELLED";
export type RowStatus = "CREATED" | "MATCHED" | "SKIPPED" | "ERROR" | "PENDING";
export type DuplicateMode = "SKIP" | "FILL_EMPTY";

/** A lead field key from the server's list, or `custom` (make a new field) or `skip`. */
export type Target = string;

export interface ColumnMapping {
  index: number;
  target: Target;
  /** For `custom`: the new field's name. */
  label?: string;
}

export interface ImportCounts {
  total: number;
  processed: number;
  created: number;
  matched: number;
  skipped: number;
  errors: number;
}

export interface ImportJob {
  id: string;
  fileName: string;
  fileSize: number;
  status: ImportStatus;
  headers: string[];
  mapping: ColumnMapping[] | null;
  listName: string | null;
  listDescription: string | null;
  listId: string | null;
  owner: { id: string; name: string } | null;
  source: { id: number; name: string } | null;
  duplicateMode: DuplicateMode;
  note: string | null;
  counts: ImportCounts;
  failureReason: string | null;
  createdBy: { id: string; name: string };
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface UploadResult {
  import: ImportJob;
  preview: {
    delimiter: string;
    /** The first few rows of the file. */
    sample: string[][];
    suggestedMapping: ColumnMapping[];
  };
}

export interface ImportOptions {
  sources: Array<{ id: number; name: string; group: string }>;
  owners: Array<{ id: string; name: string; role: string }>;
  fields: Array<{ key: string; label: string; description: string }>;
  customFields: Array<{ key: string; label: string }>;
  limits: { maxRows: number; maxFileBytes: number; maxColumns: number };
  startingStage: { lifecycle: string; opportunity: string };
}

export interface ImportSettings {
  listName: string;
  listDescription: string;
  sourceId: number | null;
  /** Staff id, or null to leave the leads unassigned. */
  ownerId: string | null;
  duplicateMode: DuplicateMode;
  note: string;
}

export interface DryRunIssue {
  rowNo: number;
  line: number;
  kind: "ERROR" | "SKIPPED" | "MATCHED" | "WARNING";
  message: string;
  existingLead?: { id: string; name: string };
}

export interface DryRunResult {
  summary: { total: number; new: number; matched: number; skipped: number; errors: number; warnings: number };
  issues: DryRunIssue[];
  truncated: boolean;
  newFields: string[];
}

export interface ImportRow {
  rowNo: number;
  line: number;
  status: RowStatus;
  message: string | null;
  cells: string[];
}

export interface Page<T> {
  page: number;
  pageSize: number;
  total: number;
  items: T[];
}
