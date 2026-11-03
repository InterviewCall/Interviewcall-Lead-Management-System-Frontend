import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  /** Shown on the right of the label row, e.g. "Forgot password?". */
  aside?: ReactNode;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

/** Label + control + message, wired together for screen readers. */
export function Field({ label, error, hint, aside, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-msg`;
  const message = error ?? hint;
  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="flex items-center">
        <label htmlFor={id} className="flex-1 text-body font-medium text-text">{label}</label>
        {aside}
      </div>
      {children({ id, describedBy: message ? messageId : undefined, invalid: Boolean(error) })}
      {message ? (
        <p id={messageId} className={cn("text-small", error ? "text-bad" : "text-text-2")} role={error ? "alert" : undefined}>
          {message}
        </p>
      ) : null}
    </div>
  );
}

const BOX = "flex h-[42px] items-center gap-2.5 rounded-lg border bg-surface px-3 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20";

/** Controls fill their row unless the caller sets a width. */
function widthClass(className: string | undefined): string {
  return /(^|\s)w-/.test(className ?? "") ? "" : "w-full";
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: IconName;
  invalid?: boolean;
  trailing?: ReactNode;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { icon, invalid, trailing, className, ...rest }, ref,
) {
  return (
    <div className={cn(BOX, widthClass(className), invalid ? "border-bad" : "border-border-strong", className)}>
      {icon ? <Icon name={icon} size={16} className="text-muted" /> : null}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className="min-w-0 flex-1 bg-transparent text-body text-text outline-none placeholder:text-muted"
        {...rest}
      />
      {trailing}
    </div>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ invalid, className, children, ...rest }, ref) {
  return (
    <div className={cn(BOX, widthClass(className), "relative", invalid ? "border-bad" : "border-border-strong", className)}>
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className="h-full min-w-0 flex-1 appearance-none bg-transparent pr-6 text-body text-text outline-none"
        {...rest}
      >
        {children}
      </select>
      <Icon name="chev" size={14} className="pointer-events-none absolute right-3 text-muted" />
    </div>
  );
});

/** Password field with an eye button that shows or hides what was typed. */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<TextInputProps, "type" | "trailing">>(function PasswordInput(props, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <TextInput
      ref={ref}
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="text-muted hover:text-text-2"
        >
          <Icon name={visible ? "eyeOff" : "eye"} size={16} />
        </button>
      }
    />
  );
});
