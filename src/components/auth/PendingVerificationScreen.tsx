"use client";

import { SessionInactivityGuard } from "@/components/auth/SessionInactivityGuard";
import { CompanyLogo } from "@/components/ui/CompanyLogo";
import { redirectToPortalHome, signOutPortalSession } from "@/lib/auth-session";
import { COMPANY } from "@/lib/constants";

type PendingVerificationScreenProps = {
  firstName: string;
};

export function PendingVerificationScreen({
  firstName,
}: PendingVerificationScreenProps) {
  async function handleSignOut() {
    await signOutPortalSession();
    redirectToPortalHome();
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <SessionInactivityGuard />
      <div
        className="pointer-events-none absolute inset-0 industrial-grid opacity-30"
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#ebfbff]/15 bg-gradient-to-br from-[#0c151d] to-[#259f00]/20 shadow-lg shadow-[#259f00]/10">
            <CompanyLogo
              size="md"
              className="drop-shadow-[0_0_12px_rgba(37,159,0,0.35)]"
            />
          </div>
          <p className="text-sm font-bold text-[#ebfbff]">{COMPANY.shortName}</p>
        </div>

        <div className="glass-card rounded-2xl p-6 sm:p-8">
          <p className="text-sm font-medium text-[#00c6ff]">Welcome, {firstName}</p>
          <h1 className="mt-2 text-2xl font-bold text-[#ebfbff]">
            Account Pending Verification
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-[#ebfbff]/65">
            Thank you for registering with the {COMPANY.shortName} operations portal.
            Your account has been received and is awaiting administrator approval.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-[#ebfbff]/55">
            You will gain access to staff modules once your access level is verified.
            If you need urgent access, contact your supervisor or HR administrator.
          </p>

          <button
            type="button"
            onClick={handleSignOut}
            className="mt-8 inline-flex min-h-[52px] w-full items-center justify-center rounded-xl border border-[#ff4d4f]/40 bg-[#ff4d4f]/10 px-5 py-3 text-base font-semibold text-[#ebfbff] transition-colors hover:bg-[#ff4d4f]/20"
          >
            Sign Out
          </button>
        </div>
      </div>
    </main>
  );
}
