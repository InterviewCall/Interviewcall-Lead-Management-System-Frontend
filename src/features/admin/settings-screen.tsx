"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { errorMessage, toApiError } from "@/lib/api/errors";
import { adminKeys, fetchSettings, saveSettings, type SettingRow } from "./api";

/** The numbers the reports judge by. Saved changes apply to the next report opened. */
export function SettingsScreen() {
  const settings = useQuery({ queryKey: adminKeys.settings, queryFn: fetchSettings });
  return (
    <>
      <PageHeader title="Settings" subtitle="Targets the reports measure against." />
      <Card className="max-w-[640px] overflow-hidden">
        <CardHeader title="Reports" subtitle="Used by the first-response and stage-aging reports" />
        {settings.isError ? (
          <div className="p-5"><Alert>{errorMessage(settings.error)}</Alert></div>
        ) : settings.isPending ? (
          <div className="py-14"><Spinner className="mx-auto text-primary" /></div>
        ) : (
          <SettingsForm key={settings.data.map((r) => r.value).join("-")} rows={settings.data} />
        )}
      </Card>
    </>
  );
}

function SettingsForm({ rows }: { rows: SettingRow[] }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(rows.map((r) => [r.key, String(r.value)])));
  const [touched, setTouched] = useState(false);

  const invalid = (r: SettingRow) => {
    const n = Number(draft[r.key]);
    return !Number.isInteger(n) || n < r.min || n > r.max ? `Enter a whole number from ${r.min} to ${r.max.toLocaleString("en-IN")}` : undefined;
  };
  const changed = rows.filter((r) => Number(draft[r.key]) !== r.value);

  const save = useMutation({
    mutationFn: () => saveSettings(Object.fromEntries(changed.map((r) => [r.key, Number(draft[r.key])]))),
    onSuccess: (next) => {
      queryClient.setQueryData(adminKeys.settings, next);
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast.show("Settings saved", "success");
      setTouched(false);
    },
  });
  const server = save.isError ? toApiError(save.error).fields ?? {} : {};

  function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (rows.some(invalid) || changed.length === 0) return;
    save.mutate();
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5 p-5">
      {save.isError && Object.keys(server).length === 0 ? <Alert>{errorMessage(save.error)}</Alert> : null}
      {rows.map((r) => (
        <Field key={r.key} label={`${r.label} (${r.unit})`} hint={`${r.help} Default: ${r.default}.`} error={touched ? invalid(r) : server[r.key]}>
          {({ id, describedBy, invalid: bad }) => (
            <TextInput id={id} inputMode="numeric" value={draft[r.key] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [r.key]: e.target.value }))} invalid={bad} aria-describedby={describedBy} className="max-w-40" />
          )}
        </Field>
      ))}
      <div>
        <Button type="submit" variant="cta" icon="check" loading={save.isPending} disabled={changed.length === 0}>Save settings</Button>
      </div>
    </form>
  );
}
