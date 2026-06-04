import { authClient } from "@/lib/auth-client";

/** End the Better Auth session and clear client caches before leaving the portal. */
export async function signOutPortalSession(): Promise<void> {
  try {
    await authClient.signOut();
  } catch {
    // Still redirect home if sign-out fails.
  }

  if (typeof window !== "undefined") {
    try {
      sessionStorage.clear();
    } catch {
      // Ignore storage errors in restricted browsers.
    }
  }
}

export function redirectToPortalHome(): void {
  window.location.assign("/");
}
