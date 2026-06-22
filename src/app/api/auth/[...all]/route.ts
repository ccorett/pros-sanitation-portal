import { auth } from "@/lib/auth";
import {
  INVALID_CREDENTIALS_MESSAGE,
  recordLoginFailure,
  resetLoginAttempts,
} from "@/lib/login-security";
import { getRequestIp } from "@/lib/request-ip";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";

const handler = toNextJsHandler(auth);

async function handleSignInEmail(request: NextRequest) {
  const ip = getRequestIp(request);
  let email = "";

  try {
    const body = (await request.clone().json()) as { email?: string };
    email = body.email?.trim().toLowerCase() ?? "";
  } catch {
    email = "";
  }

  const response = await handler.POST(request);

  if (!email) {
    return response;
  }

  if (response.ok) {
    await resetLoginAttempts({ email, ipAddress: ip });
    return response;
  }

  await recordLoginFailure({ email, ipAddress: ip });

  try {
    const payload = (await response.clone().json()) as { message?: string };
    if (payload.message === "Invalid email or password") {
      return new Response(
        JSON.stringify({ message: INVALID_CREDENTIALS_MESSAGE }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  } catch {
    // Keep original response when body is not JSON.
  }

  return response;
}

export async function GET(request: NextRequest) {
  return handler.GET(request);
}

export async function POST(request: NextRequest) {
  if (request.nextUrl.pathname.endsWith("/sign-in/email")) {
    return handleSignInEmail(request);
  }

  return handler.POST(request);
}
