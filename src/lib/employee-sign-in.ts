import { authClient } from "@/lib/auth-client";
import { AUTH_POST_LOGIN_PATH } from "@/lib/auth-routes";
import {
  INVALID_CREDENTIALS_MESSAGE,
  IP_RATE_LIMIT_MESSAGE,
  normalizeEmail,
} from "@/lib/login-attempts";
import { resolvePostLoginRedirect } from "@/lib/portal-auth-redirect";

export type EmployeeSignInResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

export async function signInEmployee(input: {
  email: string;
  pin: string;
  returnTo?: string | null;
}): Promise<EmployeeSignInResult> {
  const email = normalizeEmail(input.email);

  try {
    await authClient.signOut();
    const check = await fetch(
      `/api/auth/login-check?email=${encodeURIComponent(email)}`,
    );
    const checkData = (await check.json()) as {
      locked?: boolean;
      message?: string;
    };

    if (checkData.locked) {
      return {
        ok: false,
        error: checkData.message ?? IP_RATE_LIMIT_MESSAGE,
      };
    }

    const result = await authClient.signIn.email({
      email,
      password: input.pin,
      callbackURL: AUTH_POST_LOGIN_PATH,
    });

    if (result.error) {
      const fail = await fetch("/api/auth/login-fail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const failData = (await fail.json()) as {
        rateLimited?: boolean;
        message?: string;
      };

      if (failData.rateLimited) {
        return {
          ok: false,
          error: failData.message ?? IP_RATE_LIMIT_MESSAGE,
        };
      }

      const authMessage = result.error.message?.trim();
      const status = result.error.status;

      if (status === 429 || status === 403) {
        return {
          ok: false,
          error: authMessage ?? IP_RATE_LIMIT_MESSAGE,
        };
      }

      return {
        ok: false,
        error:
          authMessage && authMessage !== "Invalid email or password"
            ? authMessage === "Invalid credentials."
              ? INVALID_CREDENTIALS_MESSAGE
              : authMessage
            : INVALID_CREDENTIALS_MESSAGE,
      };
    }

    await fetch("/api/auth/login-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const accessResponse = await fetch("/api/employees/portal-access", {
      cache: "no-store",
    });
    const accessData = (await accessResponse.json()) as {
      allowed?: boolean;
      message?: string;
      redirectTo?: "/pending-verification" | "/staff-dashboard";
    };

    if (!accessResponse.ok || !accessData.allowed) {
      await authClient.signOut();
      return {
        ok: false,
        error: INVALID_CREDENTIALS_MESSAGE,
      };
    }

    return {
      ok: true,
      redirectTo: resolvePostLoginRedirect(
        input.returnTo,
        accessData.redirectTo ?? "/staff-dashboard",
      ),
    };
  } catch {
    return {
      ok: false,
      error: "Unable to sign in right now. Please try again.",
    };
  }
}
