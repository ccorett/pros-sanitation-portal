import { requireBinApiAccess } from "@/lib/bin-service/api-auth";
import { reportBinJobIssue } from "@/lib/bin-service/service";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const access = await requireBinApiAccess();
  if ("error" in access) return access.error;

  const { jobId } = await context.params;
  const body = (await request.json()) as {
    issueType?: string;
    issueNotes?: string;
  };

  if (!body.issueType?.trim()) {
    return NextResponse.json({ error: "Issue type is required." }, { status: 400 });
  }

  try {
    const job = await reportBinJobIssue({
      jobId,
      technicianId: access.employee.id,
      issueType: body.issueType.trim(),
      issueNotes: body.issueNotes?.trim(),
    });

    return NextResponse.json({ job });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to report issue.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
