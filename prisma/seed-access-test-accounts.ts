import {
  AccessLevel,
  AccountStatus,
  EmployeeResponsibility,
  EmploymentStatus,
  OperationalGroup,
  PrismaClient,
} from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";

type TestAccountSeed = {
  email: string;
  pin: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  accessLevel: AccessLevel;
  accountStatus: AccountStatus;
  jobTitle: string;
  operationalGroup?: OperationalGroup;
  locationAssignment?: string;
  supervisorName?: string;
  department?: string;
  responsibilities?: EmployeeResponsibility[];
};

const TEST_ACCOUNTS: TestAccountSeed[] = [
  {
    email: "pending@prossanitation.com",
    pin: "1111",
    firstName: "Pending",
    lastName: "Verification",
    employeeId: "PS-EMP-TEST-001",
    accessLevel: AccessLevel.PENDING_VERIFICATION,
    accountStatus: AccountStatus.PENDING,
    jobTitle: "Pending Verification Test",
  },
  {
    email: "team.member@prossanitation.com",
    pin: "2222",
    firstName: "Team",
    lastName: "Member",
    employeeId: "PS-EMP-TEST-002",
    accessLevel: AccessLevel.TEAM_MEMBER,
    accountStatus: AccountStatus.ACTIVE,
    jobTitle: "Sanitation Technician",
    operationalGroup: OperationalGroup.GENERAL,
    locationAssignment: "Scarborough Pennysaver Grocery",
    supervisorName: "Field Supervisor",
  },
  {
    email: "supervisor@prossanitation.com",
    pin: "3333",
    firstName: "Field",
    lastName: "Supervisor",
    employeeId: "PS-EMP-TEST-003",
    accessLevel: AccessLevel.SUPERVISOR,
    accountStatus: AccountStatus.ACTIVE,
    jobTitle: "Operations Supervisor",
    operationalGroup: OperationalGroup.GENERAL,
    locationAssignment: "Scarborough Pennysaver Grocery",
  },
  {
    email: "manager@prossanitation.com",
    pin: "4444",
    firstName: "Operations",
    lastName: "Manager",
    employeeId: "PS-EMP-TEST-004",
    accessLevel: AccessLevel.MANAGER,
    accountStatus: AccountStatus.ACTIVE,
    jobTitle: "Operations Manager",
    operationalGroup: OperationalGroup.GENERAL,
  },
  {
    email: "admin@prossanitation.com",
    pin: "5555",
    firstName: "Portal",
    lastName: "Admin",
    employeeId: "PS-EMP-TEST-005",
    accessLevel: AccessLevel.ADMIN,
    accountStatus: AccountStatus.ACTIVE,
    jobTitle: "Portal Administrator",
    operationalGroup: OperationalGroup.GENERAL,
  },
  {
    email: "test.employee@prossanitation.com",
    pin: "6666",
    firstName: "Super",
    lastName: "Admin",
    employeeId: "PS-EMP-TEST-006",
    accessLevel: AccessLevel.SUPER_ADMIN,
    accountStatus: AccountStatus.ACTIVE,
    jobTitle: "Super Administrator",
    operationalGroup: OperationalGroup.GENERAL,
  },
  {
    email: "bin.tech@prossanitation.com",
    pin: "7777",
    firstName: "Bin",
    lastName: "Technician",
    employeeId: "PS-EMP-TEST-007",
    accessLevel: AccessLevel.TEAM_MEMBER,
    accountStatus: AccountStatus.ACTIVE,
    jobTitle: "Bin Service Technician",
    operationalGroup: OperationalGroup.BIN_TECHNICIAN,
    locationAssignment: "Bin Management Route",
    supervisorName: "Bin Service Supervisor",
  },
  {
    email: "bin.supervisor@prossanitation.com",
    pin: "8888",
    firstName: "Bin",
    lastName: "Supervisor",
    employeeId: "PS-EMP-TEST-008",
    accessLevel: AccessLevel.SUPERVISOR,
    accountStatus: AccountStatus.ACTIVE,
    jobTitle: "Bin Service Supervisor",
    operationalGroup: OperationalGroup.BIN_SERVICE_SUPERVISOR,
    locationAssignment: "Bin Management Route",
  },
  {
    email: "kurt.allong@prossanitation.com",
    pin: "4927",
    firstName: "Kurt",
    lastName: "Allong",
    employeeId: "PS-EMP-DEL-001",
    accessLevel: AccessLevel.TEAM_MEMBER,
    accountStatus: AccountStatus.ACTIVE,
    jobTitle: "Driver",
    department: "Operations",
    locationAssignment: "Office/Admin",
    supervisorName: "Operations Manager",
    responsibilities: [
      EmployeeResponsibility.DRIVER,
      EmployeeResponsibility.STOCK_ACCESS,
    ],
  },
  {
    email: "delivery.coordinator@prossanitation.com",
    pin: "4931",
    firstName: "Delivery",
    lastName: "Coordinator",
    employeeId: "PS-EMP-DEL-002",
    accessLevel: AccessLevel.SUPERVISOR,
    accountStatus: AccountStatus.ACTIVE,
    jobTitle: "Delivery Coordinator",
    department: "Operations",
    locationAssignment: "Office/Admin",
    responsibilities: [
      EmployeeResponsibility.GENERAL_OPERATIONS,
      EmployeeResponsibility.DELIVERY_COORDINATOR,
      EmployeeResponsibility.STOCK_ACCESS,
    ],
  },
];

async function upsertCredentialUser(
  prisma: PrismaClient,
  account: TestAccountSeed,
) {
  const email = account.email.trim().toLowerCase();
  const name = `${account.firstName} ${account.lastName}`;
  const hashedPassword = await hashPassword(account.pin);
  const operationalGroup = account.operationalGroup ?? OperationalGroup.GENERAL;

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

  const responsibilities =
    account.responsibilities ??
    (operationalGroup === OperationalGroup.BIN_SERVICE_SUPERVISOR
      ? [
          EmployeeResponsibility.GENERAL_OPERATIONS,
          EmployeeResponsibility.BIN_SERVICE_SUPERVISOR,
        ]
      : operationalGroup === OperationalGroup.BIN_TECHNICIAN
        ? [
            EmployeeResponsibility.GENERAL_OPERATIONS,
            EmployeeResponsibility.BIN_TECHNICIAN,
          ]
        : [EmployeeResponsibility.GENERAL_OPERATIONS]);

  const employee = await prisma.employee.upsert({
    where: { userId: user.id },
    update: {
      firstName: account.firstName,
      lastName: account.lastName,
      companyEmail: email,
      jobTitle: account.jobTitle,
      department: account.department ?? "Operations",
      accessLevel: account.accessLevel,
      operationalGroup,
      accountStatus: account.accountStatus,
      employmentStatus: EmploymentStatus.ACTIVE,
      locationAssignment: account.locationAssignment ?? null,
      supervisorName: account.supervisorName ?? null,
    },
    create: {
      userId: user.id,
      employeeId: account.employeeId,
      firstName: account.firstName,
      lastName: account.lastName,
      companyEmail: email,
      department: account.department ?? "Operations",
      jobTitle: account.jobTitle,
      accessLevel: account.accessLevel,
      operationalGroup,
      accountStatus: account.accountStatus,
      employmentStatus: EmploymentStatus.ACTIVE,
      locationAssignment: account.locationAssignment ?? null,
      supervisorName: account.supervisorName ?? null,
    },
  });

  await prisma.employeeResponsibilityEntry.deleteMany({
    where: { employeeId: employee.id },
  });

  await prisma.employeeResponsibilityEntry.createMany({
    data: responsibilities.map((responsibility) => ({
      employeeId: employee.id,
      responsibility,
    })),
  });

  return email;
}

export async function seedAccessTestAccounts(prisma: PrismaClient) {
  for (const account of TEST_ACCOUNTS) {
    const email = await upsertCredentialUser(prisma, account);
    console.log(
      `Seeded ${email} (${account.accessLevel}, ${account.operationalGroup ?? OperationalGroup.GENERAL}) PIN ${account.pin}`,
    );
  }
}
