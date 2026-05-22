"use client";

import { motion } from "framer-motion";
import { Lock, Mail } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { COMPANY } from "@/lib/constants";

export function LoginCTASection() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    router.push(isSignedIn ? "/staff-dashboard" : "/employee-login");
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
          <div
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#ebfbff]/15 bg-gradient-to-br from-[#0c151d] to-[#259f00]/20 shadow-lg shadow-[#259f00]/10 sm:h-[72px] sm:w-[72px]"
            role="img"
            aria-label={`${COMPANY.name} logo`}
          >
            <span className="text-xl font-black tracking-tighter text-[#6cc801] sm:text-2xl">
              PS
            </span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#00c6ff]">
            {COMPANY.name}
          </p>
          <p className="mt-4 text-base text-[#ebfbff]/70 sm:text-lg">
            Welcome back. Access your operational workspace.
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
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-[#ebfbff]/80"
                >
                  Work email
                </label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#ebfbff]/40"
                    aria-hidden="true"
                  />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@prossanitation.com"
                    className="w-full rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 py-4 pl-12 pr-4 text-[#ebfbff] placeholder:text-[#ebfbff]/30 transition-colors focus:border-[#00c6ff]/50 focus:outline-none focus:ring-2 focus:ring-[#00c6ff]/30 min-h-[54px] text-base"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-[#ebfbff]/80"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-4 text-[#ebfbff] placeholder:text-[#ebfbff]/30 transition-colors focus:border-[#00c6ff]/50 focus:outline-none focus:ring-2 focus:ring-[#00c6ff]/30 min-h-[54px] text-base"
                />
              </div>
              <div className="flex justify-end">
                <a
                  href="#"
                  className="text-sm font-medium text-[#00c6ff] hover:text-[#6cc801] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00c6ff] rounded"
                  onClick={(e) => e.preventDefault()}
                >
                  Forgot Password?
                </a>
              </div>
              <Button type="submit" variant="login" loading={loading}>
                Login to Portal
              </Button>
            </form>
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
