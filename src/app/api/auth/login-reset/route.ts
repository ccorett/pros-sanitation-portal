import { updateEmployeeLastLogin } from "@/lib/admin-accounts-service";
import { resetLoginAttempts } from "@/lib/login-attempts";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { email?: string };

  if (!body.email) {
    return NextResponse.json({ ok: true });
  }

  const email = body.email.trim().toLowerCase();
  await resetLoginAttempts(email);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (user) {
    await updateEmployeeLastLogin(user.id);
  }

  return NextResponse.json({ ok: true });
}
