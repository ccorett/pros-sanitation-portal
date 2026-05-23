import { isLoginLocked, LOGIN_LOCKOUT_MESSAGE } from "@/lib/login-attempts";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ locked: false });
  }

  const locked = await isLoginLocked(email);

  return NextResponse.json({
    locked,
    message: locked ? LOGIN_LOCKOUT_MESSAGE : null,
  });
}
