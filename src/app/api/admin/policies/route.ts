import { createPolicy, listPoliciesForAdmin } from "@/lib/policy-service";
import { requireAdminApiActor } from "@/lib/require-admin-api";
import type { PolicyStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const VALID_STATUSES: PolicyStatus[] = ["ACTIVE", "DRAFT", "ARCHIVED"];

export async function GET() {
  const authResult = await requireAdminApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const policies = await listPoliciesForAdmin();
  return NextResponse.json({ policies });
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdminApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const body = (await request.json()) as {
    title?: string;
    body?: string;
    category?: string;
    status?: PolicyStatus;
    effectiveDate?: string;
  };

  if (!body.title?.trim() || !body.body?.trim() || !body.category?.trim()) {
    return NextResponse.json(
      { error: "title, body, and category are required." },
      { status: 400 },
    );
  }

  if (!body.effectiveDate?.trim()) {
    return NextResponse.json(
      { error: "effectiveDate is required." },
      { status: 400 },
    );
  }

  const status = body.status ?? "ACTIVE";
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: "status must be Active, Draft, or Archived." },
      { status: 400 },
    );
  }

  try {
    const policy = await createPolicy({
      title: body.title,
      body: body.body,
      category: body.category,
      status,
      effectiveDate: body.effectiveDate,
    });
    return NextResponse.json({ policy }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create policy.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
