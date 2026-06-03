import { updateInventoryItem } from "@/lib/inventory-service";
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
    availableQuantity?: number;
    reorderLevel?: number;
    storageArea?: string;
    supplier?: string | null;
    isActive?: boolean;
  };

  const editor =
    authResult.session.user.name?.trim() ||
    authResult.session.user.email?.split("@")[0] ||
    "Admin User";

  try {
    const item = await updateInventoryItem(id, {
      availableQuantity: body.availableQuantity,
      reorderLevel: body.reorderLevel,
      storageArea: body.storageArea,
      supplier: body.supplier,
      isActive: body.isActive,
      editedBy: editor,
    });

    return NextResponse.json({ item });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update inventory item.";
    const status = message === "Inventory item not found." ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
