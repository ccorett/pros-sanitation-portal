import { AccountStatus } from "@prisma/client";
import { resetLoginAttempts } from "@/lib/login-attempts";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;

  return header.slice("Bearer ".length) === secret;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as {
    email?: string;
    activateAccount?: boolean;
  };

  if (!body.email?.trim()) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  await resetLoginAttempts(email);

  let employeeUpdated = false;

  if (body.activateAccount) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { employee: true },
    });

    if (user?.employee) {
      await prisma.employee.update({
        where: { id: user.employee.id },
        data: { accountStatus: AccountStatus.ACTIVE },
      });
      employeeUpdated = true;
    }
  }

  return NextResponse.json({
    ok: true,
    email,
    loginAttemptsReset: true,
    employeeActivated: employeeUpdated,
  });
}
