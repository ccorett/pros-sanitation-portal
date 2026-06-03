export type EmployeeJobAssignments = {
  assignedJobIds: string[];
  assignedLocationIds: string[];
  assignedBinManagement: boolean;
};

export const EMPTY_JOB_ASSIGNMENTS: EmployeeJobAssignments = {
  assignedJobIds: [],
  assignedLocationIds: [],
  assignedBinManagement: false,
};
