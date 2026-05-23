import { getAppBaseUrl, getPublicAppBaseUrl } from "@/lib/app-url";

export const AUTH_COOKIE_PREFIX = "pros-portal";

function addTrustedOrigin(origins: Set<string>, value: string | undefined): void {
  const trimmed = value?.trim();
  if (!trimmed) return;

  if (trimmed.includes("*") || trimmed.includes("?")) {
    origins.add(trimmed);
    return;
  }

  try {
    const origin = trimmed.includes("://")
      ? new URL(trimmed).origin
      : new URL(`https://${trimmed}`).origin;
    origins.add(origin);
  } catch {
    origins.add(trimmed);
  }
}

export function resolveTrustedOrigins(): string[] {
  const origins = new Set<string>();

  addTrustedOrigin(origins, getAppBaseUrl());
  addTrustedOrigin(origins, getPublicAppBaseUrl());

  if (process.env.VERCEL_URL) {
    addTrustedOrigin(origins, `https://${process.env.VERCEL_URL}`);
  }

  process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",").forEach((entry) => {
    addTrustedOrigin(origins, entry);
  });

  if (process.env.NODE_ENV !== "production") {
    for (let port = 3000; port <= 3010; port++) {
      origins.add(`http://localhost:${port}`);
      origins.add(`http://127.0.0.1:${port}`);
    }
  }

  return [...origins];
}

export function getAuthAdvancedOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    useSecureCookies: isProduction,
    cookiePrefix: AUTH_COOKIE_PREFIX,
    defaultCookieAttributes: {
      sameSite: "lax" as const,
      secure: isProduction,
      httpOnly: true,
      path: "/",
    },
  };
}
