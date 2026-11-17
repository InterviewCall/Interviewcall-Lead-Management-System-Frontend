"use client";

import { m, useReducedMotion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Wordmark } from "@/components/ui/logo";
import { errorMessage, toApiError } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import { EASE_OUT } from "@/lib/motion";
import { GuestOnly, safeNext } from "./guards";
import { useLogin } from "./hooks";

/** Made-up people for the preview on the sign-in page: it shows the kind of day the CRM organises. */
const PREVIEW: Array<{ name: string; what: string; when: string; heat: "HOT" | "WARM" | "COLD" }> = [
  { name: "Riya Menon", what: "Booked call from the VSL", when: "11:30 am", heat: "HOT" },
  { name: "Arjun Das", what: "Follow-up: share the test result", when: "2:00 pm", heat: "WARM" },
  { name: "Sana Qureshi", what: "New lead from WorkR", when: "just now", heat: "COLD" },
];
const HEAT_DOT = { HOT: "bg-hot", WARM: "bg-warm", COLD: "bg-cold" } as const;

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
  const reduce = useReducedMotion();
  return (
    <section className="flex flex-col gap-6 px-6 pt-12 pb-10 lg:w-[720px] lg:max-w-[50%] lg:shrink-0 lg:justify-center lg:bg-brand-hero lg:p-16">
      <Wordmark large />
      <h1 className="anim-fade-up max-w-[520px] font-display text-[30px] leading-9 font-bold tracking-[-0.6px] text-white lg:text-[40px] lg:leading-[46px]">
        Every lead followed up, every time.
      </h1>
      <p className="max-w-[480px] text-body text-side-text">
        One place for BDAs and closers to work leads from WorkR and the VSL, and for managers to see what is moving.
      </p>

      {/* A glimpse of a working day: the timeline fills to "now" and the day's calls arrive. Illustrative only. */}
      <div aria-hidden className="mt-2 hidden max-w-[460px] flex-col gap-3 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10 lg:flex">
        <div className="flex items-center justify-between text-[11px] text-side-text">
          <span>Today</span>
          <span className="nums">9 am to 9 pm</span>
        </div>
        <div className="relative h-1.5 rounded-full bg-white/10">
          <m.div className="absolute inset-y-0 left-0 w-[46%] origin-left rounded-full bg-gradient-to-r from-primary/40 to-primary" initial={reduce ? false : { scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1, ease: EASE_OUT, delay: 0.3 }} />
          {[0.21, 0.38, 0.62, 0.8].map((x, i) => (
            <m.span key={x} className={cn("absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-ink", i === 2 ? "size-3 bg-white" : "size-2 bg-warm")} style={{ left: `${x * 100}%` }}
              initial={reduce ? false : { opacity: 0, scale: 0.3 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 24, delay: 0.3 + Math.min(x, 0.46) * 2.1 + (x > 0.46 ? 0.25 : 0) }} />
          ))}
          <m.span className="absolute top-1/2 left-[46%] size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} />
        </div>
        <ul className="flex flex-col gap-2 pt-1">
          {PREVIEW.map((p, i) => (
            <m.li key={p.name} className="flex items-center gap-3 rounded-xl bg-white/[0.05] px-3 py-2.5"
              initial={reduce ? false : { opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 380, damping: 32, delay: 1.1 + i * 0.14 }}>
              <span className={cn("size-2 shrink-0 rounded-full", HEAT_DOT[p.heat])} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body font-semibold text-white">{p.name}</span>
                <span className="truncate text-small text-side-text">{p.what}</span>
              </span>
              <span className="nums text-small font-medium whitespace-nowrap text-white/80">{p.when}</span>
            </m.li>
          ))}
        </ul>
      </div>
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
        <h2 className="font-display text-h1 font-bold text-text">Welcome back</h2>
        <p className="text-body text-text-2">Sign in with your company account to open your leads.</p>
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
