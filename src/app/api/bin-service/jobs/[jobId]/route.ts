import { requireBinFieldApiAccess } from "@/lib/bin-service/api-auth";
import { getBinFieldJobDetail } from "@/lib/bin-service/field-service";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const access = await requireBinFieldApiAccess(request, "bin-service/jobs/detail");
  if ("error" in access) return access.error;

  const { jobId } = await context.params;
  const job = await getBinFieldJobDetail(jobId, access.employee);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  return NextResponse.json({ job });
}
