"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";

export function ClerkProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider appearance={clerkAppearance}>{children}</ClerkProvider>
  );
}
