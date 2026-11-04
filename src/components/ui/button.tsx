import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "cta" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "md" | "lg";
  icon?: IconName;
  loading?: boolean;
  children?: ReactNode;
}

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  cta: "bg-cta text-white shadow-cta hover:brightness-110",
  secondary: "bg-surface text-text border border-border-strong hover:bg-surface-alt",
  ghost: "text-text-2 hover:bg-black/5",
  danger: "bg-bad-soft text-bad hover:brightness-95",
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 text-body font-medium whitespace-nowrap transition active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100",
        size === "md" ? "h-9" : "h-11 w-full",
        VARIANT[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size={16} /> : icon ? <Icon name={icon} size={16} /> : null}
      {children}
    </button>
  );
}
