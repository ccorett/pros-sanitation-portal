import {
  resolveAuthenticatedSession,
  sessionExpiredApiResponse,
  unauthorizedApiResponse,
} from "@/lib/require-authenticated-session";

export async function POST() {
  const authResult = await resolveAuthenticatedSession({ touch: true });

  if (authResult.status === "unauthenticated") {
    return unauthorizedApiResponse();
  }

  if (authResult.status === "expired") {
    return sessionExpiredApiResponse();
  }

  return new Response(null, { status: 204 });
}
