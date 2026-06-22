import { requireBinFieldApiAccess } from "@/lib/bin-service/api-auth";
import type { BinFieldServiceStatus } from "@/lib/bin-service/field-types";
import { applyBinFieldServiceUpdate } from "@/lib/bin-service/field-service";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ siteId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const access = await requireBinFieldApiAccess(request, "bin-service/sites/service-update");
  if ("error" in access) return access.error;

  const { siteId } = await context.params;
  const body = (await request.json()) as {
    serviceStatus?: BinFieldServiceStatus;
    regularBinsServiced?: number;
    newBinsServiced?: number;
    linersUsed?: number;
    serviceNotes?: string;
    cannotAccessReason?: string;
    issueType?: string;
    issueNotes?: string;
    clientSignatureName?: string;
    noSignatureReason?: string;
  };

  if (
    body.serviceStatus !== "completed" &&
    body.serviceStatus !== "cannot_access" &&
    body.serviceStatus !== "issue_reported"
  ) {
    return NextResponse.json({ error: "Invalid service status." }, { status: 400 });
  }

  try {
    await applyBinFieldServiceUpdate({
      siteId,
      actor: access.employee,
      serviceStatus: body.serviceStatus,
      regularBinsServiced: Math.max(0, Number(body.regularBinsServiced ?? 0)),
      newBinsServiced: Math.max(0, Number(body.newBinsServiced ?? 0)),
      linersUsed: Math.max(0, Number(body.linersUsed ?? 0)),
      serviceNotes: body.serviceNotes,
      cannotAccessReason: body.cannotAccessReason,
      issueType: body.issueType,
      issueNotes: body.issueNotes,
      clientSignatureName: body.clientSignatureName,
      noSignatureReason: body.noSignatureReason,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save service update.";
    const status = message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
