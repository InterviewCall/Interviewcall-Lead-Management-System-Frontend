"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { Icon, type IconName } from "@/components/ui/icon";
import { Wordmark } from "@/components/ui/logo";
import { errorMessage, toApiError } from "@/lib/api/errors";
import { GuestOnly, safeNext } from "./guards";
import { useLogin } from "./hooks";

const FEATURES: Array<{ icon: IconName; text: string }> = [
  { icon: "zap", text: "New leads arrive within seconds of signup" },
  { icon: "clock", text: "Next steps and reminders so nothing goes cold" },
  { icon: "bars", text: "Clear funnel and BDA reports for managers" },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginScreen() {
  return (
    <GuestOnly>
      <div className="flex min-h-dvh flex-col bg-brand-hero lg:flex-row lg:bg-none">
        <BrandPanel />
        <div className="flex flex-1 items-center justify-center rounded-t-3xl bg-surface px-6 py-8 lg:rounded-none lg:p-16">
          <LoginForm />
        </div>
      </div>
    </GuestOnly>
  );
}

function BrandPanel() {
  return (
    <section className="flex flex-col gap-6 px-6 pt-12 pb-10 lg:w-[720px] lg:max-w-[50%] lg:shrink-0 lg:justify-center lg:bg-brand-hero lg:p-16">
      <Wordmark large />
      <h1 className="anim-fade-up max-w-[520px] text-h1 font-bold text-white lg:text-display">Every lead followed up, every time.</h1>
      <p className="max-w-[480px] text-body text-side-text">
        One place for your BDAs and closers to work leads from WorkR and the VSL, and for managers to see what is moving.
      </p>
      <ul className="hidden flex-col gap-3.5 pt-4 lg:flex">
        {FEATURES.map((f, i) => (
          <li key={f.text} className="anim-fade-up flex items-center gap-3" style={{ animationDelay: `${0.25 + i * 0.1}s` }}>
            <span className="flex size-9 items-center justify-center rounded-[10px] bg-side-active text-[#a5b4fc]">
              <Icon name={f.icon} size={18} />
            </span>
            <span className="text-body font-medium text-white">{f.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [touched, setTouched] = useState(false);

  const emailError = touched && !EMAIL_PATTERN.test(email.trim()) ? "Enter a valid work email" : undefined;
  const passwordError = touched && password === "" ? "Enter your password" : undefined;

  const apiError = login.error ? toApiError(login.error) : null;
  const fieldErrors = apiError?.fields ?? {};
  const formError =
    apiError && !apiError.fields
      ? apiError.code === "INVALID_CREDENTIALS"
        ? "That email and password do not match. Check them and try again."
        : errorMessage(apiError)
      : null;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!EMAIL_PATTERN.test(email.trim()) || password === "") return;
    login.mutate(
      { email: email.trim(), password },
      {
        onSuccess: (user) => {
          router.replace(user.mustChangePassword ? "/change-password" : safeNext(params.get("next")));
        },
      },
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="anim-fade-up flex w-full max-w-[400px] flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-h1 font-semibold text-text">Welcome back</h2>
        <p className="text-body text-text-2">Sign in with your company account to open your leads.</p>
      </div>

      <button
        type="button"
        disabled
        title="Google sign-in is not available yet"
        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-border-strong bg-surface text-body font-medium text-text opacity-60"
      >
        <Icon name="users" size={18} className="text-text-2" />
        Continue with Google Workspace
        <span className="rounded-full bg-bg px-2 py-0.5 text-small text-text-2">Soon</span>
      </button>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-small text-muted">or use email</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {formError ? <Alert>{formError}</Alert> : null}

      <Field label="Work email" error={emailError ?? fieldErrors.email}>
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            type="email"
            icon="mail"
            autoComplete="username"
            inputMode="email"
            placeholder="you@interviewcall.club"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            invalid={invalid}
            aria-describedby={describedBy}
            autoFocus
          />
        )}
      </Field>

      <Field
        label="Password"
        error={passwordError ?? fieldErrors.password}
        aside={
          <button type="button" onClick={() => setShowForgot((v) => !v)} className="text-small font-medium text-primary hover:underline">
            Forgot password?
          </button>
        }
      >
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            type={showPassword ? "text" : "password"}
            icon="lock"
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={invalid}
            aria-describedby={describedBy}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="text-muted hover:text-text-2"
              >
                <Icon name={showPassword ? "eyeOff" : "eye"} size={16} />
              </button>
            }
          />
        )}
      </Field>

      {showForgot ? (
        <Alert tone="info">Passwords are reset by an admin. Ask your manager and you will get a new one-time password by email.</Alert>
      ) : null}

      <Button type="submit" variant="primary" size="lg" loading={login.isPending}>
        Sign in
      </Button>

      <p className="text-small text-muted">Access is by invitation only. Ask your manager if you need an account.</p>
    </form>
  );
}
