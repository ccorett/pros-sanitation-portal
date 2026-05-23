import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { ChangePinForm } from "@/components/auth/ChangePinForm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function EmployeeChangePinPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/employee-login");
  }

  return (
    <AuthPageShell
      title="Change PIN"
      subtitle="Update your 4-digit portal PIN."
      badge="Account security"
    >
      <ChangePinForm />
    </AuthPageShell>
  );
}
