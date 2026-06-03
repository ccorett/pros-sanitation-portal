import {
  excludeFromPurchasingList,
  markPurchasingOrdered,
} from "@/lib/inventory-service";
import { requireAdminApiActor } from "@/lib/require-admin-api";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdminApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await params;
  const body = (await request.json()) as {
    action?: "MARK_ORDERED" | "EXCLUDE_FROM_LIST";
  };

  const editor =
    authResult.session.user.name?.trim() ||
    authResult.session.user.email?.split("@")[0] ||
    "Admin User";

  try {
    if (body.action === "MARK_ORDERED") {
      const item = await markPurchasingOrdered(id, editor);
      return NextResponse.json({ item });
    }

    if (body.action === "EXCLUDE_FROM_LIST") {
      const item = await excludeFromPurchasingList(id, editor);
      return NextResponse.json({ item });
    }

    return NextResponse.json(
      { error: "action must be MARK_ORDERED or EXCLUDE_FROM_LIST." },
      { status: 400 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update purchasing list.";
    const status = message === "Inventory item not found." ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
