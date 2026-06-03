import { reviewPayslipRequest } from "@/lib/payslip-request-service";
import { requireManagerApiActor } from "@/lib/require-manager-api";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const authResult = await requireManagerApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    status?: "APPROVED" | "REJECTED";
    decisionNotes?: string;
  };

  if (body.status !== "APPROVED" && body.status !== "REJECTED") {
    return NextResponse.json(
      { error: "status must be APPROVED or REJECTED." },
      { status: 400 },
    );
  }

  try {
    const updated = await reviewPayslipRequest({
      requestId: id,
      status: body.status,
      decisionNotes: body.decisionNotes,
      reviewer: authResult.actor,
    });

    return NextResponse.json({ request: updated });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to update payslip request.";
    const statusCode = message === "Payslip request not found." ? 404 : 400;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
