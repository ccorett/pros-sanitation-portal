import { requireBinApiAccess } from "@/lib/bin-service/api-auth";
import {
  enrichJobWithStatus,
  listTechnicianBinJobs,
} from "@/lib/bin-service/service";
import { NextResponse } from "next/server";

export async function GET() {
  const access = await requireBinApiAccess();
  if ("error" in access) return access.error;

  const jobs = await listTechnicianBinJobs(access.employee.id);

  return NextResponse.json({
    jobs: jobs.map((job) => {
      const enriched = enrichJobWithStatus(job);
      return {
        ...enriched.job,
        rotation: enriched.rotation,
      };
    }),
  });
}
