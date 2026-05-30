"use client";

import { Button } from "@/components/ui/Button";
import { RouteCalendarIndicator } from "@/components/bin-service/RouteCalendarIndicator";
import { getRotationStatusStyles } from "@/lib/bin-service/status";
import type { RotationStatusResult } from "@/lib/bin-service/status";
import { MapPin } from "lucide-react";
import Link from "next/link";

type TechnicianJobCardProps = {
  job: {
    id: string;
    site: {
      name: string;
      area: string | null;
      address: string;
    };
    setup: {
      expectedRegularBins: number;
      expectedNewBins: number;
      accessInstructions: string | null;
    };
  };
  rotation: RotationStatusResult;
};

export function TechnicianJobCard({ job, rotation }: TechnicianJobCardProps) {
  const styles = getRotationStatusStyles(rotation.color);

  return (
    <article
      className={`glass-card rounded-2xl border-l-4 ${styles.border} p-5 sm:p-6`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#259f00]/20 text-[#6cc801]">
          <MapPin className="h-5 w-5" aria-hidden="true" />
        </div>
        <RouteCalendarIndicator color={rotation.color} label={rotation.label} />
      </div>

      <h2 className="mt-4 text-xl font-bold text-[#ebfbff]">{job.site.name}</h2>
      <p className="mt-2 text-sm text-[#ebfbff]/60">
        {job.site.area ? `${job.site.area} · ` : ""}
        {job.site.address}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles.badge}`}
        >
          {rotation.label}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-[#ebfbff]/10 bg-[#0c151d]/40 p-3">
          <p className="text-[#ebfbff]/50">Regular bins</p>
          <p className="mt-1 text-lg font-bold text-[#ebfbff]">
            {job.setup.expectedRegularBins}
          </p>
        </div>
        <div className="rounded-xl border border-[#ebfbff]/10 bg-[#0c151d]/40 p-3">
          <p className="text-[#ebfbff]/50">New bins</p>
          <p className="mt-1 text-lg font-bold text-[#ebfbff]">
            {job.setup.expectedNewBins}
          </p>
        </div>
      </div>

      {job.setup.accessInstructions ? (
        <div className="mt-4 rounded-xl border border-[#00c6ff]/20 bg-[#00c6ff]/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#00c6ff]">
            Access
          </p>
          <p className="mt-1 text-sm text-[#ebfbff]/75">
            {job.setup.accessInstructions}
          </p>
        </div>
      ) : null}

      <div className="mt-6">
        <Link href={`/jobs/bin-management/job/${job.id}`}>
          <Button fullWidth className="min-h-[56px] text-base">
            Start Job
          </Button>
        </Link>
      </div>
    </article>
  );
}
