import { acknowledgePolicy } from "@/lib/policy-service";
import { requirePortalStaffActor } from "@/lib/require-portal-staff-api";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const authResult = await requirePortalStaffActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;

  try {
    const policy = await acknowledgePolicy(authResult.actor.id, id);
    return NextResponse.json({ policy });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to acknowledge policy.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
