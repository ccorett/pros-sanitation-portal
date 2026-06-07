import {
  AccessLevel,
  AccountStatus,
  EmploymentStatus,
  OperationalGroup,
  PrismaClient,
} from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";
import { derivePositionFromAccessLevel } from "../src/lib/access-levels";

export const MAY_2026_PAY_PERIOD = "May 2026";
export const MAY_2026_PAYSLIP_FILE_NAME = "PSL May 2026 payslip.pdf";
export const MAY_2026_PAYSLIP_FILE_URL = "/payslips/PSL-May-2026.pdf";
const UPLOADED_BY = "Payroll Seed";

type PortalDepartment =
  | "Operations"
  | "Sanitation"
  | "Janitorial"
  | "Human Resources"
  | "Administration"
  | "Management";

type PortalJobTitle =
  | "Cleaner"
  | "Sanitation Technician"
  | "Bin Technician"
  | "Driver"
  | "Supervisor"
  | "Bin Service Supervisor"
  | "Manager";

type PayrollEmployeeSeed = {
  employeePublicId: string;
  fullName: string;
  email: string;
  pin: string;
  accessLevel: AccessLevel;
  operationalGroup?: OperationalGroup;
  pdfDepartment: string;
  pdfJobTitle: string;
};

const PAYROLL_EMPLOYEES: PayrollEmployeeSeed[] = [
  {
    employeePublicId: "PS-EMP-PAY-001",
    fullName: "Morena Joefield",
    email: "morena.joefield@prossanitation.com",
    pin: "2461",
    accessLevel: AccessLevel.TEAM_MEMBER,
    pdfDepartment: "Div. Of Infrastucture",
    pdfJobTitle: "Supervisor/ Cleaner",
  },
  {
    employeePublicId: "PS-EMP-PAY-002",
    fullName: "Joshua Powder",
    email: "joshua.powder@prossanitation.com",
    pin: "7153",
    accessLevel: AccessLevel.MANAGER,
    pdfDepartment: "Management",
    pdfJobTitle: "Director",
  },
  {
    employeePublicId: "PS-EMP-PAY-003",
    fullName: "Candice Powder-Paris",
    email: "candice.powderparis@prossanitation.com",
    pin: "8394",
    accessLevel: AccessLevel.MANAGER,
    pdfDepartment: "Management",
    pdfJobTitle: "Director",
  },
  {
    employeePublicId: "PS-EMP-PAY-004",
    fullName: "Dameon Daire",
    email: "dameon.daire@prossanitation.com",
    pin: "5826",
    accessLevel: AccessLevel.TEAM_MEMBER,
    pdfDepartment: "Penny Savers Canaan",
    pdfJobTitle: "Part Time",
  },
  {
    employeePublicId: "PS-EMP-PAY-005",
    fullName: "Deon Grimshaw",
    email: "deon.grimshaw@prossanitation.com",
    pin: "1947",
    accessLevel: AccessLevel.TEAM_MEMBER,
    pdfDepartment: "Penny Savers Canaan",
    pdfJobTitle: "",
  },
  {
    employeePublicId: "PS-EMP-PAY-006",
    fullName: "Reginald Lashley",
    email: "reginald.lashley@prossanitation.com",
    pin: "6305",
    accessLevel: AccessLevel.TEAM_MEMBER,
    pdfDepartment: "Penny Savers Canaan",
    pdfJobTitle: "Janitor",
  },
  {
    employeePublicId: "PS-EMP-PAY-007",
    fullName: "Avion Lovell",
    email: "avion.lovell@prossanitation.com",
    pin: "4178",
    accessLevel: AccessLevel.SUPERVISOR,
    pdfDepartment: "Penny Savers Canaan",
    pdfJobTitle: "Cleaner",
  },
  {
    employeePublicId: "PS-EMP-PAY-008",
    fullName: "Jason Williams",
    email: "jason.williams@prossanitation.com",
    pin: "9052",
    accessLevel: AccessLevel.SUPERVISOR,
    pdfDepartment: "Penny Savers Canaan",
    pdfJobTitle: "Janitor",
  },
  {
    employeePublicId: "PS-EMP-PAY-009",
    fullName: "Shawn Anthony",
    email: "shawn.anthony@prossanitation.com",
    pin: "3681",
    accessLevel: AccessLevel.TEAM_MEMBER,
    pdfDepartment: "Penny Savers Carnbee",
    pdfJobTitle: "Janitor",
  },
  {
    employeePublicId: "PS-EMP-PAY-010",
    fullName: "Tyron Barrow",
    email: "tyron.barrow@prossanitation.com",
    pin: "7429",
    accessLevel: AccessLevel.TEAM_MEMBER,
    pdfDepartment: "Penny Savers Carnbee",
    pdfJobTitle: "Cleaner",
  },
  {
    employeePublicId: "PS-EMP-PAY-011",
    fullName: "Esmine Beckles",
    email: "esmine.beckles@prossanitation.com",
    pin: "5164",
    accessLevel: AccessLevel.TEAM_MEMBER,
    pdfDepartment: "Penny Savers Carnbee",
    pdfJobTitle: "Cleaner",
  },
  {
    employeePublicId: "PS-EMP-PAY-012",
    fullName: "Nyron Denoon",
    email: "nyron.denoon@prossanitation.com",
    pin: "2875",
    accessLevel: AccessLevel.TEAM_MEMBER,
    pdfDepartment: "Penny Savers Carnbee",
    pdfJobTitle: "Cleaner",
  },
  {
    employeePublicId: "PS-EMP-PAY-013",
    fullName: "Denzil Peters",
    email: "denzil.peters@prossanitation.com",
    pin: "6940",
    accessLevel: AccessLevel.TEAM_MEMBER,
    pdfDepartment: "Penny Savers Carnbee",
    pdfJobTitle: "Janitor",
  },
  {
    employeePublicId: "PS-EMP-PAY-014",
    fullName: "Carlos Williams",
    email: "carlos.williams@prossanitation.com",
    pin: "8316",
    accessLevel: AccessLevel.TEAM_MEMBER,
    pdfDepartment: "Penny Savers Carnbee",
    pdfJobTitle: "Cleaner",
  },
  {
    employeePublicId: "PS-EMP-PAY-015",
    fullName: "Jeremiah Brown",
    email: "jeremiah.brown@prossanitation.com",
    pin: "4592",
    accessLevel: AccessLevel.TEAM_MEMBER,
    pdfDepartment: "Penny Savers Scarborough",
    pdfJobTitle: "",
  },
  {
    employeePublicId: "PS-EMP-PAY-016",
    fullName: "Leeroy Kerr",
    email: "leeroy.kerr@prossanitation.com",
    pin: "1208",
    accessLevel: AccessLevel.TEAM_MEMBER,
    pdfDepartment: "Penny Savers Scarborough",
    pdfJobTitle: "",
  },
  {
    employeePublicId: "PS-EMP-PAY-017",
    fullName: "Roxanne O'Brien-Glasgow",
    email: "roxanne.obrienglasgow@prossanitation.com",
    pin: "9731",
    accessLevel: AccessLevel.SUPERVISOR,
    pdfDepartment: "Penny Savers Scarborough",
    pdfJobTitle: "",
  },
  {
    employeePublicId: "PS-EMP-PAY-018",
    fullName: "Cavaney Powder Paris",
    email: "cavaney.powderparis@prossanitation.com",
    pin: "6047",
    accessLevel: AccessLevel.TEAM_MEMBER,
    pdfDepartment: "Penny Savers Scarborough",
    pdfJobTitle: "",
  },
  {
    employeePublicId: "PS-EMP-PAY-019",
    fullName: "Brandon Price",
    email: "brandon.price@prossanitation.com",
    pin: "3529",
    accessLevel: AccessLevel.TEAM_MEMBER,
    pdfDepartment: "Penny Savers Scarborough",
    pdfJobTitle: "Assistant Supervisor",
  },
  {
    employeePublicId: "PS-EMP-PAY-020",
    fullName: "Leon Melville",
    email: "leon.melville@prossanitation.com",
    pin: "7812",
    accessLevel: AccessLevel.TEAM_MEMBER,
    operationalGroup: OperationalGroup.BIN_TECHNICIAN,
    pdfDepartment: "Sanitary Bins",
    pdfJobTitle: "",
  },
  {
    employeePublicId: "PS-EMP-PAY-021",
    fullName: "Beverly Manswell",
    email: "beverly.manswell@prossanitation.com",
    pin: "2684",
    accessLevel: AccessLevel.TEAM_MEMBER,
    pdfDepartment: "West City Mall",
    pdfJobTitle: "Janitor",
  },
];

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "Employee", lastName: "" };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function mapLocationAssignment(pdfDepartment: string): string {
  const normalized = pdfDepartment.trim().toLowerCase();

  if (normalized === "management" || normalized === "div. of infrastucture") {
    return "Office/Admin";
  }
  if (normalized === "penny savers canaan") {
    return "Canaan Pennysaver Grocery";
  }
  if (normalized === "penny savers carnbee") {
    return "Carnbee Pennysaver Grocery";
  }
  if (normalized === "penny savers scarborough") {
    return "Scarborough Pennysaver Grocery";
  }
  if (normalized === "sanitary bins") {
    return "Bin Management Route";
  }
  if (normalized === "west city mall") {
    return "Pennysavers Mall";
  }

  return "Floating/Unassigned";
}

function mapPortalDepartment(pdfDepartment: string): PortalDepartment {
  const normalized = pdfDepartment.trim().toLowerCase();

  if (normalized === "management") {
    return "Management";
  }
  if (normalized === "div. of infrastucture") {
    return "Operations";
  }
  if (normalized === "west city mall") {
    return "Janitorial";
  }
  if (normalized === "sanitary bins") {
    return "Sanitation";
  }

  return "Sanitation";
}

function mapPortalJobTitle(
  seed: PayrollEmployeeSeed,
): PortalJobTitle {
  if (seed.operationalGroup === OperationalGroup.BIN_TECHNICIAN) {
    return "Bin Technician";
  }

  if (seed.accessLevel === AccessLevel.MANAGER) {
    return "Manager";
  }

  if (seed.accessLevel === AccessLevel.SUPERVISOR) {
    return "Supervisor";
  }

  const raw = seed.pdfJobTitle.trim().toLowerCase();

  if (!raw) {
    return "Sanitation Technician";
  }
  if (raw.includes("director") || raw.includes("management")) {
    return "Manager";
  }
  if (raw.includes("supervisor")) {
    return "Supervisor";
  }
  if (raw.includes("bin")) {
    return "Bin Technician";
  }
  if (
    raw.includes("janitor") ||
    raw.includes("cleaner") ||
    raw.includes("part time")
  ) {
    return "Cleaner";
  }

  return "Sanitation Technician";
}

async function upsertPayrollEmployee(
  prisma: PrismaClient,
  seed: PayrollEmployeeSeed,
): Promise<string> {
  const email = seed.email.trim().toLowerCase();
  const { firstName, lastName } = splitName(seed.fullName);
  const name = `${firstName} ${lastName}`.trim();
  const hashedPassword = await hashPassword(seed.pin);
  const operationalGroup = seed.operationalGroup ?? OperationalGroup.GENERAL;
  const locationAssignment = mapLocationAssignment(seed.pdfDepartment);
  const jobTitle = mapPortalJobTitle(seed);
  const department = mapPortalDepartment(seed.pdfDepartment);
  const position = derivePositionFromAccessLevel(seed.accessLevel);

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const userId = randomUUID();
    user = await prisma.user.create({
      data: {
        id: userId,
        name,
        email,
        emailVerified: true,
      },
    });

    await prisma.account.create({
      data: {
        id: randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId: user.id,
        password: hashedPassword,
      },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { name },
    });

    const credentialAccounts = await prisma.account.findMany({
      where: { userId: user.id, providerId: "credential" },
      orderBy: { createdAt: "asc" },
    });

    const [primaryAccount, ...duplicateAccounts] = credentialAccounts;

    if (duplicateAccounts.length > 0) {
      await prisma.account.deleteMany({
        where: { id: { in: duplicateAccounts.map((row) => row.id) } },
      });
    }

    if (primaryAccount) {
      await prisma.account.update({
        where: { id: primaryAccount.id },
        data: {
          accountId: user.id,
          password: hashedPassword,
        },
      });
    } else {
      await prisma.account.create({
        data: {
          id: randomUUID(),
          accountId: user.id,
          providerId: "credential",
          userId: user.id,
          password: hashedPassword,
        },
      });
    }
  }

  const employee = await prisma.employee.upsert({
    where: { userId: user.id },
    update: {
      employeeId: seed.employeePublicId,
      firstName,
      lastName,
      companyEmail: email,
      jobTitle,
      department,
      position,
      locationAssignment,
      accessLevel: seed.accessLevel,
      operationalGroup,
      accountStatus: AccountStatus.ACTIVE,
      employmentStatus: EmploymentStatus.ACTIVE,
    },
    create: {
      userId: user.id,
      employeeId: seed.employeePublicId,
      firstName,
      lastName,
      companyEmail: email,
      jobTitle,
      department,
      position,
      locationAssignment,
      accessLevel: seed.accessLevel,
      operationalGroup,
      accountStatus: AccountStatus.ACTIVE,
      employmentStatus: EmploymentStatus.ACTIVE,
    },
  });

  return employee.id;
}

async function upsertMay2026Payslip(
  prisma: PrismaClient,
  employeeId: string,
  employeeName: string,
): Promise<"created" | "updated"> {
  const existing = await prisma.payslip.findFirst({
    where: {
      employeeId,
      payPeriod: MAY_2026_PAY_PERIOD,
    },
  });

  if (existing) {
    await prisma.payslip.update({
      where: { id: existing.id },
      data: {
        fileName: MAY_2026_PAYSLIP_FILE_NAME,
        fileUrl: MAY_2026_PAYSLIP_FILE_URL,
        uploadedBy: UPLOADED_BY,
      },
    });
    return "updated";
  }

  await prisma.payslip.create({
    data: {
      employeeId,
      employeeName,
      payPeriod: MAY_2026_PAY_PERIOD,
      fileName: MAY_2026_PAYSLIP_FILE_NAME,
      fileUrl: MAY_2026_PAYSLIP_FILE_URL,
      uploadedBy: UPLOADED_BY,
    },
  });

  return "created";
}

export type May2026PayrollSeedResult = {
  accountsCreated: number;
  accountsUpdated: number;
  payslipsCreated: number;
  payslipsUpdated: number;
  skipped: string[];
  credentials: Array<{
    name: string;
    email: string;
    pin: string;
    access: string;
  }>;
};

export async function seedMay2026PayrollEmployees(
  prisma: PrismaClient,
): Promise<May2026PayrollSeedResult> {
  const result: May2026PayrollSeedResult = {
    accountsCreated: 0,
    accountsUpdated: 0,
    payslipsCreated: 0,
    payslipsUpdated: 0,
    skipped: [],
    credentials: [],
  };

  for (const seed of PAYROLL_EMPLOYEES) {
    const existingUser = await prisma.user.findUnique({
      where: { email: seed.email.trim().toLowerCase() },
    });

    const employeeId = await upsertPayrollEmployee(prisma, seed);

    if (existingUser) {
      result.accountsUpdated += 1;
    } else {
      result.accountsCreated += 1;
    }

    const payslipAction = await upsertMay2026Payslip(prisma, employeeId, seed.fullName);
    if (payslipAction === "created") {
      result.payslipsCreated += 1;
    } else {
      result.payslipsUpdated += 1;
    }

    result.credentials.push({
      name: seed.fullName,
      email: seed.email.trim().toLowerCase(),
      pin: seed.pin,
      access:
        seed.operationalGroup === OperationalGroup.BIN_TECHNICIAN
          ? "Bin Technician"
          : derivePositionFromAccessLevel(seed.accessLevel),
    });
  }

  return result;
}

export async function logMay2026PayrollSeedResult(
  result: May2026PayrollSeedResult,
): Promise<void> {
  console.log(
    `May 2026 payroll seed: ${result.accountsCreated} accounts created, ${result.accountsUpdated} updated.`,
  );
  console.log(
    `May 2026 payslips: ${result.payslipsCreated} created, ${result.payslipsUpdated} updated.`,
  );

  if (result.skipped.length > 0) {
    console.log(`Skipped: ${result.skipped.join(", ")}`);
  }

  console.log("May 2026 payroll login credentials:");
  for (const row of result.credentials) {
    console.log(
      `${row.name} | ${row.email} | PIN ${row.pin} | ${row.access}`,
    );
  }
}
