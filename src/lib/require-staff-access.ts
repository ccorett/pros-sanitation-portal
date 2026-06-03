import { auth } from "@/lib/auth";
import { getEmployeePortalAccess } from "@/lib/employee-portal-access";
import {
  canAccessPathname,
  PORTAL_ACCESS_DENIED_REDIRECT,
  toEmployeeAccessContext,
} from "@/lib/portal-route-access";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

type RequireStaffAccessOptions = {
  /** When set, redirects to the dashboard if this access level cannot open the path. */
  pathname?: string;
};

export async function requireStaffAccess(options?: RequireStaffAccessOptions) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (!session) {
    redirect("/employee-login");
  }

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
    redirect(PORTAL_ACCESS_DENIED_REDIRECT);
  }

  return { session, employee: access.employee, accessContext };
}

export async function requirePendingVerificationAccess() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  if (!session) {
    redirect("/employee-login");
  }

  const access = await getEmployeePortalAccess(session.user.id);

  if (!access.allowed) {
    redirect(`/employee-login?access=${access.code}`);
  }

  if (!access.pendingVerification) {
    redirect("/staff-dashboard");
  }

  return { session, employee: access.employee };
}
