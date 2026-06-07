import { archivePolicy, updatePolicy } from "@/lib/policy-service";
import { requireAdminApiActor } from "@/lib/require-admin-api";
import type { PolicyStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const VALID_STATUSES: PolicyStatus[] = ["ACTIVE", "DRAFT", "ARCHIVED"];

export async function PATCH(request: NextRequest, context: RouteContext) {
  const authResult = await requireAdminApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    title?: string;
    body?: string;
    category?: string;
    status?: PolicyStatus;
    effectiveDate?: string;
  };

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json(
      { error: "status must be Active, Draft, or Archived." },
      { status: 400 },
    );
  }

  try {
    const policy = await updatePolicy(id, body);
    return NextResponse.json({ policy });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update policy.";
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
    const policy = await archivePolicy(id);
    return NextResponse.json({ policy });
  } catch {
    return NextResponse.json({ error: "Policy not found." }, { status: 404 });
  }
}
