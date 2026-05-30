import { auth } from "@/lib/auth";
import { getEmployeePortalAccess } from "@/lib/employee-portal-access";
import { buildMockPayslipPdf } from "@/lib/hr-mock-pdf";
import { mockPayslips } from "@/lib/hr-mock-data";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await getEmployeePortalAccess(session.user.id);
  if (!access.allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const payslip = mockPayslips.find((item) => item.id === id);

  if (!payslip) {
    return NextResponse.json({ error: "Payslip not found." }, { status: 404 });
  }

  const employeeName = `${access.employee.firstName} ${access.employee.lastName}`.trim();
  const pdf = buildMockPayslipPdf(payslip, employeeName);
  const url = new URL(request.url);
  const forceDownload = url.searchParams.get("download") === "1";

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${forceDownload ? "attachment" : "inline"}; filename="${payslip.fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
