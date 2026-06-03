import { listPurchasingListItems } from "@/lib/inventory-service";
import { requireAdminApiActor } from "@/lib/require-admin-api";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await requireAdminApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const items = await listPurchasingListItems();

  return NextResponse.json({ items });
}
