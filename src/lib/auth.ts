import { betterAuth } from "better-auth";
import { APIError } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { getAuthAdvancedOptions, resolveTrustedOrigins } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import { PIN_REQUIREMENTS_MESSAGE, isPinValid } from "@/lib/pin";
import { sendPasswordResetEmail } from "@/lib/password-reset-email";
import {
  getEmployeeSignupMode,
  validateEmployeeSignup,
} from "@/lib/signup-access";

const signupDisabled = getEmployeeSignupMode() === "disabled";

function assertPinCredential(
  body: Record<string, unknown> | undefined,
  fields: Array<"password" | "newPassword" | "currentPassword">,
): void {
  if (!body) return;

  for (const field of fields) {
    const value = body[field];
    if (typeof value === "string" && !isPinValid(value)) {
      throw new APIError("BAD_REQUEST", { message: PIN_REQUIREMENTS_MESSAGE });
    }
  }
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: resolveTrustedOrigins(),
  advanced: getAuthAdvancedOptions(),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 4,
    maxPasswordLength: 4,
    disableSignUp: signupDisabled,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      void sendPasswordResetEmail({ to: user.email, url }).catch((error) => {
        console.error("[pin-reset] email delivery failed:", error);
      });
    },
  },
  disabledPaths: signupDisabled ? ["/sign-up/email"] : [],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email") {
        const body = ctx.body as {
          email?: string;
          password?: string;
          inviteCode?: string;
        };

        assertPinCredential(body, ["password"]);

        const signupResult = validateEmployeeSignup({
          inviteCode: body.inviteCode,
        });

        if (!signupResult.ok) {
          throw new APIError("BAD_REQUEST", { message: signupResult.message });
        }

        return;
      }

      if (ctx.path === "/sign-in/email") {
        assertPinCredential(ctx.body as Record<string, unknown>, ["password"]);
        return;
      }

      if (ctx.path === "/reset-password") {
        assertPinCredential(ctx.body as Record<string, unknown>, ["newPassword"]);
        return;
      }

      if (ctx.path === "/change-password") {
        assertPinCredential(ctx.body as Record<string, unknown>, [
          "currentPassword",
          "newPassword",
        ]);
      }
    }),
  },
  plugins: [nextCookies()],
});
