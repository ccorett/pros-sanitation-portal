import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { COMPANY } from "@/lib/constants";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default async function EmployeeLoginPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/staff-dashboard");
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 industrial-grid opacity-30"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, color-mix(in srgb, #00c6ff 18%, transparent), transparent)",
        }}
        aria-hidden="true"
      />
      <div className="relative z-10 mb-8 text-center">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#ebfbff]/15 bg-gradient-to-br from-[#0c151d] to-[#259f00]/20 shadow-lg shadow-[#259f00]/10"
          aria-hidden="true"
        >
          <span className="text-xl font-black tracking-tighter text-[#6cc801]">PS</span>
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#00c6ff]">
          {COMPANY.name}
        </p>
        <p className="mt-3 text-sm text-[#ebfbff]/60">Secure employee access</p>
      </div>
      <div className="relative z-10 flex w-full flex-col items-center">
        <SignIn
          path="/employee-login"
          routing="path"
          signUpUrl="/employee-signup"
          appearance={clerkAppearance}
          forceRedirectUrl="/staff-dashboard"
          fallbackRedirectUrl="/staff-dashboard"
        />
        <p className="mt-6 text-center text-sm text-[#ebfbff]/60">
          New employee?{" "}
          <Link
            href="/employee-signup"
            className="font-medium text-[#00c6ff] transition-colors hover:text-[#6cc801] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00c6ff] rounded"
          >
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
}
