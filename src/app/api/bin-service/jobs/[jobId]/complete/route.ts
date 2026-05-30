import { requireBinApiAccess } from "@/lib/bin-service/api-auth";
import { completeBinServiceJob } from "@/lib/bin-service/service";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const access = await requireBinApiAccess();
  if ("error" in access) return access.error;

  const { jobId } = await context.params;
  const body = (await request.json()) as {
    regularBinsServiced?: number;
    newBinsServiced?: number;
    linersUsed?: number;
    clientSignatureName?: string;
    noSignatureReason?: string;
  };

  try {
    const setup = await completeBinServiceJob({
      jobId,
      technicianId: access.employee.id,
      regularBinsServiced: Math.max(0, Number(body.regularBinsServiced ?? 0)),
      newBinsServiced: Math.max(0, Number(body.newBinsServiced ?? 0)),
      linersUsed: Math.max(0, Number(body.linersUsed ?? 0)),
      clientSignatureName: body.clientSignatureName?.trim() || null,
      noSignatureReason: body.noSignatureReason?.trim() || null,
    });

    return NextResponse.json({ setup });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to complete job.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
