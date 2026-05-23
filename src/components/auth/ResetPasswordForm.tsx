"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
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
import { Button } from "@/components/ui/Button";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token"), [searchParams]);
  const tokenError = searchParams.get("error");

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("This reset link is invalid or has expired.");
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
      const result = await authClient.resetPassword({
        newPassword: pin,
        token,
      });

      if (result.error) {
        setError(
          result.error.message ??
            "Unable to reset your PIN. Request a new link and try again.",
        );
        return;
      }

      setDone(true);
      router.refresh();
    } catch {
      setError("Unable to reset your PIN right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (tokenError === "INVALID_TOKEN" || (!token && !done)) {
    return (
      <div className="relative z-10 w-full max-w-md text-center">
        <p className={authErrorClassName} role="alert">
          This PIN reset link is invalid or has expired.
        </p>
        <Link
          href="/employee-forgot-password"
          className="mt-6 inline-block text-sm font-medium text-[#00c6ff] hover:text-[#6cc801]"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="relative z-10 w-full max-w-md text-center">
        <p className="text-sm text-[#ebfbff]/70">
          Your PIN has been updated. Sign in with your new PIN.
        </p>
        <Link
          href="/employee-login"
          className="mt-6 inline-block text-sm font-medium text-[#00c6ff] hover:text-[#6cc801]"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex w-full max-w-md flex-col items-center">
      <form onSubmit={handleSubmit} className="w-full space-y-5" noValidate>
        {error && (
          <p className={authErrorClassName} role="alert">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="new-pin" className={authLabelClassName}>
            New PIN
          </label>
          <input
            id="new-pin"
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
          <label htmlFor="confirm-new-pin" className={authLabelClassName}>
            Confirm new PIN
          </label>
          <input
            id="confirm-new-pin"
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
          Update PIN
        </Button>
      </form>
    </div>
  );
}
