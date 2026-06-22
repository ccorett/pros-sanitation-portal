import { requireBinFieldApiAccess } from "@/lib/bin-service/api-auth";
import { listBinFieldJobsToday } from "@/lib/bin-service/field-service";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const access = await requireBinFieldApiAccess(request);
  if ("error" in access) return access.error;

  const jobs = await listBinFieldJobsToday(access.employee);

  return NextResponse.json({ jobs });
}
