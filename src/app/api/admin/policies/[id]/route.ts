import { deletePolicy, updatePolicy } from "@/lib/policy-service";
import { requireAdminApiActor } from "@/lib/require-admin-api";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const authResult = await requireAdminApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    title?: string;
    body?: string;
    version?: string;
    effectiveDate?: string;
  };

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
    await deletePolicy(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Policy not found." }, { status: 404 });
  }
}
