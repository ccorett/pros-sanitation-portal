import { createPolicy, listPoliciesForAdmin } from "@/lib/policy-service";
import { requireAdminApiActor } from "@/lib/require-admin-api";
import { NextRequest, NextResponse } from "next/server";

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
    version?: string;
    effectiveDate?: string;
  };

  if (!body.title?.trim() || !body.body?.trim() || !body.version?.trim()) {
    return NextResponse.json(
      { error: "title, body, and version are required." },
      { status: 400 },
    );
  }

  if (!body.effectiveDate?.trim()) {
    return NextResponse.json(
      { error: "effectiveDate is required." },
      { status: 400 },
    );
  }

  try {
    const policy = await createPolicy({
      title: body.title,
      body: body.body,
      version: body.version,
      effectiveDate: body.effectiveDate,
    });
    return NextResponse.json({ policy }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create policy.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
