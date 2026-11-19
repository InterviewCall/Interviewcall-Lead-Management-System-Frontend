"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { LogoMark } from "@/components/ui/logo";
import { errorMessage, toApiError } from "@/lib/api/errors";
import { useAuth } from "./auth-provider";
import { DEFAULT_HOME, RequireSession, Splash } from "./guards";
import { useLogout, useUpdateOwnPhone } from "./hooks";
import { PHONE_HINT, formatPhone, phoneProblem } from "./phone";

export function PhoneScreen() {
  return (
    <RequireSession>
      <PhoneGate />
    </RequireSession>
  );
}

/** A one-time password has to be replaced first: until then the API refuses everything else. */
function PhoneGate() {
  const { user } = useAuth();
  const router = useRouter();
  const mustChange = user?.mustChangePassword ?? false;

  useEffect(() => {
    if (mustChange) router.replace("/change-password");
  }, [mustChange, router]);

  if (!user || mustChange) return <Splash />;
  return <PhoneForm saved={user.phone} />;
}

function PhoneForm({ saved }: { saved: string | null }) {
  const router = useRouter();
  const update = useUpdateOwnPhone();
  const logout = useLogout();
  const [phone, setPhone] = useState(formatPhone(saved));
  const [touched, setTouched] = useState(false);

  // Nobody gets past without a number, but anybody can sign out.
  const required = saved === null;
  const problem = touched ? phoneProblem(phone) : undefined;

  const apiError = update.error ? toApiError(update.error) : null;
  const fieldError = apiError?.fields?.phone;
  const formError = apiError && !apiError.fields ? errorMessage(apiError) : null;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (phoneProblem(phone)) return;
    update.mutate({ phone: phone.trim() }, { onSuccess: () => router.replace(DEFAULT_HOME) });
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <form onSubmit={onSubmit} noValidate className="flex w-full max-w-[440px] flex-col gap-5 rounded-2xl border border-border bg-surface p-8 shadow-card">
        <LogoMark height={44} />
        <div className="flex flex-col gap-1.5">
          <h1 className="text-h1 font-semibold text-text">{required ? "Add your phone number" : "Your phone number"}</h1>
          <p className="text-body text-text-2">
            {required
              ? "Every account needs a phone number. It is how LeadNest will reach you about leads and follow-ups."
              : "This is where LeadNest reaches you about leads and follow-ups."}
          </p>
        </div>

        {formError ? <Alert>{formError}</Alert> : null}

        <Field label="Mobile number" hint={PHONE_HINT} error={problem ?? fieldError}>
          {({ id, describedBy, invalid }) => (
            <TextInput id={id} type="tel" inputMode="tel" icon="phone" autoComplete="tel" placeholder="98765 43210"
              value={phone} onChange={(e) => setPhone(e.target.value)} invalid={invalid} aria-describedby={describedBy} autoFocus />
          )}
        </Field>

        <Button type="submit" size="lg" loading={update.isPending}>Save and continue</Button>

        {required ? (
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
