import { confirmInventoryCsvImport } from "@/lib/inventory-import-service";
import { requireManagerApiActor } from "@/lib/require-manager-api";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const authResult = await requireManagerApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A CSV file is required." }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".csv")) {
    return NextResponse.json(
      { error: "Only .csv files are supported for inventory import." },
      { status: 400 },
    );
  }

  try {
    const csvContent = await file.text();
    const actorName =
      `${authResult.actor.firstName} ${authResult.actor.lastName}`.trim();
    const result = await confirmInventoryCsvImport({
      csvContent,
      fileName: file.name,
      importedById: authResult.actor.id,
      importedByName: actorName,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to import inventory CSV.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
