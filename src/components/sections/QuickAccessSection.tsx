"use client";

import { ArrowUpRight } from "lucide-react";
import { ProtectedPortalLink } from "@/components/auth/ProtectedPortalLink";
import { GlassCard } from "@/components/ui/GlassCard";
import { quickAccessItems } from "@/lib/mock-data";

export function QuickAccessSection() {
  return (
    <section
      className="w-full px-4 pb-8 sm:px-6 sm:pb-10 lg:px-8"
      aria-labelledby="quick-access-heading"
    >
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-5 text-center">
          <h2
            id="quick-access-heading"
            className="text-lg font-bold tracking-tight text-[#ebfbff] sm:text-xl"
          >
            Quick Access
          </h2>
          <p className="mt-1 text-sm text-[#ebfbff]/50">
            Daily tools for field crews and supervisors
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {quickAccessItems.map((item) => {
            const Icon = item.icon;
            return (
              <ProtectedPortalLink
                key={item.id}
                href={item.href}
                id={item.id}
                className="group block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00c6ff]"
              >
                <GlassCard hover className="h-full p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#259f00]/30 to-[#00c6ff]/20 text-[#6cc801] transition-transform duration-300 group-hover:scale-105">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <ArrowUpRight
                      className="h-4 w-4 text-[#ebfbff]/30 transition-all duration-300 group-hover:text-[#00c6ff] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-[#ebfbff]">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#ebfbff]/55">
                    {item.description}
                  </p>
                </GlassCard>
              </ProtectedPortalLink>
            );
          })}
        </div>
      </div>
    </section>
  );
}
