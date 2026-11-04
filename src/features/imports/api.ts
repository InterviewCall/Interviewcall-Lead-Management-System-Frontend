import { api } from "@/lib/api/client";
import type {
  ColumnMapping, DryRunResult, DuplicateMode, ImportJob, ImportOptions, ImportRow, ImportSettings, Page, RowStatus,
  UploadResult,
} from "./types";

export const importKeys = {
  all: ["imports"] as const,
  options: ["imports", "options"] as const,
  history: (page: number) => ["imports", "history", page] as const,
  one: (id: string) => ["imports", "one", id] as const,
  rows: (id: string, status: RowStatus | "ALL", page: number) => ["imports", "rows", id, status, page] as const,
};

export async function fetchOptions(): Promise<ImportOptions> {
  const { data } = await api.get<ImportOptions>("/imports/options");
  return data;
}

export async function fetchHistory(page: number, pageSize = 8): Promise<Page<ImportJob>> {
  const { data } = await api.get<{ imports: ImportJob[]; page: number; pageSize: number; total: number }>("/imports", {
    params: { page, pageSize },
  });
  return { page: data.page, pageSize: data.pageSize, total: data.total, items: data.imports };
}

export async function fetchImport(id: string): Promise<ImportJob> {
  const { data } = await api.get<{ import: ImportJob }>(`/imports/${id}`);
  return data.import;
}

/** Step 1. Sends the file as multipart form data; `onProgress` gets 0 to 1 while it uploads. */
export async function uploadCsv(file: File, onProgress?: (fraction: number) => void): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<UploadResult>("/imports", form, {
    timeout: 120_000,
    onUploadProgress: (event) => {
      if (onProgress && event.total) onProgress(Math.min(1, event.loaded / event.total));
    },
  });
  return data;
}

export interface ConfigureInput {
  mapping: ColumnMapping[];
  settings: ImportSettings & { sourceId: number };
}

/** Step 2. Saves the mapping and the list, source, owner and duplicate rule. */
export async function configureImport(id: string, input: ConfigureInput): Promise<ImportJob> {
  const { settings } = input;
  const { data } = await api.put<{ import: ImportJob }>(`/imports/${id}/configuration`, {
    mapping: input.mapping.map((m) => (m.target === "custom" ? { index: m.index, target: m.target, label: m.label ?? "" } : { index: m.index, target: m.target })),
    listName: settings.listName.trim(),
    listDescription: settings.listDescription.trim() || null,
    ownerId: settings.ownerId,
    sourceId: settings.sourceId,
    duplicateMode: settings.duplicateMode satisfies DuplicateMode,
    note: settings.note.trim() || null,
  });
  return data.import;
}

/** Step 3. Checks every row without saving anything. */
export async function runDryRun(id: string): Promise<DryRunResult> {
  const { data } = await api.post<DryRunResult>(`/imports/${id}/dry-run`, undefined, { timeout: 120_000 });
  return data;
}

/** Step 4. Queues the import; progress is read with `fetchImport`. */
export async function startImport(id: string): Promise<ImportJob> {
  const { data } = await api.post<{ import: ImportJob }>(`/imports/${id}/start`);
  return data.import;
}

export async function cancelImport(id: string): Promise<ImportJob> {
  const { data } = await api.post<{ import: ImportJob }>(`/imports/${id}/cancel`);
  return data.import;
}

export async function fetchRows(id: string, status: RowStatus | "ALL", page: number, pageSize = 20): Promise<Page<ImportRow>> {
  const params: Record<string, string | number> = { page, pageSize };
  if (status !== "ALL") params.status = status;
  const { data } = await api.get<{ rows: ImportRow[]; page: number; pageSize: number; total: number }>(`/imports/${id}/rows`, { params });
  return { page: data.page, pageSize: data.pageSize, total: data.total, items: data.rows };
}

/** The original file plus a status and a message for every row, as CSV text. */
export async function fetchReport(id: string): Promise<string> {
  const { data } = await api.get<string>(`/imports/${id}/report`, { responseType: "text", transformResponse: (body: string) => body });
  return data;
}
