"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";
import {
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
} from "@/lib/auth-form-styles";
import {
  isPinValid,
  normalizePinInput,
  PIN_REQUIREMENTS_MESSAGE,
} from "@/lib/pin";
import type { PublicSignupPolicy } from "@/lib/signup-access";
import { Button } from "@/components/ui/Button";

type EmployeeSignupFormProps = {
  policy: PublicSignupPolicy;
};

export function EmployeeSignupForm({ policy }: EmployeeSignupFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (policy.inviteRequired && !inviteCode.trim()) {
      setError("Enter the invite code provided by your administrator.");
      return;
    }

    if (!isPinValid(pin)) {
      setError(PIN_REQUIREMENTS_MESSAGE);
      return;
    }

    if (pin !== confirmPin) {
      setError("PINs do not match.");
      return;
    }

    setLoading(true);

    try {
      const result = await authClient.signUp.email({
        email: email.trim(),
        password: pin,
        name: `${firstName.trim()} ${lastName.trim()}`,
        callbackURL: "/staff-dashboard",
        ...(policy.inviteRequired
          ? { inviteCode: inviteCode.trim() }
          : {}),
      } as Parameters<typeof authClient.signUp.email>[0]);

      if (result.error) {
        setError(
          result.error.message ?? "Unable to create account. Please try again.",
        );
        return;
      }

      const profile = await fetch("/api/employees/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });

      if (!profile.ok) {
        const profileError = (await profile.json()) as { error?: string };
        setError(
          profileError.error ??
            "Account created but employee profile setup failed. Contact admin.",
        );
        return;
      }

      window.location.assign("/staff-dashboard");
    } catch (cause) {
      console.error("[signup]", cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to create account right now. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-10 flex w-full max-w-md flex-col items-center">
      <form onSubmit={handleSubmit} className="w-full space-y-5" noValidate>
        {error && (
          <p className={authErrorClassName} role="alert">
            {error}
          </p>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className={authLabelClassName}>
              First name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={authInputClassName}
            />
          </div>
          <div>
            <label htmlFor="lastName" className={authLabelClassName}>
              Last name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={authInputClassName}
            />
          </div>
        </div>
        <div>
          <label htmlFor="email" className={authLabelClassName}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={authInputClassName}
          />
        </div>
        {policy.inviteRequired && (
          <div>
            <label htmlFor="inviteCode" className={authLabelClassName}>
              Invite code
            </label>
            <input
              id="inviteCode"
              name="inviteCode"
              type="text"
              autoComplete="off"
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter your invite code"
              className={authInputClassName}
            />
          </div>
        )}
        <div>
          <label htmlFor="pin" className={authLabelClassName}>
            Create PIN
          </label>
          <input
            id="pin"
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            required
            maxLength={4}
            pattern="\d{4}"
            value={pin}
            onChange={(e) => setPin(normalizePinInput(e.target.value))}
            placeholder="Enter your PIN"
            className={authInputClassName}
          />
          <p className="mt-2 text-xs text-[#ebfbff]/50">
            {PIN_REQUIREMENTS_MESSAGE}
          </p>
        </div>
        <div>
          <label htmlFor="confirmPin" className={authLabelClassName}>
            Confirm PIN
          </label>
          <input
            id="confirmPin"
            name="confirmPin"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            required
            maxLength={4}
            pattern="\d{4}"
            value={confirmPin}
            onChange={(e) => setConfirmPin(normalizePinInput(e.target.value))}
            placeholder="Enter your PIN"
            className={authInputClassName}
          />
        </div>
        <Button type="submit" variant="login" loading={loading}>
          Create Employee Account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-[#ebfbff]/60">
        Already have an account?{" "}
        <Link
          href="/employee-login"
          className="font-medium text-[#00c6ff] transition-colors hover:text-[#6cc801] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00c6ff] rounded"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
