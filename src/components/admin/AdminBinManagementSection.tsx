import { AdminBinRouteLocationsTable } from "@/components/admin/AdminBinRouteLocationsTable";
import { AddBinSiteForm } from "@/components/bin-service/AddBinSiteForm";
import {
  formatShortDate,
  formatServiceDayLabel,
  formatWeekPatternLabel,
} from "@/lib/bin-service/schedule";
import {
  enrichSiteWithStatus,
  listBinServiceSites,
} from "@/lib/bin-service/service";
import { getRotationStatusStyles } from "@/lib/bin-service/status";
import Link from "next/link";

export async function AdminBinManagementSection() {
  const sites = await listBinServiceSites();
  const enriched = sites.map((site) => enrichSiteWithStatus(site));

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[#ebfbff]">Bin Service Sites</h2>
        <p className="mt-1 text-sm text-[#ebfbff]/55">
          Add locations, edit setup, schedules, and expected bins. Technician updates
          appear in the route activity table below.
        </p>
      </div>

      <AddBinSiteForm />

      <AdminBinRouteLocationsTable />

      {enriched.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
          No bin service sites configured yet.
        </div>
      ) : (
        <div className="glass-card portal-table-scroll rounded-2xl">
          <table className="min-w-[1200px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
                <th className="px-4 py-4 font-semibold sm:px-6">Site Name</th>
                <th className="px-4 py-4 font-semibold">Client</th>
                <th className="px-4 py-4 font-semibold">Expected Bins</th>
                <th className="px-4 py-4 font-semibold">Schedule</th>
                <th className="px-4 py-4 font-semibold">Technician</th>
                <th className="px-4 py-4 font-semibold">Status</th>
                <th className="px-4 py-4 font-semibold">Next Service</th>
                <th className="px-4 py-4 font-semibold sm:px-6">Action</th>
              </tr>
            </thead>
            <tbody>
              {enriched.map(({ site, rotation, openJob }) => {
                const styles = getRotationStatusStyles(rotation.color);
                const setup = site.setup;

                return (
                  <tr
                    key={site.id}
                    className={`border-b border-[#ebfbff]/5 last:border-b-0 border-l-4 ${styles.border} hover:bg-[#ebfbff]/[0.03]`}
                  >
                    <td className="px-4 py-4 font-medium text-[#ebfbff] sm:px-6">
                      {site.name}
                    </td>
                    <td className="px-4 py-4 text-[#ebfbff]/70">{site.client.name}</td>
                    <td className="px-4 py-4 text-[#ebfbff]/70">
                      {setup
                        ? `${setup.expectedRegularBins} regular · ${setup.expectedNewBins} new`
                        : "Not configured"}
                    </td>
                    <td className="px-4 py-4 text-[#ebfbff]/70">
                      {setup
                        ? `${formatWeekPatternLabel(setup.weekPattern)} · ${formatServiceDayLabel(setup.serviceDay)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-4 text-[#ebfbff]/70">
                      {setup?.assignedTechnician
                        ? `${setup.assignedTechnician.firstName} ${setup.assignedTechnician.lastName}`
                        : "Unassigned"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles.badge}`}
                      >
                        {rotation.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[#ebfbff]/70">
                      {setup?.nextServiceDate
                        ? formatShortDate(setup.nextServiceDate)
                        : openJob
                          ? formatShortDate(openJob.scheduledDate)
                          : "—"}
                    </td>
                    <td className="px-4 py-4 sm:px-6">
                      <Link
                        href={`/jobs/bin-management/setup/${site.id}?from=admin`}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-4 py-2 text-sm font-semibold text-[#ebfbff] transition-colors hover:bg-[#00c6ff]/20"
                      >
                        Edit Bin Service Setup
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
