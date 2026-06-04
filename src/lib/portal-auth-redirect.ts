import { AUTH_EMPLOYEE_LOGIN_PATH } from "@/lib/auth-routes";

/** Portal modules linked from the public home sidebar (require sign-in). */
export const PROTECTED_PORTAL_PATHS = [
  "/staff-dashboard",
  "/jobs",
  "/equipment-supplies",
  "/hr",
  "/my-profile",
  "/admin",
] as const;

export type ProtectedPortalPath = (typeof PROTECTED_PORTAL_PATHS)[number];

const DEFAULT_POST_LOGIN_PATH = "/staff-dashboard";

export function isProtectedPortalPath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  return PROTECTED_PORTAL_PATHS.some(
    (protectedPath) =>
      path === protectedPath || path.startsWith(`${protectedPath}/`),
  );
}

export function sanitizeReturnTo(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  const pathOnly = trimmed.split("?")[0] ?? trimmed;
  if (!isProtectedPortalPath(pathOnly)) {
    return null;
  }

  return trimmed;
}

export function buildEmployeeLoginUrl(returnTo?: string | null): string {
  const safeReturnTo = sanitizeReturnTo(returnTo);
  if (!safeReturnTo) {
    return AUTH_EMPLOYEE_LOGIN_PATH;
  }

  const params = new URLSearchParams({ returnTo: safeReturnTo });
  return `${AUTH_EMPLOYEE_LOGIN_PATH}?${params.toString()}`;
}

export function resolvePostLoginRedirect(
  returnTo: string | null | undefined,
  fallback: "/pending-verification" | "/staff-dashboard" = DEFAULT_POST_LOGIN_PATH,
): "/pending-verification" | "/staff-dashboard" | string {
  return sanitizeReturnTo(returnTo) ?? fallback;
}
