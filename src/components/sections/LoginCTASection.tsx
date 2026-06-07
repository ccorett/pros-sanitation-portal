"use client";

import { motion } from "framer-motion";
import { Lock, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { authErrorClassName } from "@/lib/auth-form-styles";
import { signInEmployee } from "@/lib/employee-sign-in";
import { normalizePinInput } from "@/lib/pin";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CreateEmployeeAccountLink } from "@/components/auth/CreateEmployeeAccountLink";
import { resolvePostLoginRedirect } from "@/lib/portal-auth-redirect";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CompanyLogo } from "@/components/ui/CompanyLogo";
import { GlassCard } from "@/components/ui/GlassCard";
import { COMPANY } from "@/lib/constants";

export function LoginCTASection() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const { data: session, isPending } = authClient.useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (isPending) return;

    if (session) {
      window.location.assign(resolvePostLoginRedirect(returnTo));
      return;
    }

    setLoading(true);

    try {
      const result = await signInEmployee({ email, pin, returnTo });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      window.location.assign(result.redirectTo);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="login"
      className="w-full px-4 pt-8 pb-6 sm:px-6 sm:pt-10 sm:pb-8 lg:px-8"
      aria-labelledby="login-heading"
    >
      <div className="mx-auto flex w-full max-w-xl flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-6 flex flex-col items-center text-center"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#ebfbff]/15 bg-gradient-to-br from-[#0c151d] to-[#259f00]/20 shadow-lg shadow-[#259f00]/10 sm:h-[72px] sm:w-[72px]">
            <CompanyLogo
              size="md"
              className="drop-shadow-[0_0_12px_rgba(37,159,0,0.35)] sm:hidden"
            />
            <CompanyLogo
              size="lg"
              className="hidden drop-shadow-[0_0_12px_rgba(37,159,0,0.35)] sm:block"
            />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#00c6ff]">
            {COMPANY.name}
          </p>
          <p className="mt-4 text-base text-[#ebfbff]/70 sm:text-lg">
            Welcome back. Sign in to continue work.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full"
        >
          <GlassCard className="login-glow relative w-full border-[#00c6ff]/25 p-6 sm:p-8">
            <div className="mb-7 flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#259f00]/20 text-[#6cc801]">
                <Lock className="h-7 w-7" aria-hidden="true" />
              </div>
              <div>
                <h1
                  id="login-heading"
                  className="text-2xl font-bold text-[#ebfbff] sm:text-3xl"
                >
                  Secure Employee Login
                </h1>
                <p className="mt-1.5 text-sm text-[#ebfbff]/60 sm:text-base">
                  Sign in with your company credentials to continue.
                </p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {error && (
                <p className={authErrorClassName} role="alert">
                  {error}
                </p>
              )}
              <div>
                <label
                  htmlFor="landing-email"
                  className="mb-2 block text-sm font-medium text-[#ebfbff]/80"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#ebfbff]/40"
                    aria-hidden="true"
                  />
                  <input
                    id="landing-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 py-4 pl-12 pr-4 text-[#ebfbff] placeholder:text-[#ebfbff]/30 transition-colors focus:border-[#00c6ff]/50 focus:outline-none focus:ring-2 focus:ring-[#00c6ff]/30 min-h-[54px] text-base"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="landing-pin"
                  className="mb-2 block text-sm font-medium text-[#ebfbff]/80"
                >
                  4 Digit PIN
                </label>
                <input
                  id="landing-pin"
                  name="pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="current-password"
                  required
                  maxLength={4}
                  pattern="\d{4}"
                  value={pin}
                  onChange={(e) => setPin(normalizePinInput(e.target.value))}
                  placeholder="Enter your PIN"
                  className="w-full rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-4 text-[#ebfbff] placeholder:text-[#ebfbff]/30 transition-colors focus:border-[#00c6ff]/50 focus:outline-none focus:ring-2 focus:ring-[#00c6ff]/30 min-h-[54px] text-base"
                />
              </div>
              <div className="flex justify-end">
                <Link
                  href="/employee-forgot-password"
                  className="text-sm font-medium text-[#00c6ff] hover:text-[#6cc801] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00c6ff] rounded"
                >
                  Forgot PIN?
                </Link>
              </div>
              <Button type="submit" variant="login" loading={loading}>
                Login to Portal
              </Button>
            </form>
            <div className="mt-5 space-y-3">
              <p className="text-center text-sm text-[#ebfbff]/60">New employee?</p>
              <CreateEmployeeAccountLink />
            </div>
            <p className="mt-6 text-center text-xs text-[#ebfbff]/40">
              {COMPANY.name} — Authorized employees only. Unauthorized access is
              prohibited and monitored.
            </p>
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );
}
