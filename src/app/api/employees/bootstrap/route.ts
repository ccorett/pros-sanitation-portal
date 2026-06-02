import { auth } from "@/lib/auth";
import { createEmployeeWithAllocatedId } from "@/lib/employee-id";
import {
  isEmployeeDepartment,
  isEmployeeLocationAssignment,
  isEmployeePosition,
} from "@/lib/employee-signup-options";
import { prisma } from "@/lib/prisma";
import { validateEmployeeSignup } from "@/lib/signup-access";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type BootstrapBody = {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  jobTitle?: string;
  position?: string;
  department?: string;
  locationAssignment?: string;
  inviteCode?: string;
};

function buildMockEmployee(
  userId: string,
  body: Required<
    Pick<
      BootstrapBody,
      | "firstName"
      | "lastName"
      | "phoneNumber"
      | "jobTitle"
      | "position"
      | "department"
      | "locationAssignment"
    >
  >,
  companyEmail: string,
) {
  return {
    id: `mock-${userId}`,
    userId,
    employeeId: "PS-EMP-MOCK",
    firstName: body.firstName,
    lastName: body.lastName,
    companyEmail,
    phoneNumber: body.phoneNumber,
    department: body.department,
    jobTitle: body.jobTitle,
    position: body.position,
    locationAssignment: body.locationAssignment,
    employmentStatus: "ACTIVE",
    accessLevel: "PENDING_VERIFICATION",
    accountStatus: "PENDING",
    mock: true,
  };
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

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

  if (!body.jobTitle?.trim()) {
    return NextResponse.json({ error: "Job title is required." }, { status: 400 });
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

    return NextResponse.json({
      employee,
      userId: session.user.id,
    });
  } catch (error) {
    const missingOptionalColumns =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2022" || error.message.includes("position"));

    if (missingOptionalColumns) {
      try {
        const employee = await createEmployeeWithAllocatedId({
          userId: session.user.id,
          firstName: profileInput.firstName,
          lastName: profileInput.lastName,
          companyEmail,
          phoneNumber: profileInput.phoneNumber,
          jobTitle: profileInput.jobTitle,
          department: profileInput.department,
        });

        return NextResponse.json({
          employee,
          userId: session.user.id,
          profileStoredLocally: true,
        });
      } catch {
        // fall through to mock response
      }
    }

    console.error("[employees/bootstrap]", error);

    return NextResponse.json({
      employee: buildMockEmployee(session.user.id, profileInput, companyEmail),
      userId: session.user.id,
      profileMock: true,
    });
  }
}
