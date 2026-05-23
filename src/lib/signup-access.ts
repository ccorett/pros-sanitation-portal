export type EmployeeSignupMode = "open" | "disabled" | "invite";

export type SignupValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export type PublicSignupPolicy = {
  mode: EmployeeSignupMode;
  inviteRequired: boolean;
};

function getConfiguredInviteCodes(): string[] {
  return process.env.SIGNUP_INVITE_CODES?.split(",").map((c) => c.trim()) ?? [];
}

export function getEmployeeSignupMode(): EmployeeSignupMode {
  const raw = process.env.EMPLOYEE_SIGNUP_MODE?.trim().toLowerCase();
  if (raw === "disabled" || raw === "invite") {
    return raw;
  }
  if (raw === "domain" || raw === "open") {
    return "open";
  }
  return "open";
}

export function isInviteCodeValid(code: string | undefined): boolean {
  const configured = getConfiguredInviteCodes();
  if (configured.length === 0 || !code?.trim()) return false;
  const provided = code.trim();
  return configured.includes(provided);
}

export function validateEmployeeSignup(input: {
  inviteCode?: string;
}): SignupValidationResult {
  const mode = getEmployeeSignupMode();

  if (mode === "disabled") {
    return {
      ok: false,
      message:
        "Self-service registration is disabled. Ask an administrator to create your account.",
    };
  }

  if (mode === "invite") {
    if (getConfiguredInviteCodes().length === 0) {
      return {
        ok: false,
        message:
          "Invite-only registration is enabled but no invite codes are configured. Contact an administrator.",
      };
    }
    if (!isInviteCodeValid(input.inviteCode)) {
      return {
        ok: false,
        message: "A valid invite code is required to create an account.",
      };
    }
  }

  return { ok: true };
}

export function getPublicSignupPolicy(): PublicSignupPolicy {
  const mode = getEmployeeSignupMode();
  return {
    mode,
    inviteRequired: mode === "invite",
  };
}

export function isPublicSignupEnabled(): boolean {
  return getEmployeeSignupMode() !== "disabled";
}
