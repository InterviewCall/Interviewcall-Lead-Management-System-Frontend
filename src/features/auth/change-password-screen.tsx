"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, PasswordInput } from "@/components/ui/field";
import { LogoMark } from "@/components/ui/logo";
import { errorMessage, toApiError } from "@/lib/api/errors";
import { useAuth } from "./auth-provider";
import { DEFAULT_HOME, RequireSession } from "./guards";
import { useChangePassword, useLogout } from "./hooks";

export function ChangePasswordScreen() {
  return (
    <RequireSession>
      <ChangePasswordForm />
    </RequireSession>
  );
}

function ChangePasswordForm() {
  const router = useRouter();
  const { user } = useAuth();
  const change = useChangePassword();
  const logout = useLogout();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState(false);

  const forced = user?.mustChangePassword ?? false;

  const currentError = touched && current === "" ? "Enter your current password" : undefined;
  const nextError =
    touched && next.length < 10
      ? "Use at least 10 characters"
      : touched && next === current
        ? "Choose a password different from the current one"
        : undefined;
  const confirmError = touched && confirm !== next ? "The two passwords do not match" : undefined;

  const apiError = change.error ? toApiError(change.error) : null;
  const fieldErrors = apiError?.fields ?? {};
  const formError =
    apiError && !apiError.fields
      ? apiError.code === "INVALID_CREDENTIALS"
        ? "Your current password is not right."
        : errorMessage(apiError)
      : null;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (current === "" || next.length < 10 || next === current || confirm !== next) return;
    change.mutate(
      { currentPassword: current, newPassword: next },
      { onSuccess: () => router.replace(DEFAULT_HOME) },
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <form onSubmit={onSubmit} noValidate className="flex w-full max-w-[440px] flex-col gap-5 rounded-2xl border border-border bg-surface p-8 shadow-card">
        <LogoMark height={44} />
        <div className="flex flex-col gap-1.5">
          <h1 className="text-h1 font-semibold text-text">Choose a new password</h1>
          <p className="text-body text-text-2">
            {forced
              ? "You signed in with a one-time password. Choose your own to continue. You will be signed out of other devices."
              : "Choose a new password. You will be signed out of your other devices."}
          </p>
        </div>

        {formError ? <Alert>{formError}</Alert> : null}

        <Field label={forced ? "One-time password" : "Current password"} error={currentError ?? fieldErrors.currentPassword}>
          {({ id, describedBy, invalid }) => (
            <PasswordInput id={id} icon="lock" autoComplete="current-password" value={current}
              onChange={(e) => setCurrent(e.target.value)} invalid={invalid} aria-describedby={describedBy} autoFocus />
          )}
        </Field>
        <Field label="New password" hint="At least 10 characters." error={nextError ?? fieldErrors.newPassword}>
          {({ id, describedBy, invalid }) => (
            <PasswordInput id={id} icon="key" autoComplete="new-password" value={next}
              onChange={(e) => setNext(e.target.value)} invalid={invalid} aria-describedby={describedBy} />
          )}
        </Field>
        <Field label="Confirm new password" error={confirmError}>
          {({ id, describedBy, invalid }) => (
            <PasswordInput id={id} icon="key" autoComplete="new-password" value={confirm}
              onChange={(e) => setConfirm(e.target.value)} invalid={invalid} aria-describedby={describedBy} />
          )}
        </Field>

        <Button type="submit" size="lg" loading={change.isPending}>Save and continue</Button>

        {forced ? (
          <button type="button" onClick={() => logout.mutate()} className="text-small font-medium text-text-2 hover:underline">
            Sign out instead
          </button>
        ) : (
          <Link href={DEFAULT_HOME} className="text-center text-small font-medium text-text-2 hover:underline">Cancel</Link>
        )}
      </form>
    </main>
  );
}
