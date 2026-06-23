import { getAdminHubSummary } from "@/lib/admin-hub-summary-service";
import { requireAdminHubApiActor } from "@/lib/require-admin-api";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await requireAdminHubApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    const summary = await getAdminHubSummary(authResult.actor);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("[hub-summary]", error);
    return NextResponse.json(
      { error: "Unable to load admin hub summary." },
      { status: 500 },
    );
  }
}
