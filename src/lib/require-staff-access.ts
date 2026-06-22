import {
  buildSessionExpiredLoginUrl,
} from "@/lib/session-inactivity";
import {
  resolveAuthenticatedSession,
} from "@/lib/require-authenticated-session";
import { getEmployeePortalAccess } from "@/lib/employee-portal-access";
import {
  canAccessPathname,
  PORTAL_ACCESS_DENIED_REDIRECT,
  toEmployeeAccessContext,
} from "@/lib/portal-route-access";
import { recordUnauthorizedRouteAccess } from "@/lib/security-audit-log";
import { getRequestIp } from "@/lib/request-ip";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

type RequireStaffAccessOptions = {
  /** When set, redirects to the dashboard if this access level cannot open the path. */
  pathname?: string;
};

export async function requireStaffAccess(options?: RequireStaffAccessOptions) {
  const authResult = await resolveAuthenticatedSession({ touch: true });

  if (authResult.status === "unauthenticated") {
    redirect("/employee-login");
  }

  if (authResult.status === "expired") {
    redirect(buildSessionExpiredLoginUrl());
  }

  const { session } = authResult;
  const access = await getEmployeePortalAccess(session.user.id);

  if (!access.allowed) {
    redirect(`/employee-login?access=${access.code}`);
  }

  if (access.pendingVerification) {
    redirect("/pending-verification");
  }

  const accessContext = await toEmployeeAccessContext(access.employee);

  if (
    options?.pathname &&
    !canAccessPathname(accessContext, options.pathname)
  ) {
    const requestHeaders = await headers();
    await recordUnauthorizedRouteAccess({
      email: access.employee.companyEmail,
      accessLevel: access.employee.accessLevel,
      pathname: options.pathname,
      ipAddress: getRequestIp(new Request("http://local", { headers: requestHeaders })),
    });
    redirect(PORTAL_ACCESS_DENIED_REDIRECT);
  }

  return { session, employee: access.employee, accessContext };
}

export async function requirePendingVerificationAccess() {
  const authResult = await resolveAuthenticatedSession({ touch: true });

  if (authResult.status === "unauthenticated") {
    redirect("/employee-login");
  }

  if (authResult.status === "expired") {
    redirect(buildSessionExpiredLoginUrl());
  }

  const { session } = authResult;
  const access = await getEmployeePortalAccess(session.user.id);

  if (!access.allowed) {
    redirect(`/employee-login?access=${access.code}`);
  }

  if (!access.pendingVerification) {
    redirect("/staff-dashboard");
  }

  return { session, employee: access.employee };
}
