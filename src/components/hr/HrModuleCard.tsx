import { GlassCard } from "@/components/ui/GlassCard";
import type { HrModule } from "@/lib/hr-mock-data";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

type HrModuleCardProps = {
  module: HrModule;
};

export function HrModuleCard({ module }: HrModuleCardProps) {
  const Icon = module.icon;

  return (
    <GlassCard className="flex h-full flex-col">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00c6ff]/15 text-[#00c6ff]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-lg font-bold text-[#ebfbff]">{module.title}</h2>
      <p className="mt-2 flex-1 text-sm text-[#ebfbff]/55">{module.description}</p>
      <div className="mt-6">
        <Link
          href={module.href}
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-4 py-3 text-sm font-semibold text-[#ebfbff] transition-colors hover:border-[#00c6ff]/60 hover:bg-[#00c6ff]/20"
        >
          Open
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </GlassCard>
  );
}
