/**
 * SEED ONLY / UI helpers — not a live source of truth.
 * Operational HR data (vacation, job letters, payslip requests) is stored in Neon.
 * Display helpers and static HR navigation only — not live data.
 */
import { CalendarDays, FileText, Receipt, Upload, type LucideIcon } from "lucide-react";

export type VacationRequestStatus = "Pending" | "Approved" | "Rejected";

export type JobLetterType =
  | "Job Letter"
  | "Employment Letter"
  | "Salary Letter";

export type JobLetterRequestStatus = "Pending" | "Approved" | "Rejected";

export type VacationRequest = {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: VacationRequestStatus;
  submittedAt: string;
};

export type JobLetterRequest = {
  id: string;
  letterType: JobLetterType;
  status: JobLetterRequestStatus;
  requestedAt: string;
  notes?: string;
};

export type HrModule = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

export const hrModules: HrModule[] = [
  {
    title: "Vacation Requests",
    description: "Submit time off requests and track approval status.",
    href: "/hr/vacation",
    icon: CalendarDays,
  },
  {
    title: "Job Letter Requests",
    description: "Request employment, job, or salary letters.",
    href: "/hr/job-letters",
    icon: FileText,
  },
  {
    title: "Payslips",
    description: "View your latest payslip and payslip records from the last 12 months.",
    href: "/hr/payslips",
    icon: Receipt,
  },
];

export const payslipAdministrationModule: HrModule = {
  title: "Payslip Administration",
  description: "Upload monthly payroll CSV files, preview matches, and import payslips.",
  href: "/hr/payslip-administration",
  icon: Upload,
};


export function vacationStatusClass(status: VacationRequestStatus): string {
  if (status === "Approved") {
    return "border-[#6cc801]/35 bg-[#6cc801]/15 text-[#6cc801]";
  }
  if (status === "Rejected") {
    return "border-[#ff4d4f]/35 bg-[#ff4d4f]/15 text-[#ff4d4f]";
  }
  return "border-[#f5c542]/35 bg-[#f5c542]/15 text-[#f5c542]";
}

export function jobLetterStatusClass(
  status: JobLetterRequestStatus | string,
): string {
  return vacationStatusClass(status as VacationRequestStatus);
}

export function formatDisplayDate(isoDate: string): string {
  const date = new Date(isoDate.includes("T") ? isoDate : `${isoDate}T12:00:00.000Z`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
