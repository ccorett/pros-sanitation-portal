import { softRemoveBinServiceSite } from "@/lib/bin-service/service";
import { requireAdminApiActor } from "@/lib/require-admin-api";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ siteId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireAdminApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { siteId } = await context.params;
  const actorName =
    `${authResult.actor.firstName} ${authResult.actor.lastName}`.trim();

  try {
    await softRemoveBinServiceSite(siteId, actorName);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to remove bin location.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
