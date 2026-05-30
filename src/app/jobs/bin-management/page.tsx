import { AddBinSiteForm } from "@/components/bin-service/AddBinSiteForm";
import { BinSiteCard } from "@/components/bin-service/BinSiteCard";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import {
  enrichSiteWithStatus,
  listBinServiceSites,
} from "@/lib/bin-service/service";
import { getRotationStatus } from "@/lib/bin-service/status";
import { requireStaffAccess } from "@/lib/require-staff-access";
import { ArrowLeft, ClipboardList, Smartphone } from "lucide-react";
import Link from "next/link";

function sortSitesByPriority<T extends { rotation: ReturnType<typeof getRotationStatus> }>(
  items: T[],
) {
  const priority = (color: string) => {
    if (color === "red" || color === "orange") return 0;
    if (color === "yellow") return 1;
    if (color === "grey") return 3;
    return 2;
  };

  return [...items].sort(
    (a, b) => priority(a.rotation.color) - priority(b.rotation.color),
  );
}

export default async function BinManagementPage() {
  await requireStaffAccess();

  const sites = await listBinServiceSites();
  const enriched = sortSitesByPriority(
    sites.map((site) => enrichSiteWithStatus(site)),
  );

  return (
    <StaffWorkspaceShell
      sectionLabel="Job Management"
      title="Bin Management"
      subtitle="Track recurring sanitary bin service rotation by site. Expected bin counts are setup totals, not fixed asset IDs."
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#00c6ff] transition-colors hover:text-[#6cc801]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Job Management
        </Link>
        <Link
          href="/jobs/bin-management/today"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-4 py-2 text-sm font-semibold text-[#6cc801] transition-colors hover:bg-[#6cc801]/20"
        >
          <Smartphone className="h-4 w-4" aria-hidden="true" />
          Today&apos;s Bin Jobs
        </Link>
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <div className="glass-card rounded-2xl p-5 lg:col-span-2 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#259f00]/20 text-[#6cc801]">
              <ClipboardList className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#ebfbff]">Admin route overview</h2>
              <p className="text-sm text-[#ebfbff]/55">
                Green = on schedule · Yellow = due today/tomorrow · Red = overdue ·
                Orange = needs attention · Grey = inactive
              </p>
            </div>
          </div>
        </div>
        <AddBinSiteForm />
      </div>

      {enriched.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <p className="text-[#ebfbff]/60">
            No bin service sites yet. Add a site to configure expected bin counts
            and rotation schedule.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {enriched.map(({ site, rotation }) => (
            <BinSiteCard key={site.id} site={site} rotation={rotation} />
          ))}
        </div>
      )}
    </StaffWorkspaceShell>
  );
}
