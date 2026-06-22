import { createEmployeeWithAllocatedId } from "@/lib/employee-id";
import {
  isEmployeeDepartment,
  isEmployeeJobTitle,
  isEmployeeLocationAssignment,
  isEmployeePosition,
} from "@/lib/employee-signup-options";
import { updateEmployeeProfile } from "@/lib/employee-profile-service";
import { prisma } from "@/lib/prisma";
import {
  resolveAuthenticatedSession,
  sessionExpiredApiResponse,
  unauthorizedApiResponse,
} from "@/lib/require-authenticated-session";
import { validateEmployeeSignup } from "@/lib/signup-access";
import { NextRequest, NextResponse } from "next/server";

const PROFILE_NOT_FOUND_MESSAGE =
  "Employee profile not found. Contact admin.";

type BootstrapBody = {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  jobTitle?: string;
  position?: string;
  department?: string;
  locationAssignment?: string;
  inviteCode?: string;
  profilePictureUrl?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
};

export async function POST(request: NextRequest) {
  const authResult = await resolveAuthenticatedSession({ touch: true });

  if (authResult.status === "unauthenticated") {
    return unauthorizedApiResponse();
  }

  if (authResult.status === "expired") {
    return sessionExpiredApiResponse();
  }

  const { session } = authResult;

  const body = (await request.json()) as BootstrapBody;

  if (!body.firstName?.trim() || !body.lastName?.trim()) {
    return NextResponse.json(
      { error: "First name and last name are required." },
      { status: 400 },
    );
  }

  if (!body.phoneNumber?.trim()) {
    return NextResponse.json(
      { error: "Phone number is required." },
      { status: 400 },
    );
  }

  if (!body.jobTitle?.trim() || !isEmployeeJobTitle(body.jobTitle.trim())) {
    return NextResponse.json(
      { error: "Select a valid job title." },
      { status: 400 },
    );
  }

  if (!body.position?.trim() || !isEmployeePosition(body.position.trim())) {
    return NextResponse.json(
      { error: "Select a valid position." },
      { status: 400 },
    );
  }

  if (!body.department?.trim() || !isEmployeeDepartment(body.department.trim())) {
    return NextResponse.json(
      { error: "Select a valid department." },
      { status: 400 },
    );
  }

  if (
    !body.locationAssignment?.trim() ||
    !isEmployeeLocationAssignment(body.locationAssignment.trim())
  ) {
    return NextResponse.json(
      { error: "Select a valid location assignment." },
      { status: 400 },
    );
  }

  const profileInput = {
    firstName: body.firstName.trim(),
    lastName: body.lastName.trim(),
    phoneNumber: body.phoneNumber.trim(),
    jobTitle: body.jobTitle.trim(),
    position: body.position.trim(),
    department: body.department.trim(),
    locationAssignment: body.locationAssignment.trim(),
  };

  const companyEmail = session.user.email;

  const signupCheck = validateEmployeeSignup({
    inviteCode: body.inviteCode,
  });
  if (!signupCheck.ok) {
    return NextResponse.json({ error: signupCheck.message }, { status: 403 });
  }

  const existing = await prisma.employee.findUnique({
    where: { userId: session.user.id },
  });

  if (existing) {
    return NextResponse.json({
      employee: existing,
      userId: session.user.id,
    });
  }

  try {
    const employee = await createEmployeeWithAllocatedId({
      userId: session.user.id,
      firstName: profileInput.firstName,
      lastName: profileInput.lastName,
      companyEmail,
      phoneNumber: profileInput.phoneNumber,
      jobTitle: profileInput.jobTitle,
      position: profileInput.position,
      department: profileInput.department,
      locationAssignment: profileInput.locationAssignment,
    });

    const hasProfileExtras =
      body.profilePictureUrl ||
      body.emergencyContactName ||
      body.emergencyContactPhone;

    if (hasProfileExtras) {
      await updateEmployeeProfile(employee.id, {
        profilePictureUrl: body.profilePictureUrl ?? undefined,
        emergencyContactName: body.emergencyContactName,
        emergencyContactPhone: body.emergencyContactPhone,
      });
    }

    const finalEmployee = await prisma.employee.findUniqueOrThrow({
      where: { id: employee.id },
    });

    return NextResponse.json({
      employee: finalEmployee,
      userId: session.user.id,
    });
  } catch (error) {
    console.error("[employees/bootstrap]", error);

    return NextResponse.json(
      { error: PROFILE_NOT_FOUND_MESSAGE },
      { status: 500 },
    );
  }
}
