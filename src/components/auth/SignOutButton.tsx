"use client";

import { useState } from "react";
import { redirectToPortalHome, signOutPortalSession } from "@/lib/auth-session";
import { Button } from "@/components/ui/Button";

export function SignOutButton() {
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOutPortalSession();
      redirectToPortalHome();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={handleSignOut}
      loading={loading}
      className="min-h-[44px] px-4 text-sm"
    >
      Sign Out
    </Button>
  );
}
