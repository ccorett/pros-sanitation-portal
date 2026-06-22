"use client";

import { authClient } from "@/lib/auth-client";
import { buildSessionExpiredLoginUrl } from "@/lib/session-inactivity";
import { useEffect, useRef } from "react";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const SESSION_TOUCH_DEBOUNCE_MS = 60 * 1000;

const ACTIVITY_EVENTS = [
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "pointerdown",
] as const;

export function SessionInactivityGuard() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signingOutRef = useRef(false);

  useEffect(() => {
    const clearTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const clearTouchTimer = () => {
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
        touchTimeoutRef.current = null;
      }
    };

    const signOutForInactivity = async () => {
      if (signingOutRef.current) {
        return;
      }

      signingOutRef.current = true;

      try {
        await authClient.signOut();
      } catch {
        // Continue to login even if sign-out fails.
      }

      window.location.assign(buildSessionExpiredLoginUrl());
    };

    const touchServerSession = () => {
      clearTouchTimer();
      touchTimeoutRef.current = setTimeout(() => {
        void fetch("/api/session/touch", {
          method: "POST",
          cache: "no-store",
        }).catch(() => undefined);
      }, SESSION_TOUCH_DEBOUNCE_MS);
    };

    const resetTimer = () => {
      clearTimer();
      timeoutRef.current = setTimeout(() => {
        void signOutForInactivity();
      }, INACTIVITY_TIMEOUT_MS);
    };

    const handleActivity = () => {
      resetTimer();
      touchServerSession();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        resetTimer();
        touchServerSession();
      }
    };

    resetTimer();

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, handleActivity, { passive: true });
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearTimer();
      clearTouchTimer();

      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, handleActivity);
      }

      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}
