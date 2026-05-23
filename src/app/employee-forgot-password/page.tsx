import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function EmployeeForgotPasswordPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/staff-dashboard");
  }

  return (
    <AuthPageShell
      title="Reset PIN"
      subtitle="Enter your email and we will send PIN reset instructions."
      badge="PIN recovery"
    >
      <ForgotPasswordForm />
    </AuthPageShell>
  );
}
