import {
  EMPLOYEE_ACCESS_MESSAGES,
  type EmployeePortalAccessCode,
} from "@/lib/employee-portal-access";
import { authErrorClassName } from "@/lib/auth-form-styles";

type LoginAccessAlertProps = {
  accessCode: string | null;
};

export function LoginAccessAlert({ accessCode }: LoginAccessAlertProps) {
  if (!accessCode) return null;

  const message =
    accessCode in EMPLOYEE_ACCESS_MESSAGES
      ? EMPLOYEE_ACCESS_MESSAGES[accessCode as EmployeePortalAccessCode]
      : null;

  if (!message) return null;

  return (
    <p className={authErrorClassName} role="alert">
      {message}
    </p>
  );
}
