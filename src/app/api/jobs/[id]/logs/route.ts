import { requireCleaningJobAccess } from "@/lib/cleaning-jobs-api";
import { listJobServiceLogsForJob } from "@/lib/cleaning-jobs-service";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const access = await requireCleaningJobAccess(id);

  if ("error" in access) {
    return access.error;
  }

  const logs = await listJobServiceLogsForJob(id);

  return NextResponse.json({ logs });
}
