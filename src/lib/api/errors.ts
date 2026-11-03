import { AxiosError } from "axios";

/** Every API error is `{ code, message, fields? }`; this is that, plus the HTTP status. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;
  /** Seconds to wait, from the Retry-After header on a 429. */
  readonly retryAfter?: number;

  constructor(init: {
    status: number;
    code: string;
    message: string;
    fields?: Record<string, string>;
    retryAfter?: number;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.fields = init.fields;
    this.retryAfter = init.retryAfter;
  }
}

interface ErrorBody {
  code?: unknown;
  message?: unknown;
  fields?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Turns whatever axios threw into an ApiError. Status 0 means the API could not be reached. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof AxiosError) {
    if (!error.response) {
      return new ApiError({
        status: 0,
        code: "NETWORK_ERROR",
        message: "Cannot reach the server. Check your connection and try again.",
      });
    }
    const { status, data, headers } = error.response;
    const body: ErrorBody = isRecord(data) ? data : {};
    const retryHeader = Number(headers?.["retry-after"]);
    const fields =
      isRecord(body.fields)
        ? Object.fromEntries(
            Object.entries(body.fields).filter(([, v]) => typeof v === "string"),
          ) as Record<string, string>
        : undefined;
    return new ApiError({
      status,
      code: typeof body.code === "string" ? body.code : `HTTP_${status}`,
      message:
        typeof body.message === "string" && body.message !== ""
          ? body.message
          : "Something went wrong. Please try again.",
      fields,
      retryAfter: Number.isFinite(retryHeader) && retryHeader > 0 ? retryHeader : undefined,
    });
  }
  return new ApiError({
    status: 0,
    code: "UNKNOWN",
    message: error instanceof Error ? error.message : "Something went wrong.",
  });
}

/** A message that is safe to show a person for any thrown value. */
export function errorMessage(error: unknown): string {
  const apiError = toApiError(error);
  if (apiError.status === 429 && apiError.retryAfter) {
    return `Too many attempts. Try again in ${formatWait(apiError.retryAfter)}.`;
  }
  return apiError.message;
}

function formatWait(seconds: number): string {
  if (seconds < 60) return `${Math.ceil(seconds)} seconds`;
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}
