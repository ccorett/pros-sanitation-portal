import { listInventoryEditHistory } from "@/lib/inventory-service";
import { requireAdminApiActor } from "@/lib/require-admin-api";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const authResult = await requireAdminApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await params;

  const history = await listInventoryEditHistory(id);

  return NextResponse.json({ history });
}
