export const EMPLOYEE_DEPARTMENTS = [
  "Operations",
  "Sanitation",
  "Janitorial",
  "Human Resources",
  "Administration",
  "Management",
] as const;

export const EMPLOYEE_POSITIONS = [
  "Technician",
  "Driver",
  "Supervisor",
  "Admin",
  "Manager",
] as const;

export const EMPLOYEE_LOCATION_ASSIGNMENTS = [
  "Scarborough Pennysaver Grocery",
  "Canaan Pennysaver Grocery",
  "Carnbee Pennysaver Grocery",
  "Carnbee Pennysaver Pharmacy",
  "Pennysavers Mall",
  "Bin Management Route",
  "Office/Admin",
  "Floating/Unassigned",
] as const;

export type EmployeeDepartment = (typeof EMPLOYEE_DEPARTMENTS)[number];
export type EmployeePosition = (typeof EMPLOYEE_POSITIONS)[number];
export type EmployeeLocationAssignment =
  (typeof EMPLOYEE_LOCATION_ASSIGNMENTS)[number];

export function isEmployeeDepartment(value: string): value is EmployeeDepartment {
  return (EMPLOYEE_DEPARTMENTS as readonly string[]).includes(value);
}

export function isEmployeePosition(value: string): value is EmployeePosition {
  return (EMPLOYEE_POSITIONS as readonly string[]).includes(value);
}

export function isEmployeeLocationAssignment(
  value: string,
): value is EmployeeLocationAssignment {
  return (EMPLOYEE_LOCATION_ASSIGNMENTS as readonly string[]).includes(value);
}
