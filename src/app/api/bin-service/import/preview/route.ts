import { previewBinLocationCsvImport } from "@/lib/bin-location-import-service";
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
    const preview = await previewBinLocationCsvImport(csvContent, file.name);
    return NextResponse.json({ preview });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to preview bin location import.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
