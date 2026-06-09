import { confirmBinLocationCsvImport } from "@/lib/bin-location-import-service";
import { requireAdminApiActor } from "@/lib/require-admin-api";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const authResult = await requireAdminApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A CSV file is required." }, { status: 400 });
  }

  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith(".csv")) {
    return NextResponse.json(
      {
        error:
          "Only .csv files are supported. Save your Excel sheet as CSV before uploading.",
      },
      { status: 400 },
    );
  }

  try {
    const csvContent = await file.text();
    const actorName =
      `${authResult.actor.firstName} ${authResult.actor.lastName}`.trim();
    const result = await confirmBinLocationCsvImport({
      csvContent,
      fileName: file.name,
      importedById: authResult.actor.id,
      importedByName: actorName,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to import bin locations.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
