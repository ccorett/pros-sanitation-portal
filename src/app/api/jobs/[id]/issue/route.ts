import { requireCleaningJobAction } from "@/lib/cleaning-jobs-api";
import { reportCleaningJobIssue } from "@/lib/cleaning-jobs-service";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const access = await requireCleaningJobAction(id);

  if ("error" in access) {
    return access.error;
  }

  const body = (await request.json()) as {
    issueNotes?: string;
    notes?: string | null;
  };

  if (!body.issueNotes?.trim()) {
    return NextResponse.json({ error: "issueNotes is required." }, { status: 400 });
  }

  try {
    const job = await reportCleaningJobIssue(id, access.actor, {
      issueNotes: body.issueNotes,
      notes: body.notes,
    });

    return NextResponse.json({ job });
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Unable to report issue.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
