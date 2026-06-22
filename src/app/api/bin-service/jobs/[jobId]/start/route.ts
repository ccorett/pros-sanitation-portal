import { requireBinFieldApiAccess } from "@/lib/bin-service/api-auth";
import { assertBinJobAccess } from "@/lib/bin-service/field-service";
import { binJobInclude } from "@/lib/bin-service/service";
import { prisma } from "@/lib/prisma";
import { BinServiceJobStatus } from "@prisma/client";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const access = await requireBinFieldApiAccess(request, "bin-service/jobs/start");
  if ("error" in access) return access.error;

  const { jobId } = await context.params;

  let job;
  try {
    await assertBinJobAccess(jobId, access.employee);
    job = await prisma.binServiceJob.findUnique({
      where: { id: jobId },
      include: binJobInclude,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forbidden";
    const status = message === "Job not found." ? 404 : 403;
    return NextResponse.json({ error: message }, { status });
  }

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  if (
    job.status !== BinServiceJobStatus.SCHEDULED &&
    job.status !== BinServiceJobStatus.IN_PROGRESS
  ) {
    return NextResponse.json(
      { error: "This job cannot be started in its current state." },
      { status: 400 },
    );
  }

  const updated = await prisma.binServiceJob.update({
    where: { id: jobId },
    data: {
      status: BinServiceJobStatus.IN_PROGRESS,
      startedAt: job.startedAt ?? new Date(),
    },
    include: binJobInclude,
  });

  return NextResponse.json({ job: updated });
}
