import { authErrorClassName } from "@/lib/auth-form-styles";

type SessionExpiredAlertProps = {
  reason: string | null;
};

export function SessionExpiredAlert({ reason }: SessionExpiredAlertProps) {
  if (reason !== "session-expired") {
    return null;
  }

  return (
    <p className={authErrorClassName} role="alert">
      Your session has expired due to inactivity. Please sign in again.
    </p>
  );
}
