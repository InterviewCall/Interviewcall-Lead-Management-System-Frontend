/** Digits in what was typed, ignoring spaces, dashes, brackets and the + sign. */
export function phoneDigits(value: string): number {
  return value.replace(/\D/g, "").length;
}

/** A quick check so an obvious slip is caught before the request. The server checks the number properly. */
export function phoneProblem(value: string): string | undefined {
  if (value.trim() === "") return "Enter a phone number";
  if (phoneDigits(value) < 10) return "Enter a 10-digit mobile number";
  return undefined;
}

/** True when what was typed is the number already saved, however it is spaced or prefixed. */
export function samePhone(typed: string, saved: string | null): boolean {
  if (saved === null) return false;
  const digits = typed.replace(/\D/g, "");
  const savedDigits = saved.replace(/\D/g, "");
  if (digits === savedDigits) return true;
  // 98765 43210 or 098765 43210 stand for +91 98765 43210.
  return saved.startsWith("+91") && !typed.trim().startsWith("+") && savedDigits === `91${digits.replace(/^0/, "").replace(/^91(?=\d{10}$)/, "")}`;
}

/** +919876543210 → +91 98765 43210. Other numbers are shown as saved. */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^\+91(\d{5})(\d{5})$/.exec(value);
  return match ? `+91 ${match[1]} ${match[2]}` : value;
}

export const PHONE_HINT = "10-digit mobile number. For a number outside India, start with the country code, like +44.";
