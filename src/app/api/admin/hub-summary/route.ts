import { getAdminHubSummary } from "@/lib/admin-hub-summary-service";
import { requireAdminApiActor } from "@/lib/require-admin-api";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await requireAdminApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const summary = await getAdminHubSummary(authResult.actor);

  return NextResponse.json(summary);
}
