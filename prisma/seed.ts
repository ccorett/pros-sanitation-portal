import {
  AccessLevel,
  AccountStatus,
  ClientLocationStatus,
  EmploymentStatus,
  InventoryCategory,
  NoticeCategory,
  PrismaClient,
} from "@prisma/client";
import { seedAccessTestAccounts } from "./seed-access-test-accounts";
import {
  logMay2026PayrollSeedResult,
  seedMay2026PayrollEmployees,
} from "./seed-may-2026-payroll";

const prisma = new PrismaClient();

const DEMO_EMAIL = "jordan.mitchell@prossanitation.com";

async function main() {
  const existingUser = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
  });

  let employeeId: string | undefined;

  if (existingUser) {
    const employee = await prisma.employee.upsert({
      where: { userId: existingUser.id },
      update: {},
      create: {
        userId: existingUser.id,
        employeeId: "PS-EMP-001",
        firstName: "Jordan",
        lastName: "Mitchell",
        companyEmail: DEMO_EMAIL,
        phoneNumber: "+1-868-555-0142",
        department: "Field Operations",
        jobTitle: "Sanitation Technician",
        supervisorName: "Alex Rivera",
        employmentStatus: EmploymentStatus.ACTIVE,
        accessLevel: AccessLevel.TEAM_MEMBER,
        accountStatus: AccountStatus.ACTIVE,
      },
    });
    employeeId = employee.id;
  } else {
    console.log(
      "No demo auth user found. Bin sites will seed without a default technician assignment.",
    );
  }

  if (employeeId) {
    const clientLocation = await prisma.clientLocation.upsert({
      where: { id: "00000000-0000-4000-8000-000000000001" },
      update: {
        slug: "harbourview-commercial-plaza",
        locationName: "Loading Dock & Waste Enclosure",
      },
      create: {
        id: "00000000-0000-4000-8000-000000000001",
        slug: "harbourview-commercial-plaza",
        locationName: "Loading Dock & Waste Enclosure",
        clientName: "Harbourview Commercial Plaza",
        siteName: "Loading Dock & Waste Enclosure",
        address: "14 Industrial Park Road, Port of Spain",
        contactPerson: "M. Singh",
        contactNumber: "+1-868-555-0198",
        status: ClientLocationStatus.ACTIVE,
      },
    });

  }

  await prisma.internalNotice.upsert({
    where: { id: "00000000-0000-4000-8000-000000000010" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000010",
      title: "Chemical Handling Reminder",
      body: "Updated SDS sheets for degreaser concentrate are available. Full face shield required for bulk mixing at depot.",
      category: NoticeCategory.SAFETY,
      publishedAt: new Date("2026-05-20T05:00:00Z"),
      expiresAt: new Date("2026-06-20T23:59:59Z"),
    },
  });

  await prisma.policy.upsert({
    where: { id: "00000000-0000-4000-8000-000000000020" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000020",
      title: "Field PPE & Site Safety Standard",
      body: "All field staff must wear hi-vis vest, safety boots, and gloves on active client sites. Report incidents within 2 hours to your supervisor.",
      version: "1.2",
      effectiveDate: new Date("2026-01-15"),
    },
  });

  if (employeeId) {
    await prisma.payslip.upsert({
      where: { id: "00000000-0000-4000-8000-000000000030" },
      update: {},
      create: {
        id: "00000000-0000-4000-8000-000000000030",
        employeeId,
        payPeriod: "March 2026",
        fileName: "payslip-march-2026.pdf",
        fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        uploadedBy: "System Seed",
      },
    });
  }

  const inventoryItems = [
    {
      id: "seed-inventory-pressure-washer",
      itemName: "Pressure Washer",
      category: InventoryCategory.EQUIPMENT,
      availableQuantity: 3,
      unit: "unit",
      reorderLevel: 1,
      storageArea: "Equipment Room",
      supplier: "To be confirmed",
    },
    {
      id: "seed-inventory-wet-dry-vacuum",
      itemName: "Wet/Dry Vacuum",
      category: InventoryCategory.EQUIPMENT,
      availableQuantity: 0,
      unit: "unit",
      reorderLevel: 1,
      storageArea: "Equipment Room",
      supplier: "To be confirmed",
    },
    {
      id: "seed-inventory-bin-liners",
      itemName: "Bin Liners",
      category: InventoryCategory.CONSUMABLES,
      availableQuantity: 250,
      unit: "pack",
      reorderLevel: 50,
      storageArea: "Stock Room",
      supplier: "To be confirmed",
    },
    {
      id: "seed-inventory-gloves",
      itemName: "Gloves",
      category: InventoryCategory.PPE,
      availableQuantity: 100,
      unit: "box",
      reorderLevel: 25,
      storageArea: "PPE Shelf",
      supplier: "To be confirmed",
    },
    {
      id: "seed-inventory-disinfectant",
      itemName: "Disinfectant",
      category: InventoryCategory.CHEMICALS,
      availableQuantity: 12,
      unit: "gallon",
      reorderLevel: 5,
      storageArea: "Chemical Store",
      supplier: "To be confirmed",
    },
    {
      id: "seed-inventory-soap",
      itemName: "Soap",
      category: InventoryCategory.CONSUMABLES,
      availableQuantity: 20,
      unit: "case",
      reorderLevel: 5,
      storageArea: "Stock Room",
      supplier: "To be confirmed",
    },
    {
      id: "seed-inventory-paper-towels",
      itemName: "Paper Towels",
      category: InventoryCategory.CONSUMABLES,
      availableQuantity: 8,
      unit: "case",
      reorderLevel: 10,
      storageArea: "Stock Room",
      supplier: "To be confirmed",
    },
  ] as const;

  for (const item of inventoryItems) {
    await prisma.inventoryItem.upsert({
      where: { id: item.id },
      update: {
        itemName: item.itemName,
        category: item.category,
        availableQuantity: item.availableQuantity,
        unit: item.unit,
        reorderLevel: item.reorderLevel,
        storageArea: item.storageArea,
        supplier: item.supplier,
        isActive: true,
      },
      create: {
        id: item.id,
        itemName: item.itemName,
        category: item.category,
        availableQuantity: item.availableQuantity,
        unit: item.unit,
        reorderLevel: item.reorderLevel,
        storageArea: item.storageArea,
        supplier: item.supplier,
      },
    });
  }

  const pennysaverClient = await prisma.binClient.upsert({
    where: { id: "00000000-0000-4000-8000-000000000100" },
    update: { name: "Pennysaver" },
    create: {
      id: "00000000-0000-4000-8000-000000000100",
      name: "Pennysaver",
    },
  });

  const pennysaverSites = [
    {
      id: "00000000-0000-4000-8000-000000000101",
      name: "Scarborough Pennysaver Grocery",
      area: "Scarborough",
      address: "Scarborough Main Road, Tobago",
      expectedRegularBins: 8,
      expectedNewBins: 1,
      weekPattern: "WEEK_1_3" as const,
      serviceDay: "TUESDAY" as const,
    },
    {
      id: "00000000-0000-4000-8000-000000000102",
      name: "Canaan Pennysaver Grocery",
      area: "Canaan",
      address: "Canaan Road, Tobago",
      expectedRegularBins: 6,
      expectedNewBins: 1,
      weekPattern: "WEEK_2_4" as const,
      serviceDay: "WEDNESDAY" as const,
    },
    {
      id: "00000000-0000-4000-8000-000000000103",
      name: "Carnbee Pennysaver Grocery",
      area: "Carnbee",
      address: "Carnbee Main Road, Tobago",
      expectedRegularBins: 7,
      expectedNewBins: 0,
      weekPattern: "WEEK_1_3" as const,
      serviceDay: "THURSDAY" as const,
    },
    {
      id: "00000000-0000-4000-8000-000000000104",
      name: "Carnbee Pennysaver Pharmacy",
      area: "Carnbee",
      address: "Carnbee Pharmacy Lane, Tobago",
      expectedRegularBins: 4,
      expectedNewBins: 0,
      weekPattern: "WEEK_2_4" as const,
      serviceDay: "FRIDAY" as const,
    },
  ];

  for (const siteSeed of pennysaverSites) {
    const site = await prisma.binServiceSite.upsert({
      where: { id: siteSeed.id },
      update: {
        name: siteSeed.name,
        area: siteSeed.area,
        address: siteSeed.address,
      },
      create: {
        id: siteSeed.id,
        clientId: pennysaverClient.id,
        name: siteSeed.name,
        area: siteSeed.area,
        address: siteSeed.address,
      },
    });

    await prisma.binServiceSetup.upsert({
      where: { siteId: site.id },
      update: {
        expectedRegularBins: siteSeed.expectedRegularBins,
        expectedNewBins: siteSeed.expectedNewBins,
        assignedTechnicianId: employeeId ?? null,
        accessInstructions:
          "Use rear service entrance. Ask for store manager if gate is locked.",
        contactName: "Store Manager",
        contactPhone: "+1-868-555-0100",
        signatureRequired: false,
        active: true,
      },
      create: {
        siteId: site.id,
        expectedRegularBins: siteSeed.expectedRegularBins,
        expectedNewBins: siteSeed.expectedNewBins,
        weekPattern: siteSeed.weekPattern,
        serviceDay: siteSeed.serviceDay,
        assignedTechnicianId: employeeId ?? null,
        accessInstructions:
          "Use rear service entrance. Ask for store manager if gate is locked.",
        contactName: "Store Manager",
        contactPhone: "+1-868-555-0100",
        signatureRequired: false,
        active: true,
        nextServiceDate: new Date("2026-05-20"),
      },
    });
  }

  const { seedCleaningClientLocations } = await import("./seed-cleaning-locations");
  await seedCleaningClientLocations(prisma);

  await seedAccessTestAccounts(prisma);

  const payrollSeedResult = await seedMay2026PayrollEmployees(prisma);
  await logMay2026PayrollSeedResult(payrollSeedResult);

  const { seedJobAssignments } = await import("./seed-job-assignments");
  await seedJobAssignments(prisma);

  const { seedCleaningJobs } = await import("./seed-cleaning-jobs");
  await seedCleaningJobs(prisma);

  const binTech = await prisma.employee.findFirst({
    where: { companyEmail: "bin.tech@prossanitation.com" },
  });

  if (binTech) {
    await prisma.binServiceSetup.updateMany({
      where: {
        siteId: {
          in: pennysaverSites.map((site) => site.id),
        },
      },
      data: {
        assignedTechnicianId: binTech.id,
        lastCompletedServiceDate: new Date("2026-04-28"),
        nextServiceDate: new Date("2026-05-18"),
      },
    });

    for (const siteSeed of pennysaverSites) {
      const setup = await prisma.binServiceSetup.findUnique({
        where: { siteId: siteSeed.id },
      });
      if (setup?.active) {
        const { ensureOpenJobForSetup } = await import(
          "../src/lib/bin-service/service"
        );
        await ensureOpenJobForSetup(setup);
      }
    }
  }

  const { seedDemoVacationRequest } = await import(
    "../src/lib/vacation-request-service"
  );
  const teamMember = await prisma.employee.findFirst({
    where: { companyEmail: "team.member@prossanitation.com" },
  });
  if (teamMember) {
    await seedDemoVacationRequest(teamMember);
    const { seedDemoJobLetterRequest } = await import(
      "../src/lib/job-letter-request-service"
    );
    await seedDemoJobLetterRequest(teamMember);
    const { seedDemoPayslipRequest } = await import(
      "../src/lib/payslip-request-service"
    );
    await seedDemoPayslipRequest(teamMember);
  }

  console.log(
    `Seed complete: platform records, ${inventoryItems.length} inventory items, access-level test accounts, and demo HR requests are ready.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
