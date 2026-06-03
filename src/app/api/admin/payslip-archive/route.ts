import {
  createPayslipArchive,
  findEmployeeForAdminPayslipUpload,
  listAllPayslipsForAdmin,
} from "@/lib/payslip-archive-service";
import { requireAdminApiActor } from "@/lib/require-admin-api";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const authResult = await requireAdminApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const payslips = await listAllPayslipsForAdmin();
  return NextResponse.json({ payslips });
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdminApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const body = (await request.json()) as {
    employeePublicId?: string;
    payPeriod?: string;
    fileName?: string;
    fileUrl?: string;
  };

  if (!body.employeePublicId?.trim()) {
    return NextResponse.json(
      { error: "employeePublicId is required." },
      { status: 400 },
    );
  }

  if (!body.payPeriod?.trim() || !body.fileName?.trim() || !body.fileUrl?.trim()) {
    return NextResponse.json(
      { error: "payPeriod, fileName, and fileUrl are required." },
      { status: 400 },
    );
  }

  const employee = await findEmployeeForAdminPayslipUpload(body.employeePublicId);

  if (!employee) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  const uploadedBy = `${authResult.actor.firstName} ${authResult.actor.lastName}`.trim();

  try {
    const payslip = await createPayslipArchive({
      employeeId: employee.id,
      payPeriod: body.payPeriod,
      fileName: body.fileName,
      fileUrl: body.fileUrl,
      uploadedBy,
    });

    return NextResponse.json({ payslip }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create payslip record.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
