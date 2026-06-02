import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { EmployeeLoginForm } from "@/components/auth/EmployeeLoginForm";
import { auth } from "@/lib/auth";
import { COMPANY } from "@/lib/constants";
import { getEmployeePortalAccess } from "@/lib/employee-portal-access";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

type EmployeeLoginPageProps = {
  searchParams: Promise<{ access?: string }>;
};

export default async function EmployeeLoginPage({
  searchParams,
}: EmployeeLoginPageProps) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });
  const { access: accessCode } = await searchParams;

  if (session) {
    const portalAccess = await getEmployeePortalAccess(session.user.id);
    if (portalAccess.allowed) {
      redirect(portalAccess.redirectTo);
    }
    await auth.api.signOut({ headers: requestHeaders });
  }

  return (
    <AuthPageShell
      title="Secure Employee Login"
      subtitle="Sign in with your company credentials to continue."
    >
      <EmployeeLoginForm accessCode={accessCode ?? null} />
      <p className="mt-6 text-center text-xs text-[#ebfbff]/40">
        {COMPANY.name} — Authorized employees only. Unauthorized access is
        prohibited and monitored.
      </p>
    </AuthPageShell>
  );
}
