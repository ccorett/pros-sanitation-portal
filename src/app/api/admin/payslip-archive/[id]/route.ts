import {
  deletePayslipArchive,
  updatePayslipArchive,
} from "@/lib/payslip-archive-service";
import { requireAdminApiActor } from "@/lib/require-admin-api";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const authResult = await requireAdminApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    payPeriod?: string;
    fileName?: string;
    fileUrl?: string;
  };

  try {
    const payslip = await updatePayslipArchive(id, body);
    return NextResponse.json({ payslip });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update payslip record.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireAdminApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;

  try {
    await deletePayslipArchive(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Payslip not found." }, { status: 404 });
  }
}
