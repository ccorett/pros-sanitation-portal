import { requireBinApiAccess } from "@/lib/bin-service/api-auth";
import { listActiveTechnicians } from "@/lib/bin-service/service";
import { NextResponse } from "next/server";

export async function GET() {
  const access = await requireBinApiAccess();
  if ("error" in access) return access.error;

  const technicians = await listActiveTechnicians();
  return NextResponse.json({ technicians });
}
