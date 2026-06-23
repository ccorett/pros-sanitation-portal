import type { Employee } from "@prisma/client";
import { EmployeeResponsibility } from "@prisma/client";
import { canAccessAdminModule } from "@/lib/access-levels";
import { EMPTY_JOB_ASSIGNMENTS } from "@/lib/job-assignment-types";
import {
  hasResponsibility,
  type EmployeeAccessContext,
} from "@/lib/operational-access";

export function hasAdminAssistantResponsibility(
  ctx: Pick<EmployeeAccessContext, "responsibilities">,
): boolean {
  return hasResponsibility(ctx, EmployeeResponsibility.ADMIN_ASSISTANT);
}

export function canAccessInvoiceManagement(
  ctx: Pick<EmployeeAccessContext, "accessLevel" | "responsibilities">,
): boolean {
  return canAccessAdminModule(ctx.accessLevel) || hasAdminAssistantResponsibility(ctx);
}

export function canManageInvoiceClients(
  ctx: Pick<EmployeeAccessContext, "accessLevel" | "responsibilities">,
): boolean {
  return canAccessAdminModule(ctx.accessLevel);
}

export function canProcessInvoiceSchedules(
  ctx: Pick<EmployeeAccessContext, "accessLevel" | "responsibilities">,
): boolean {
  return canAccessInvoiceManagement(ctx);
}

export async function resolveEmployeeResponsibilitiesForActor(
  employee: Pick<Employee, "id" | "accessLevel" | "operationalGroup">,
): Promise<EmployeeResponsibility[]> {
  const { prisma } = await import("@/lib/prisma");
  const { getDefaultResponsibilitiesForLevel } = await import(
    "@/lib/employee-responsibilities"
  );

  const entries = await prisma.employeeResponsibilityEntry.findMany({
    where: { employeeId: employee.id },
    select: { responsibility: true },
  });

  if (entries.length > 0) {
    return entries.map((entry) => entry.responsibility);
  }

  return getDefaultResponsibilitiesForLevel(
    employee.accessLevel,
    employee.operationalGroup,
  );
}

export function buildInvoiceAccessContext(
  employee: Employee,
  responsibilities: EmployeeResponsibility[],
): EmployeeAccessContext {
  return {
    accessLevel: employee.accessLevel,
    operationalGroup: employee.operationalGroup,
    responsibilities,
    assignments: EMPTY_JOB_ASSIGNMENTS,
  };
}
