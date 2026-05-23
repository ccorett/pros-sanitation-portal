import { resetLoginAttempts } from "@/lib/login-attempts";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { email?: string };

  if (!body.email) {
    return NextResponse.json({ ok: true });
  }

  await resetLoginAttempts(body.email);

  return NextResponse.json({ ok: true });
}
