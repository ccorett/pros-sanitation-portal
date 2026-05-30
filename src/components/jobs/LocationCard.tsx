import { MapPin, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ClientLocation } from "@/lib/jobs-mock-data";
import { GlassCard } from "@/components/ui/GlassCard";

type LocationCardProps = {
  location: ClientLocation;
};

function serviceTypeBadgeClass(serviceType: ClientLocation["serviceType"]): string {
  if (serviceType === "Pharmacy Cleaning") {
    return "border-[#00c6ff]/35 bg-[#00c6ff]/15 text-[#00c6ff]";
  }
  return "border-[#259f00]/35 bg-[#259f00]/15 text-[#6cc801]";
}

export function LocationCard({ location }: LocationCardProps) {
  return (
    <GlassCard className="flex h-full flex-col">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00c6ff]/15 text-[#00c6ff]">
        <MapPin className="h-5 w-5" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-lg font-bold text-[#ebfbff]">{location.name}</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${serviceTypeBadgeClass(location.serviceType)}`}
        >
          {location.serviceType}
        </span>
        <span className="inline-flex rounded-full border border-[#6cc801]/35 bg-[#6cc801]/15 px-3 py-1 text-xs font-semibold text-[#6cc801]">
          {location.status}
        </span>
      </div>
      <div className="mt-6 flex flex-1 items-end">
        <Link
          href={`/jobs/${location.slug}`}
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-4 py-3 text-sm font-semibold text-[#ebfbff] transition-colors hover:border-[#00c6ff]/60 hover:bg-[#00c6ff]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00c6ff]"
        >
          View Jobs
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </GlassCard>
  );
}
