import {
  createPayslipRequest,
  listPayslipRequestsForActor,
} from "@/lib/payslip-request-service";
import { requirePortalStaffActor } from "@/lib/require-portal-staff-api";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const authResult = await requirePortalStaffActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const requests = await listPayslipRequestsForActor(authResult.actor);

  return NextResponse.json({ requests });
}

export async function POST(request: NextRequest) {
  const authResult = await requirePortalStaffActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const body = (await request.json()) as {
    payPeriod?: string;
    notes?: string;
  };

  if (!body.payPeriod) {
    return NextResponse.json(
      { error: "payPeriod is required." },
      { status: 400 },
    );
  }

  try {
    const created = await createPayslipRequest({
      payPeriod: body.payPeriod,
      notes: body.notes,
      requester: authResult.actor,
    });

    return NextResponse.json({ request: created }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create payslip request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
