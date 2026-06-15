import { getAdminHubSummary } from "@/lib/admin-hub-summary-service";
import { requireInvoiceApiActor } from "@/lib/require-invoice-api";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await requireInvoiceApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const summary = await getAdminHubSummary(authResult.actor);

  return NextResponse.json(summary);
}
