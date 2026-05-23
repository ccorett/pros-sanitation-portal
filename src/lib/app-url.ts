export function getAppBaseUrl(): string {
  const url =
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
    "http://localhost:3000";
  return url.replace(/\/$/, "");
}

export function getPublicAppBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000";
  return url.replace(/\/$/, "");
}

/** Browser: always match the page origin so dev port changes (3000 vs 3001) still work. */
export function getAuthClientBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return getPublicAppBaseUrl();
}

export function getClientAppBaseUrl(): string {
  return getAuthClientBaseUrl();
}
