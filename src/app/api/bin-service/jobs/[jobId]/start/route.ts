import { requireBinApiAccess } from "@/lib/bin-service/api-auth";
import { binJobInclude } from "@/lib/bin-service/service";
import { prisma } from "@/lib/prisma";
import { BinServiceJobStatus } from "@prisma/client";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const access = await requireBinApiAccess();
  if ("error" in access) return access.error;

  const { jobId } = await context.params;

  const job = await prisma.binServiceJob.findUnique({
    where: { id: jobId },
    include: binJobInclude,
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  if (job.assignedTechnicianId !== access.employee.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
