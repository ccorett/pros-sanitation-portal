import { listActiveInventoryItems } from "@/lib/inventory-service";
import { requireInventoryReadActor } from "@/lib/require-inventory-read-api";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await requireInventoryReadActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const items = await listActiveInventoryItems();

  return NextResponse.json({ items });
}
