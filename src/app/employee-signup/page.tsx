import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { EmployeeSignupForm } from "@/components/auth/EmployeeSignupForm";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPublicSignupPolicy } from "@/lib/signup-access";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

type EmployeeSignupPageProps = {
  searchParams: Promise<{ new?: string }>;
};

export default async function EmployeeSignupPage({
  searchParams,
}: EmployeeSignupPageProps) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });
  const { new: startNew } = await searchParams;

  if (startNew === "1" && session) {
    await auth.api.signOut({ headers: requestHeaders });
    redirect("/employee-signup");
  }

  if (session) {
    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
    });

    if (employee) {
      redirect("/staff-dashboard");
    }
  }

  const policy = getPublicSignupPolicy();

  const subtitle =
    policy.mode === "invite"
      ? "Complete your employee profile and invite code to join the operations portal."
      : "Complete your employee profile to join the operations portal.";

  return (
    <AuthPageShell
      title="Create Employee Account"
      subtitle={subtitle}
      badge="Employee onboarding"
      wide
    >
      {session ? (
        <p className="relative z-10 mb-5 rounded-xl border border-[#00c6ff]/30 bg-[#00c6ff]/10 px-4 py-3 text-sm text-[#ebfbff]/80">
          Signed in as {session.user.email}. Finish your employee profile below, or{" "}
          <Link
            href="/employee-signup?new=1"
            className="font-semibold text-[#00c6ff] hover:text-[#6cc801]"
          >
            start a new account
          </Link>
          .
        </p>
      ) : null}
      {policy.mode === "disabled" ? (
        <p className="relative z-10 mb-5 rounded-xl border border-[#f5c542]/30 bg-[#f5c542]/10 px-4 py-3 text-sm text-[#f5c542]">
          Self-service registration may be restricted in this environment. If
          account creation fails, contact your administrator.
        </p>
      ) : null}
      <EmployeeSignupForm policy={policy} signedInEmail={session?.user.email} />
      <p className="relative z-10 mt-6 text-center text-sm text-[#ebfbff]/60">
        Already registered?{" "}
        <Link
          href="/employee-login"
          className="font-medium text-[#00c6ff] transition-colors hover:text-[#6cc801]"
        >
          Sign in with Email + PIN
        </Link>
      </p>
    </AuthPageShell>
  );
}
