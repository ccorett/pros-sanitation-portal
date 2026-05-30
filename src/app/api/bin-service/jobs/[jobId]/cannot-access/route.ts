import { requireBinApiAccess } from "@/lib/bin-service/api-auth";
import { markBinJobCannotAccess } from "@/lib/bin-service/service";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const access = await requireBinApiAccess();
  if ("error" in access) return access.error;

  const { jobId } = await context.params;
  const body = (await request.json()) as { reason?: string };

  if (!body.reason?.trim()) {
    return NextResponse.json({ error: "A reason is required." }, { status: 400 });
  }

  try {
    const job = await markBinJobCannotAccess({
      jobId,
      technicianId: access.employee.id,
      reason: body.reason.trim(),
    });

    return NextResponse.json({ job });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save cannot access.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
