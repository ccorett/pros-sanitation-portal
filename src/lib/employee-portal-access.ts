import { AccountStatus, type Employee } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type EmployeePortalAccessCode = "no-profile" | "account-inactive";

export type EmployeePortalAccess =
  | { allowed: true; employee: Employee }
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

  if (employee.accountStatus !== AccountStatus.ACTIVE) {
    return {
      allowed: false,
      code: "account-inactive",
      message: EMPLOYEE_ACCESS_MESSAGES["account-inactive"],
    };
  }

  return { allowed: true, employee };
}
