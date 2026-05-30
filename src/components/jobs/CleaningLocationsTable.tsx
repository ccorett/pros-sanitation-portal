import {
  clientLocations,
  formatLocationDate,
  serviceTypeBadgeClass,
} from "@/lib/jobs-mock-data";
import Link from "next/link";

export function CleaningLocationsTable() {
  return (
    <div className="glass-card overflow-x-auto rounded-2xl">
      <table className="min-w-[1100px] w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
            <th className="px-4 py-4 font-semibold sm:px-6">Location Name</th>
            <th className="px-4 py-4 font-semibold">Service Type</th>
            <th className="px-4 py-4 font-semibold">Area</th>
            <th className="px-4 py-4 font-semibold">Assigned Technician</th>
            <th className="px-4 py-4 font-semibold">Service Day</th>
            <th className="px-4 py-4 font-semibold">Status</th>
            <th className="px-4 py-4 font-semibold">Last Service Date</th>
            <th className="px-4 py-4 font-semibold">Next Service Date</th>
            <th className="px-4 py-4 font-semibold sm:px-6">Action</th>
          </tr>
        </thead>
        <tbody>
          {clientLocations.map((location) => (
            <tr
              key={location.slug}
              className="border-b border-[#ebfbff]/5 last:border-b-0 hover:bg-[#ebfbff]/[0.03]"
            >
              <td className="px-4 py-4 font-medium text-[#ebfbff] sm:px-6">
                {location.name}
              </td>
              <td className="px-4 py-4">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${serviceTypeBadgeClass(location.serviceType)}`}
                >
                  {location.serviceType}
                </span>
              </td>
              <td className="px-4 py-4 text-[#ebfbff]/70">{location.area}</td>
              <td className="px-4 py-4 text-[#ebfbff]/70">
                {location.assignedTechnician}
              </td>
              <td className="px-4 py-4 text-[#ebfbff]/70">{location.serviceDay}</td>
              <td className="px-4 py-4">
                <span className="inline-flex rounded-full border border-[#6cc801]/35 bg-[#6cc801]/15 px-3 py-1 text-xs font-semibold text-[#6cc801]">
                  {location.status}
                </span>
              </td>
              <td className="px-4 py-4 text-[#ebfbff]/70">
                {formatLocationDate(location.lastServiceDate)}
              </td>
              <td className="px-4 py-4 text-[#ebfbff]/70">
                {formatLocationDate(location.nextServiceDate)}
              </td>
              <td className="px-4 py-4 sm:px-6">
                <Link
                  href={`/jobs/${location.slug}`}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-4 py-2 text-sm font-semibold text-[#ebfbff] transition-colors hover:bg-[#00c6ff]/20"
                >
                  View Jobs
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
