import { RouteCalendarIndicator } from "@/components/bin-service/RouteCalendarIndicator";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatShortDate } from "@/lib/bin-service/schedule";
import { getRotationStatusStyles } from "@/lib/bin-service/status";
import type { RotationStatusResult } from "@/lib/bin-service/status";
import { MapPin, Settings2 } from "lucide-react";
import Link from "next/link";

type BinSiteCardProps = {
  site: {
    id: string;
    name: string;
    area: string | null;
    address: string;
    client: { name: string };
    setup: {
      expectedRegularBins: number;
      expectedNewBins: number;
      nextServiceDate: Date | null;
      active: boolean;
      assignedTechnician: {
        firstName: string;
        lastName: string;
      } | null;
    } | null;
  };
  rotation: RotationStatusResult;
};

export function BinSiteCard({ site, rotation }: BinSiteCardProps) {
  const styles = getRotationStatusStyles(rotation.color);

  return (
    <GlassCard
      className={`border-l-4 ${styles.border} flex h-full flex-col`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#00c6ff]/15 text-[#00c6ff]">
          <MapPin className="h-5 w-5" aria-hidden="true" />
        </div>
        <RouteCalendarIndicator color={rotation.color} label={rotation.label} />
      </div>

      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-[#00c6ff]/80">
        {site.client.name}
      </p>
      <h2 className="mt-1 text-lg font-bold text-[#ebfbff]">{site.name}</h2>
      <p className="mt-2 text-sm text-[#ebfbff]/55">
        {site.area ? `${site.area} · ` : ""}
        {site.address}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles.badge}`}
        >
          {rotation.label}
        </span>
        <span className="inline-flex rounded-full border border-[#00c6ff]/35 bg-[#00c6ff]/15 px-3 py-1 text-xs font-semibold text-[#00c6ff]">
          Biweekly
        </span>
      </div>

      {site.setup ? (
        <div className="mt-4 space-y-1 text-sm text-[#ebfbff]/60">
          <p>
            Expected: {site.setup.expectedRegularBins} regular ·{" "}
            {site.setup.expectedNewBins} new
          </p>
          {site.setup.nextServiceDate ? (
            <p>Next service: {formatShortDate(site.setup.nextServiceDate)}</p>
          ) : null}
          {site.setup.assignedTechnician ? (
            <p>
              Technician: {site.setup.assignedTechnician.firstName}{" "}
              {site.setup.assignedTechnician.lastName}
            </p>
          ) : (
            <p className="text-[#f5c542]">No technician assigned</p>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-[#f5c542]">Setup required</p>
      )}

      <div className="mt-6 flex flex-1 items-end">
        <Link
          href={`/jobs/bin-management/setup/${site.id}`}
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-4 py-3 text-sm font-semibold text-[#ebfbff] transition-colors hover:border-[#00c6ff]/60 hover:bg-[#00c6ff]/20"
        >
          <Settings2 className="h-4 w-4" aria-hidden="true" />
          {site.setup ? "Edit Setup" : "Configure Setup"}
        </Link>
      </div>
    </GlassCard>
  );
}
