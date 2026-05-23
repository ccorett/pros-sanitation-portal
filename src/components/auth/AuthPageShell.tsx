import { COMPANY } from "@/lib/constants";
import { CompanyLogo } from "@/components/ui/CompanyLogo";
import { GlassCard } from "@/components/ui/GlassCard";
import { Lock } from "lucide-react";

interface AuthPageShellProps {
  title: string;
  subtitle: string;
  badge?: string;
  children: React.ReactNode;
}

export function AuthPageShell({
  title,
  subtitle,
  badge = "Secure employee access",
  children,
}: AuthPageShellProps) {
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
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#ebfbff]/15 bg-gradient-to-br from-[#0c151d] to-[#259f00]/20 shadow-lg shadow-[#259f00]/10">
          <CompanyLogo
            size="md"
            className="drop-shadow-[0_0_12px_rgba(37,159,0,0.35)]"
          />
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#00c6ff]">
          {COMPANY.name}
        </p>
        <p className="mt-3 text-sm text-[#ebfbff]/60">{badge}</p>
      </div>
      <div className="relative z-10 w-full max-w-xl">
        <GlassCard className="login-glow relative w-full border-[#00c6ff]/25 p-6 sm:p-8">
          <div className="mb-7 flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#259f00]/20 text-[#6cc801]">
              <Lock className="h-7 w-7" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#ebfbff] sm:text-3xl">{title}</h1>
              <p className="mt-1.5 text-sm text-[#ebfbff]/60 sm:text-base">{subtitle}</p>
            </div>
          </div>
          {children}
        </GlassCard>
      </div>
    </main>
  );
}
