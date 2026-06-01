import { AccountStatus, EmploymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const MAX_ALLOCATION_ATTEMPTS = 5;

export async function allocateEmployeePublicId(): Promise<string> {
  const rows = await prisma.$queryRaw<{ next_id: bigint }[]>`
    SELECT nextval('employee_public_id_seq')::bigint AS next_id
  `;

  const sequenceValue = Number(rows[0]?.next_id ?? 1);
  return `PS-EMP-${String(sequenceValue).padStart(3, "0")}`;
}

type CreateEmployeeInput = {
  userId: string;
  firstName: string;
  lastName: string;
  companyEmail: string;
  phoneNumber?: string;
  department?: string;
  jobTitle?: string;
  position?: string;
  locationAssignment?: string;
};

export async function createEmployeeWithAllocatedId(input: CreateEmployeeInput) {
  const data = {
    userId: input.userId,
    firstName: input.firstName,
    lastName: input.lastName,
    companyEmail: input.companyEmail,
    phoneNumber: input.phoneNumber?.trim() || null,
    department: input.department ?? "Operations",
    jobTitle: input.jobTitle ?? "Sanitation Technician",
    position: input.position ?? null,
    locationAssignment: input.locationAssignment ?? null,
    employmentStatus: EmploymentStatus.ACTIVE,
    accountStatus: AccountStatus.ACTIVE,
  };

  for (let attempt = 0; attempt < MAX_ALLOCATION_ATTEMPTS; attempt++) {
    const employeeId = await allocateEmployeePublicId();

    try {
      return await prisma.employee.create({
        data: {
          ...data,
          employeeId,
        },
      });
    } catch (error) {
      const isDuplicateEmployeeId =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        Array.isArray(error.meta?.target) &&
        (error.meta.target as string[]).includes("employeeId");

      if (isDuplicateEmployeeId && attempt < MAX_ALLOCATION_ATTEMPTS - 1) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unable to allocate a unique employee ID.");
}
