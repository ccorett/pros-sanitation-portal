import { auth } from "@/lib/auth";
import { getEmployeePortalAccess } from "@/lib/employee-portal-access";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function requireStaffAccess() {
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

  return { session, employee: access.employee };
}
