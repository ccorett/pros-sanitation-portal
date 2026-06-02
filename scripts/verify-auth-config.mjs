import { config } from "dotenv";
import { resolve } from "path";
import { readFileSync } from "fs";

config({ path: resolve(process.cwd(), ".env.local") });

const CANONICAL = "http://localhost:3001";
const FORBIDDEN_PORTS = ["3003", "3006", "3010"];

const envUrl =
  process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_BETTER_AUTH_URL;

if (envUrl !== CANONICAL) {
  console.error(`FAIL: BETTER_AUTH_URL must be ${CANONICAL}, got ${envUrl}`);
  process.exit(1);
}

const srcRoot = resolve(process.cwd(), "src");
const files = [
  "lib/app-url.ts",
  "lib/auth-config.ts",
  "middleware.ts",
  "lib/auth.ts",
  "lib/auth-client.ts",
  "lib/employee-sign-in.ts",
  "components/auth/EmployeeSignupForm.tsx",
  "components/auth/ForgotPasswordForm.tsx",
];

for (const file of files) {
  const text = readFileSync(resolve(srcRoot, file), "utf8");
  for (const port of FORBIDDEN_PORTS) {
    if (text.includes(port)) {
      console.error(`FAIL: ${file} still references port ${port}`);
      process.exit(1);
    }
  }
}

const authConfig = readFileSync(resolve(srcRoot, "lib/auth-config.ts"), "utf8");
if (authConfig.includes("3000") || authConfig.includes("3010")) {
  console.error("FAIL: auth-config.ts still has multi-port dev loop");
  process.exit(1);
}

console.log("OK: auth URLs standardized to", CANONICAL);
