"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelImport, configureImport, fetchHistory, fetchImport, fetchOptions, fetchRows, importKeys, runDryRun, startImport,
  uploadCsv, type ConfigureInput,
} from "./api";
import type { ImportStatus, RowStatus } from "./types";

export const ACTIVE: readonly ImportStatus[] = ["QUEUED", "RUNNING"];
export const isActive = (status: ImportStatus | undefined) => status !== undefined && ACTIVE.includes(status);

export function useImportOptions() {
  return useQuery({ queryKey: importKeys.options, queryFn: fetchOptions, staleTime: 5 * 60_000 });
}

export function useImportHistory(page: number) {
  return useQuery({
    queryKey: importKeys.history(page),
    queryFn: () => fetchHistory(page),
    placeholderData: keepPreviousData,
    // Keep the list fresh while something is running.
    refetchInterval: (query) => (query.state.data?.items.some((i) => isActive(i.status)) ? 3000 : false),
  });
}

/** Reads one import and, while it is queued or running, asks again every second. */
export function useImport(id: string | null) {
  return useQuery({
    queryKey: importKeys.one(id ?? "none"),
    queryFn: () => fetchImport(id!),
    enabled: id !== null,
    staleTime: 0,
    // A cancelled import may still be finishing the batch it was in the middle of, so keep reading for a few seconds.
    refetchInterval: (query) => {
      const data = query.state.data;
      if (isActive(data?.status)) return 1000;
      const justCancelled = data?.status === "CANCELLED" && data.finishedAt && Date.now() - new Date(data.finishedAt).getTime() < 8000;
      return justCancelled ? 1000 : false;
    },
  });
}

export function useImportRows(id: string | null, status: RowStatus | "ALL", page: number, enabled = true) {
  return useQuery({
    queryKey: importKeys.rows(id ?? "none", status, page),
    queryFn: () => fetchRows(id!, status, page),
    enabled: id !== null && enabled,
    placeholderData: keepPreviousData,
  });
}

export function useUpload() {
  return useMutation({ mutationFn: ({ file, onProgress }: { file: File; onProgress?: (f: number) => void }) => uploadCsv(file, onProgress) });
}

export function useConfigure(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ConfigureInput) => configureImport(id, input),
    onSuccess: (job) => {
      queryClient.setQueryData(importKeys.one(id), job);
      void queryClient.invalidateQueries({ queryKey: ["imports", "history"] });
    },
  });
}

export function useDryRun(id: string) {
  return useMutation({ mutationFn: () => runDryRun(id) });
}

export function useStart(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => startImport(id),
    onSuccess: (job) => {
      queryClient.setQueryData(importKeys.one(id), job);
      void queryClient.invalidateQueries({ queryKey: ["imports", "history"] });
    },
  });
}

export function useCancel(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cancelImport(id),
    onSuccess: (job) => {
      queryClient.setQueryData(importKeys.one(id), job);
      void queryClient.invalidateQueries({ queryKey: ["imports", "history"] });
    },
  });
}
