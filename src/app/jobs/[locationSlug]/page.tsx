import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { canAccessCleaningLocation } from "@/lib/employee-job-assignments";
import {
  getClientLocationBySlug,
  serviceTypeBadgeClass,
} from "@/lib/jobs-mock-data";
import { toEmployeeAccessContext } from "@/lib/portal-route-access";
import { requireStaffAccess } from "@/lib/require-staff-access";
import {
  ArrowLeft,
  ClipboardList,
  FileText,
  ListChecks,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type LocationJobsPageProps = {
  params: Promise<{ locationSlug: string }>;
};

export default async function LocationJobsPage({ params }: LocationJobsPageProps) {
  const { employee } = await requireStaffAccess({ pathname: "/jobs" });
  const accessContext = toEmployeeAccessContext(employee);

  const { locationSlug } = await params;
  const location = getClientLocationBySlug(locationSlug);

  if (!location) {
    notFound();
  }

  if (!canAccessCleaningLocation(accessContext, locationSlug)) {
    redirect("/staff-dashboard");
  }

  return (
    <StaffWorkspaceShell
      sectionLabel="Job Management"
      title={location.name}
      subtitle={`${location.serviceType} · ${location.status} client location`}
      accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      <div className="mb-6">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#00c6ff] transition-colors hover:text-[#6cc801] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00c6ff] rounded"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Locations
        </Link>
      </div>

      <div className="glass-card mb-6 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00c6ff]/15 text-[#00c6ff]">
            <MapPin className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#00c6ff]">Client Location</p>
            <h2 className="mt-1 text-xl font-bold text-[#ebfbff]">{location.name}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${serviceTypeBadgeClass(location.serviceType)}`}
              >
                {location.serviceType}
              </span>
              <span className="inline-flex rounded-full border border-[#6cc801]/35 bg-[#6cc801]/15 px-3 py-1 text-xs font-semibold text-[#6cc801]">
                {location.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="glass-card rounded-2xl p-5 sm:p-6 lg:col-span-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#259f00]/20 text-[#6cc801]">
              <ClipboardList className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-bold text-[#ebfbff]">Assigned Jobs</h3>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-[#ebfbff]/55">
            Assigned service jobs for this location will appear here. Routes,
            schedules, and job status updates are coming in a future release.
          </p>
          <p className="mt-4 text-xs font-medium text-[#6cc801]">Coming soon</p>
        </section>

        <div className="space-y-4">
          <section className="glass-card rounded-2xl p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00c6ff]/15 text-[#00c6ff]">
                <ListChecks className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold text-[#ebfbff]">Checklist</h3>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[#ebfbff]/55">
              Field checklist items for this visit will be listed here.
            </p>
            <p className="mt-4 text-xs font-medium text-[#6cc801]">Coming soon</p>
          </section>

          <section className="glass-card rounded-2xl p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00c6ff]/15 text-[#00c6ff]">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold text-[#ebfbff]">Completion Notes</h3>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[#ebfbff]/55">
              Notes and completion details for this location will be captured
              here after jobs are assigned.
            </p>
            <p className="mt-4 text-xs font-medium text-[#6cc801]">Coming soon</p>
          </section>
        </div>
      </div>
    </StaffWorkspaceShell>
  );
}
