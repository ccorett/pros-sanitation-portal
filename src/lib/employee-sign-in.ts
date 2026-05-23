import { authClient } from "@/lib/auth-client";
import { LOGIN_LOCKOUT_MESSAGE } from "@/lib/login-attempts";

export type EmployeeSignInResult =
  | { ok: true }
  | { ok: false; error: string };

export async function signInEmployee(input: {
  email: string;
  pin: string;
}): Promise<EmployeeSignInResult> {
  const email = input.email.trim();

  try {
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
        error: checkData.message ?? LOGIN_LOCKOUT_MESSAGE,
      };
    }

    const result = await authClient.signIn.email({
      email,
      password: input.pin,
      callbackURL: "/staff-dashboard",
    });

    if (result.error) {
      const fail = await fetch("/api/auth/login-fail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const failData = (await fail.json()) as {
        locked?: boolean;
        message?: string;
      };

      if (failData.locked) {
        return {
          ok: false,
          error: failData.message ?? LOGIN_LOCKOUT_MESSAGE,
        };
      }

      return {
        ok: false,
        error:
          result.error.message ?? "Invalid email or PIN. Please try again.",
      };
    }

    await fetch("/api/auth/login-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const accessResponse = await fetch("/api/employees/portal-access");
    const accessData = (await accessResponse.json()) as {
      allowed?: boolean;
      message?: string;
    };

    if (!accessResponse.ok || !accessData.allowed) {
      await authClient.signOut();
      return {
        ok: false,
        error:
          accessData.message ??
          "Your employee account is not active. Contact an administrator.",
      };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Unable to sign in right now. Please try again.",
    };
  }
}
