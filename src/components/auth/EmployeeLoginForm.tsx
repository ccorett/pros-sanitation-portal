"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
} from "@/lib/auth-form-styles";
import { LoginAccessAlert } from "@/components/auth/LoginAccessAlert";
import { signInEmployee } from "@/lib/employee-sign-in";
import { normalizePinInput } from "@/lib/pin";
import type { PublicSignupPolicy } from "@/lib/signup-access";
import { Button } from "@/components/ui/Button";

type EmployeeLoginFormProps = {
  signupPolicy: PublicSignupPolicy;
  accessCode?: string | null;
};

export function EmployeeLoginForm({
  signupPolicy,
  accessCode = null,
}: EmployeeLoginFormProps) {
  const signupEnabled = signupPolicy.mode !== "disabled";
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signInEmployee({ email, pin });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      window.location.assign("/staff-dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-10 flex w-full max-w-md flex-col items-center">
      <form onSubmit={handleSubmit} className="w-full space-y-5" noValidate>
        <LoginAccessAlert accessCode={accessCode} />
        {error && (
          <p className={authErrorClassName} role="alert">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="email" className={authLabelClassName}>
            Email
          </label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#ebfbff]/40"
              aria-hidden="true"
            />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={`${authInputClassName} pl-12`}
            />
          </div>
        </div>
        <div>
          <label htmlFor="pin" className={authLabelClassName}>
            PIN
          </label>
          <input
            id="pin"
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            required
            maxLength={4}
            pattern="\d{4}"
            value={pin}
            onChange={(e) => setPin(normalizePinInput(e.target.value))}
            placeholder="Enter your PIN"
            className={authInputClassName}
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link
            href="/employee-forgot-password"
            className="text-sm font-medium text-[#00c6ff] hover:text-[#6cc801] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00c6ff] rounded"
          >
            Forgot PIN?
          </Link>
          <Link
            href="/employee-change-pin"
            className="text-sm font-medium text-[#00c6ff] hover:text-[#6cc801] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00c6ff] rounded"
          >
            Change PIN
          </Link>
        </div>
        <Button type="submit" variant="login" loading={loading}>
          Login to Portal
        </Button>
        {signupEnabled ? (
          <div className="space-y-3 pt-1">
            <p className="text-center text-sm text-[#ebfbff]/60">New employee?</p>
            <Link href="/employee-signup" className="block w-full">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                className="min-h-[52px] bg-[#0c151d]/60 text-base transition-shadow hover:shadow-lg hover:shadow-[#00c6ff]/20"
              >
                Create Employee Account
              </Button>
            </Link>
          </div>
        ) : (
          <p className="pt-1 text-center text-sm text-[#ebfbff]/50">
            New accounts are created by an administrator.
          </p>
        )}
      </form>
    </div>
  );
}
