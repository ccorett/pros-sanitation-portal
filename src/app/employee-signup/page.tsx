import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { EmployeeSignupForm } from "@/components/auth/EmployeeSignupForm";
import { auth } from "@/lib/auth";
import { getPublicSignupPolicy } from "@/lib/signup-access";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function EmployeeSignupPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/staff-dashboard");
  }

  const policy = getPublicSignupPolicy();

  if (policy.mode === "disabled") {
    return (
      <AuthPageShell
        title="Registration Unavailable"
        subtitle="Employee accounts must be created by an administrator."
        badge="Sign-up disabled"
      >
        <div className="relative z-10 w-full max-w-md text-center">
          <p className="text-sm text-[#ebfbff]/70">
            Self-service registration is turned off for this portal. Contact
            your supervisor or IT to get an account.
          </p>
          <Link
            href="/employee-login"
            className="mt-6 inline-block text-sm font-medium text-[#00c6ff] hover:text-[#6cc801]"
          >
            Back to sign in
          </Link>
        </div>
      </AuthPageShell>
    );
  }

  const subtitle =
    policy.mode === "invite"
      ? "Use your email and invite code to register."
      : "Register with your email to access the operations portal.";

  return (
    <AuthPageShell
      title="Create Employee Account"
      subtitle={subtitle}
      badge="Create your employee account"
    >
      <EmployeeSignupForm policy={policy} />
    </AuthPageShell>
  );
}
