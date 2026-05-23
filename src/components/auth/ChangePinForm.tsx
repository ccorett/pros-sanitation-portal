"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Button } from "@/components/ui/Button";

export function ChangePinForm() {
  const router = useRouter();
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!isPinValid(currentPin) || !isPinValid(newPin)) {
      setError(PIN_REQUIREMENTS_MESSAGE);
      return;
    }

    if (newPin !== confirmPin) {
      setError("PINs do not match.");
      return;
    }

    if (currentPin === newPin) {
      setError("Choose a different PIN than your current one.");
      return;
    }

    setLoading(true);

    try {
      const result = await authClient.changePassword({
        currentPassword: currentPin,
        newPassword: newPin,
        revokeOtherSessions: true,
      });

      if (result.error) {
        setError(
          result.error.message ??
            "Unable to change your PIN. Check your current PIN and try again.",
        );
        return;
      }

      setDone(true);
      router.refresh();
    } catch {
      setError("Unable to change your PIN right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="relative z-10 w-full max-w-md text-center">
        <p className="text-sm text-[#ebfbff]/70">
          Your PIN has been updated successfully.
        </p>
        <Link
          href="/staff-dashboard"
          className="mt-6 inline-block text-sm font-medium text-[#00c6ff] hover:text-[#6cc801]"
        >
          Back to dashboard
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
          <label htmlFor="current-pin" className={authLabelClassName}>
            Current PIN
          </label>
          <input
            id="current-pin"
            name="currentPin"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            required
            maxLength={4}
            pattern="\d{4}"
            value={currentPin}
            onChange={(e) => setCurrentPin(normalizePinInput(e.target.value))}
            placeholder="Enter your PIN"
            className={authInputClassName}
          />
        </div>
        <div>
          <label htmlFor="new-pin" className={authLabelClassName}>
            New PIN
          </label>
          <input
            id="new-pin"
            name="newPin"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            required
            maxLength={4}
            pattern="\d{4}"
            value={newPin}
            onChange={(e) => setNewPin(normalizePinInput(e.target.value))}
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
      <p className="mt-6 text-center text-sm text-[#ebfbff]/60">
        <Link
          href="/employee-login"
          className="font-medium text-[#00c6ff] hover:text-[#6cc801]"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
