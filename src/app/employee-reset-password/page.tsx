import { Suspense } from "react";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default function EmployeeResetPasswordPage() {
  return (
    <AuthPageShell
      title="Choose a New PIN"
      subtitle="Set a new 4-digit company PIN for your employee account."
      badge="PIN recovery"
    >
      <Suspense
        fallback={
          <p className="relative z-10 text-center text-sm text-[#ebfbff]/60">
            Loading reset form…
          </p>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthPageShell>
  );
}
