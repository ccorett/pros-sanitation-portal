import { AccountStatus, type Employee } from "@prisma/client";
import {
  canAccessStaffPortal,
  isPendingVerificationEmployee,
} from "@/lib/access-levels";
import { prisma } from "@/lib/prisma";

export type EmployeePortalAccessCode =
  | "no-profile"
  | "account-inactive"
  | "pending-verification";

export type EmployeePortalAccess =
  | {
      allowed: true;
      employee: Employee;
      redirectTo: "/pending-verification" | "/staff-dashboard";
      pendingVerification: boolean;
    }
  | {
      allowed: false;
      code: EmployeePortalAccessCode;
      message: string;
    };

export const EMPLOYEE_ACCESS_MESSAGES: Record<EmployeePortalAccessCode, string> =
  {
    "no-profile":
      "Your employee profile is not set up yet. Contact an administrator.",
    "account-inactive":
      "Your portal account is not active. Contact an administrator.",
    "pending-verification":
      "Your account is pending verification. You will be notified once approved.",
  };

export async function getEmployeePortalAccess(
  userId: string,
): Promise<EmployeePortalAccess> {
  const employee = await prisma.employee.findUnique({
    where: { userId },
  });

  if (!employee) {
    return {
      allowed: false,
      code: "no-profile",
      message: EMPLOYEE_ACCESS_MESSAGES["no-profile"],
    };
  }

  if (
    employee.accountStatus === AccountStatus.DISABLED ||
    employee.accountStatus === AccountStatus.REMOVED
  ) {
    return {
      allowed: false,
      code: "account-inactive",
      message: EMPLOYEE_ACCESS_MESSAGES["account-inactive"],
    };
  }

  const pendingVerification = isPendingVerificationEmployee(employee);

  if (pendingVerification) {
    return {
      allowed: true,
      employee,
      redirectTo: "/pending-verification",
      pendingVerification: true,
    };
  }

  if (!canAccessStaffPortal(employee)) {
    return {
      allowed: false,
      code: "account-inactive",
      message: EMPLOYEE_ACCESS_MESSAGES["account-inactive"],
    };
  }

  return {
    allowed: true,
    employee,
    redirectTo: "/staff-dashboard",
    pendingVerification: false,
  };
}
