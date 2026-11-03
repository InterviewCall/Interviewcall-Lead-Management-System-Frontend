import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { toApiError } from "./errors";

/**
 * The API lives on another origin in development (http://localhost:3000), so every request
 * sends cookies (withCredentials) and every write carries the CSRF header the API checks.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

const CSRF_COOKIE = "crm_csrf";
const CSRF_HEADER = "X-CSRF-Token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Fired on `window` when the session is over and the person must sign in again. */
export const SESSION_EXPIRED_EVENT = "crm:session-expired";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 20_000,
  headers: { Accept: "application/json" },
});

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  for (const part of document.cookie.split("; ")) {
    const eq = part.indexOf("=");
    if (eq > 0 && part.slice(0, eq) === name) return decodeURIComponent(part.slice(eq + 1));
  }
  return undefined;
}

api.interceptors.request.use((config) => {
  const method = (config.method ?? "get").toUpperCase();
  if (!SAFE_METHODS.has(method)) {
    const token = readCookie(CSRF_COOKIE);
    if (token) config.headers.set(CSRF_HEADER, token);
  }
  return config;
});

/* ---------------------------------------------------------------- silent refresh */

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

/** Requests that must never trigger a refresh: they are how a session starts or ends. */
const NO_REFRESH_PATHS = ["/auth/login", "/auth/refresh", "/auth/logout"];

let refreshInFlight: Promise<void> | null = null;

const LAST_REFRESH_KEY = "crm:last-refresh";
const LOCK_NAME = "crm-refresh";
/** A refresh another tab finished this recently is reused instead of rotating the token again. */
const REUSE_WINDOW_MS = 5_000;

async function callRefresh(): Promise<void> {
  await api.post("/auth/refresh");
  try {
    localStorage.setItem(LAST_REFRESH_KEY, String(Date.now()));
  } catch {
    /* storage can be blocked; the refresh itself still worked */
  }
}

function recentlyRefreshedElsewhere(): boolean {
  try {
    const at = Number(localStorage.getItem(LAST_REFRESH_KEY));
    return Number.isFinite(at) && Date.now() - at < REUSE_WINDOW_MS;
  } catch {
    return false;
  }
}

/**
 * One refresh at a time: within this tab through a shared promise, across tabs through a Web Lock.
 * A tab that waited on the lock skips its own refresh when another tab just renewed the cookies.
 */
function refreshSession(): Promise<void> {
  if (!refreshInFlight) {
    const run = async () => {
      const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
      if (locks) {
        await locks.request(LOCK_NAME, async () => {
          if (recentlyRefreshedElsewhere()) return;
          await callRefresh();
        });
      } else {
        await callRefresh();
      }
    };
    refreshInFlight = run().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

function endSession(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (error instanceof AxiosError && error.response?.status === 401 && error.config) {
      const config = error.config as RetriableConfig;
      const path = config.url ?? "";
      const skip = NO_REFRESH_PATHS.some((p) => path.startsWith(p));
      // No CSRF cookie means no session was ever started here, so there is nothing to refresh.
      const hasSession = readCookie(CSRF_COOKIE) !== undefined;
      if (!skip && hasSession && !config._retried) {
        config._retried = true;
        try {
          await refreshSession();
        } catch (refreshError) {
          // A 401 from refresh means the sign-in is over. Anything else (offline, 5xx) is not a
          // reason to sign the person out, so surface that error instead.
          const apiError = toApiError(refreshError);
          if (apiError.status === 401) endSession();
          throw apiError;
        }
        return api.request(config);
      }
    }
    throw toApiError(error);
  },
);
