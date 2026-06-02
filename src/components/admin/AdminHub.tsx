"use client";

import type { AdminHubCard } from "@/lib/admin-hub-server";
import { getAdminHubSections } from "@/lib/platform-storage";
import Link from "next/link";
import { useEffect, useState } from "react";

type AdminHubProps = {
  serverSections?: AdminHubCard[];
};

export function AdminHub({ serverSections = [] }: AdminHubProps) {
  const [sections, setSections] = useState(() =>
    typeof window !== "undefined" ? getAdminHubSections() : [],
  );

  useEffect(() => {
    function refresh() {
      setSections(getAdminHubSections());
    }
    refresh();
    window.addEventListener("pros-platform-data-updated", refresh);
    window.addEventListener("pros-bin-locations-updated", refresh);
    return () => {
      window.removeEventListener("pros-platform-data-updated", refresh);
      window.removeEventListener("pros-bin-locations-updated", refresh);
    };
  }, []);

  const allSections = [...sections, ...serverSections];

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {allSections.map((section) => (
        <article
          key={section.id}
          className="glass-card flex flex-col rounded-2xl border border-[#00c6ff]/15 p-6 sm:p-7"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold text-[#ebfbff]">{section.title}</h2>
            {section.count > 0 ? (
              <span className="inline-flex min-h-[28px] min-w-[28px] items-center justify-center rounded-full border border-[#6cc801]/40 bg-[#6cc801]/15 px-2 text-xs font-bold text-[#6cc801]">
                {section.count}
              </span>
            ) : null}
          </div>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-[#ebfbff]/60">
            {section.description}
          </p>
          {section.lastEditedLabel ? (
            <p className="mt-4 text-xs text-[#ebfbff]/45">
              Last activity: {section.lastEditedLabel}
            </p>
          ) : (
            <p className="mt-4 text-xs text-[#ebfbff]/35">No recent edits</p>
          )}
          <Link
            href={section.href}
            className="mt-6 inline-flex min-h-[52px] w-full items-center justify-center rounded-xl border border-[#6cc801]/45 bg-gradient-to-r from-[#259f00]/25 to-[#00c6ff]/15 px-5 py-3 text-base font-bold text-[#ebfbff] transition-colors hover:from-[#259f00]/35 hover:to-[#00c6ff]/25"
          >
            Open
          </Link>
        </article>
      ))}
    </div>
  );
}
