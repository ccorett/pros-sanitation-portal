import { isIpRateLimited, IP_RATE_LIMIT_MESSAGE } from "@/lib/login-attempts";
import { getRequestIp } from "@/lib/request-ip";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const ip = getRequestIp(request);

  if (await isIpRateLimited(ip)) {
    return NextResponse.json({
      locked: true,
      message: IP_RATE_LIMIT_MESSAGE,
    });
  }

  return NextResponse.json({ locked: false });
}
