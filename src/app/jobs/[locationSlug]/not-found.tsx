import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import Link from "next/link";

export default function LocationJobsNotFound() {
  return (
    <StaffWorkspaceShell
      sectionLabel="Job Management"
      title="Location Not Found"
      subtitle="This client location could not be found."
    >
      <div className="glass-card rounded-2xl p-6 text-center sm:p-8">
        <p className="text-sm text-[#ebfbff]/60">
          The location you requested does not exist or is no longer available.
        </p>
        <Link
          href="/jobs"
          className="mt-6 inline-block text-sm font-medium text-[#00c6ff] hover:text-[#6cc801]"
        >
          Back to Locations
        </Link>
      </div>
    </StaffWorkspaceShell>
  );
}
