import { createAuthClient } from "better-auth/react";
import { getAuthClientBaseUrl } from "@/lib/app-url";

export const authClient = createAuthClient({
  baseURL: getAuthClientBaseUrl(),
});
