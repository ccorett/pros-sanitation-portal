import { getPayslipForEmployee } from "@/lib/payslip-archive-service";
import { requirePortalStaffActor } from "@/lib/require-portal-staff-api";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requirePortalStaffActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;
  const payslip = await getPayslipForEmployee(id, authResult.actor.id);

  if (!payslip) {
    return NextResponse.json({ error: "Payslip not found." }, { status: 404 });
  }

  return NextResponse.redirect(payslip.fileUrl);
}
