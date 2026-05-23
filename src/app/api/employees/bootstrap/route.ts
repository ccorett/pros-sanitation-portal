import { auth } from "@/lib/auth";
import { createEmployeeWithAllocatedId } from "@/lib/employee-id";
import { prisma } from "@/lib/prisma";
import { validateEmployeeSignup } from "@/lib/signup-access";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as {
    firstName?: string;
    lastName?: string;
  };

  if (!body.firstName?.trim() || !body.lastName?.trim()) {
    return NextResponse.json(
      { error: "First name and last name are required." },
      { status: 400 },
    );
  }

  const firstName = body.firstName.trim();
  const lastName = body.lastName.trim();
  const companyEmail = session.user.email;

  const signupCheck = validateEmployeeSignup({});
  if (!signupCheck.ok) {
    return NextResponse.json({ error: signupCheck.message }, { status: 403 });
  }

  const existing = await prisma.employee.findUnique({
    where: { userId: session.user.id },
  });

  if (existing) {
    return NextResponse.json({ employee: existing });
  }

  try {
    const employee = await createEmployeeWithAllocatedId({
      userId: session.user.id,
      firstName,
      lastName,
      companyEmail,
    });

    return NextResponse.json({ employee });
  } catch {
    return NextResponse.json(
      { error: "Unable to create employee profile. Please try again." },
      { status: 500 },
    );
  }
}
