"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { getClientAppBaseUrl } from "@/lib/app-url";
import {
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
} from "@/lib/auth-form-styles";
import { Button } from "@/components/ui/Button";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSent(false);
    setLoading(true);

    try {
      const redirectTo = `${getClientAppBaseUrl()}/employee-reset-password`;
      const result = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo,
      });

      if (result.error) {
        setError(
          result.error.message ??
            "Unable to send a reset email right now. Please try again.",
        );
        return;
      }

      setSent(true);
    } catch {
      setError("Unable to send a reset email right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="relative z-10 w-full max-w-md text-center">
        <p className="text-sm text-[#ebfbff]/70">
          If an account exists for that email, we sent PIN reset instructions.
          Check your inbox and spam folder.
        </p>
        <p className="mt-3 text-xs text-[#ebfbff]/45">
          In local development, the reset link is printed in the server
          terminal when email is not configured.
        </p>
        <Link
          href="/employee-login"
          className="mt-6 inline-block text-sm font-medium text-[#00c6ff] hover:text-[#6cc801]"
        >
          Back to sign in
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
          <label htmlFor="reset-email" className={authLabelClassName}>
            Email
          </label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#ebfbff]/40"
              aria-hidden="true"
            />
            <input
              id="reset-email"
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
        <Button type="submit" variant="login" loading={loading}>
          Send reset link
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-[#ebfbff]/60">
        Remember your PIN?{" "}
        <Link
          href="/employee-login"
          className="font-medium text-[#00c6ff] hover:text-[#6cc801]"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
