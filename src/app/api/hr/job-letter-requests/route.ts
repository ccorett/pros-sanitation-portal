import {
  createJobLetterRequest,
  listJobLetterRequestsForActor,
} from "@/lib/job-letter-request-service";
import { requirePortalStaffActor } from "@/lib/require-portal-staff-api";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const authResult = await requirePortalStaffActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const requests = await listJobLetterRequestsForActor(authResult.actor);

  return NextResponse.json({ requests });
}

export async function POST(request: NextRequest) {
  const authResult = await requirePortalStaffActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const body = (await request.json()) as {
    letterType?: string;
    notes?: string;
  };

  if (!body.letterType) {
    return NextResponse.json(
      { error: "letterType is required." },
      { status: 400 },
    );
  }

  try {
    const created = await createJobLetterRequest({
      letterType: body.letterType,
      notes: body.notes,
      requester: authResult.actor,
    });

    return NextResponse.json({ request: created }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create job letter request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
