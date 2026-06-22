import {
  buildEmployeeProfileDto,
  updateEmployeeProfile,
} from "@/lib/employee-profile-service";
import { getEmployeePortalAccess } from "@/lib/employee-portal-access";
import {
  resolveAuthenticatedSession,
  sessionExpiredApiResponse,
  unauthorizedApiResponse,
} from "@/lib/require-authenticated-session";
import { NextRequest, NextResponse } from "next/server";

const PROFILE_NOT_FOUND_MESSAGE =
  "Employee profile not found. Contact admin.";

export async function GET() {
  const authResult = await resolveAuthenticatedSession();

  if (authResult.status === "unauthenticated") {
    return unauthorizedApiResponse();
  }

  if (authResult.status === "expired") {
    return sessionExpiredApiResponse();
  }

  const { session } = authResult;
  const access = await getEmployeePortalAccess(session.user.id);

  if (!access.allowed) {
    return NextResponse.json(
      { error: access.message ?? PROFILE_NOT_FOUND_MESSAGE },
      { status: access.code === "no-profile" ? 404 : 403 },
    );
  }

  return NextResponse.json({
    profile: await buildEmployeeProfileDto(access.employee),
    pendingVerification: access.pendingVerification,
  });
}

export async function PATCH(request: NextRequest) {
  const authResult = await resolveAuthenticatedSession({ touch: true });

  if (authResult.status === "unauthenticated") {
    return unauthorizedApiResponse();
  }

  if (authResult.status === "expired") {
    return sessionExpiredApiResponse();
  }

  const { session } = authResult;
  const access = await getEmployeePortalAccess(session.user.id);

  if (!access.allowed) {
    return NextResponse.json(
      { error: access.message ?? PROFILE_NOT_FOUND_MESSAGE },
      { status: access.code === "no-profile" ? 404 : 403 },
    );
  }

  if (access.pendingVerification) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json()) as {
    phoneNumber?: string;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    profilePictureUrl?: string | null;
  };

  try {
    const profile = await updateEmployeeProfile(access.employee.id, {
      phoneNumber: body.phoneNumber,
      emergencyContactName: body.emergencyContactName,
      emergencyContactPhone: body.emergencyContactPhone,
      profilePictureUrl: body.profilePictureUrl,
    });

    return NextResponse.json({ profile });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update profile.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
