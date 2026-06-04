import {
  canAccessHrOrganisation,
  getHrOrganisationForActor,
} from "@/lib/hr-organisation-service";
import { requirePortalStaffActor } from "@/lib/require-portal-staff-api";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await requirePortalStaffActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  if (!canAccessHrOrganisation(authResult.actor)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const organisation = await getHrOrganisationForActor(authResult.actor);
    return NextResponse.json(organisation);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load organisation view.";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
