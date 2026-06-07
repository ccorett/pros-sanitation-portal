import type { Employee } from "@prisma/client";

export type PayslipMatchInput = {
  employeeName: string;
  email: string;
};

export type EmployeeMatchResult = {
  employee: Employee | null;
  uncertain: boolean;
  uncertainReason?: string;
};

const PAYROLL_EMAIL_DOMAIN = "@prossanitation.com";

export function employeeDisplayName(
  employee: Pick<Employee, "firstName" | "lastName">,
): string {
  return `${employee.firstName} ${employee.lastName}`.trim();
}

export function normalizeEmployeeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeNameForMatch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEmailLocalPart(email: string): string {
  const local = email.trim().toLowerCase().split("@")[0] ?? "";
  return local.replace(/[.'-]/g, "");
}

function employeeNameNormalized(employee: Pick<Employee, "firstName" | "lastName">): string {
  return normalizeNameForMatch(employeeDisplayName(employee));
}

function isPayrollEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(PAYROLL_EMAIL_DOMAIN);
}

function preferPayrollEmployee(matches: Employee[]): Employee | null {
  if (matches.length === 0) {
    return null;
  }

  if (matches.length === 1) {
    return matches[0];
  }

  const payrollMatches = matches.filter((employee) =>
    isPayrollEmail(employee.companyEmail),
  );

  if (payrollMatches.length === 1) {
    return payrollMatches[0];
  }

  return null;
}

function hasConflictingSameFirstNameMatch(
  targetName: string,
  employees: Employee[],
  matched: Employee,
): boolean {
  const firstName = matched.firstName.trim().toLowerCase();
  const targetParts = normalizeNameForMatch(targetName).split(" ");
  const lastNameParts = targetParts.slice(1);

  if (lastNameParts.length === 0) {
    return false;
  }

  return employees.some((employee) => {
    if (employee.id === matched.id) {
      return false;
    }

    if (employee.firstName.trim().toLowerCase() !== firstName) {
      return false;
    }

    const otherParts = employeeNameNormalized(employee).split(" ");
    return (
      otherParts.length > targetParts.length &&
      lastNameParts.every((part) => otherParts.includes(part))
    );
  });
}

function resolveNameMatches(
  targetName: string,
  employees: Employee[],
  matches: Employee[],
): EmployeeMatchResult {
  const preferred = preferPayrollEmployee(matches);

  if (preferred) {
    if (hasConflictingSameFirstNameMatch(targetName, employees, preferred)) {
      return {
        employee: null,
        uncertain: true,
        uncertainReason: `Multiple "${preferred.firstName}" employees may match "${targetName}". Assign manually.`,
      };
    }

    return { employee: preferred, uncertain: false };
  }

  if (matches.length > 1) {
    return {
      employee: null,
      uncertain: true,
      uncertainReason: `Multiple employees match "${employeeDisplayName(matches[0])}". Assign manually.`,
    };
  }

  return { employee: null, uncertain: false };
}

export function matchEmployee(
  row: PayslipMatchInput,
  employees: Employee[],
): EmployeeMatchResult {
  const email = row.email.trim().toLowerCase();

  if (email) {
    const byEmail = employees.find(
      (employee) => employee.companyEmail.trim().toLowerCase() === email,
    );
    if (byEmail) {
      return { employee: byEmail, uncertain: false };
    }

    const csvLocal = normalizeEmailLocalPart(email);
    const byEmailLocal = employees.filter(
      (employee) => normalizeEmailLocalPart(employee.companyEmail) === csvLocal,
    );
    if (byEmailLocal.length === 1) {
      return { employee: byEmailLocal[0], uncertain: false };
    }
  }

  if (row.employeeName.trim()) {
    const exactTarget = normalizeEmployeeName(row.employeeName);
    const exactMatches = employees.filter(
      (employee) => normalizeEmployeeName(employeeDisplayName(employee)) === exactTarget,
    );
    const exactResult = resolveNameMatches(row.employeeName, employees, exactMatches);
    if (exactResult.employee || exactResult.uncertain) {
      return exactResult;
    }

    const normalizedTarget = normalizeNameForMatch(row.employeeName);
    const normalizedMatches = employees.filter(
      (employee) => employeeNameNormalized(employee) === normalizedTarget,
    );
    const normalizedResult = resolveNameMatches(
      row.employeeName,
      employees,
      normalizedMatches,
    );
    if (normalizedResult.employee || normalizedResult.uncertain) {
      return normalizedResult;
    }

    if (email) {
      const csvLocal = normalizeEmailLocalPart(email);
      const emailHintMatches = employees.filter((employee) => {
        const employeeLocal = normalizeEmailLocalPart(employee.companyEmail);
        const nameHint = employeeNameNormalized(employee).replace(/\s+/g, "");
        return employeeLocal === csvLocal || employeeLocal === nameHint;
      });
      const emailHintResult = resolveNameMatches(
        row.employeeName,
        employees,
        emailHintMatches,
      );
      if (emailHintResult.employee || emailHintResult.uncertain) {
        return emailHintResult;
      }
    }
  }

  return { employee: null, uncertain: false };
}

export function matchEmployeeByPayslipRecord(
  employeeName: string,
  employeeEmail: string | null | undefined,
  employees: Employee[],
): EmployeeMatchResult {
  return matchEmployee(
    {
      employeeName,
      email: employeeEmail?.trim().toLowerCase() ?? "",
    },
    employees,
  );
}
