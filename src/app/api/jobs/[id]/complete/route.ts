import { requireCleaningJobAction } from "@/lib/cleaning-jobs-api";
import { completeCleaningJob } from "@/lib/cleaning-jobs-service";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const access = await requireCleaningJobAction(id);

  if ("error" in access) {
    return access.error;
  }

  try {
    const job = await completeCleaningJob(id, access.actor);
    return NextResponse.json({ job });
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Unable to complete job.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
