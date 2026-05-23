import {
  LOGIN_LOCKOUT_MESSAGE,
  recordLoginFailure,
} from "@/lib/login-attempts";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { email?: string };

  if (!body.email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const locked = await recordLoginFailure(body.email);

  return NextResponse.json({
    locked,
    message: locked ? LOGIN_LOCKOUT_MESSAGE : null,
  });
}
