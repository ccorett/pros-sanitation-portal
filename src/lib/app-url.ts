/** Canonical local development origin — must match `npm run dev` (-p 3001) and .env.local */
export const DEV_APP_ORIGIN = "http://localhost:3001";

const DEV_APP_ORIGIN_FALLBACK = DEV_APP_ORIGIN;

export function getAppBaseUrl(): string {
  const url =
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
    DEV_APP_ORIGIN_FALLBACK;
  return url.replace(/\/$/, "");
}

export function getPublicAppBaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
    process.env.BETTER_AUTH_URL ??
    DEV_APP_ORIGIN_FALLBACK;
  return url.replace(/\/$/, "");
}

/** Better Auth client base URL — always the configured app origin (localhost:3001 in dev). */
export function getAuthClientBaseUrl(): string {
  return getPublicAppBaseUrl();
}

export function getClientAppBaseUrl(): string {
  return getAuthClientBaseUrl();
}

export function isDevEnvironment(): boolean {
  return process.env.NODE_ENV !== "production";
}

/** True when the request is served on the canonical dev port (3001). */
export function isDevCanonicalOrigin(hostname: string, port: string): boolean {
  return (
    (hostname === "localhost" || hostname === "127.0.0.1") && port === "3001"
  );
}
