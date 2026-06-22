import { INVALID_CREDENTIALS_MESSAGE, IP_RATE_LIMIT_MESSAGE, isIpRateLimited } from "@/lib/login-attempts";
import { getRequestIp } from "@/lib/request-ip";
import { NextRequest, NextResponse } from "next/server";

/**
 * Client fallback after a failed sign-in. Failure counting and progressive
 * delays are handled by the auth sign-in route; this endpoint only returns
 * the generic user-facing message.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as { email?: string };

  if (!body.email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const ip = getRequestIp(request);
  const rateLimited = await isIpRateLimited(ip);

  return NextResponse.json({
    message: rateLimited ? IP_RATE_LIMIT_MESSAGE : INVALID_CREDENTIALS_MESSAGE,
    rateLimited,
  });
}
