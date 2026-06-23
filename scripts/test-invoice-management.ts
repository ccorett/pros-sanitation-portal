/**
 * Verifies invoice management: due dates, status colours, actions, permissions, notifications.
 * Run: npx tsx scripts/test-invoice-management.ts
 */
import {
  AccessLevel,
  InvoiceBillingCycle,
  InvoiceNotificationType,
  InvoiceScheduleStatus,
  InvoiceServiceType,
  EmployeeResponsibility,
} from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import {
  buildInvoiceAccessContext,
  canAccessInvoiceManagement,
  canManageInvoiceClients,
  canProcessInvoiceSchedules,
} from "../src/lib/invoice-access";
import {
  countUnreadInvoiceNotifications,
  listInvoiceNotifications,
  markInvoiceNotificationRead,
  syncInvoiceDueNotifications,
} from "../src/lib/invoice-notification-service";
import {
  computeDueDateForCycle,
  computeNextCycle,
  computeReminderDate,
  createInvoiceClient,
  deriveScheduleStatus,
  listInvoiceClients,
  markInvoiceScheduleGenerated,
  markInvoiceScheduleSubmitted,
  refreshScheduleStatuses,
  snoozeInvoiceSchedule,
  softRemoveInvoiceClient,
} from "../src/lib/invoice-service";
import { getInvoiceStatusColor } from "../src/lib/invoice-status";

const prisma = new PrismaClient();

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

async function main() {
  const testClientName = `Invoice Test Client ${Date.now()}`;

  const adminCtx = buildInvoiceAccessContext(
    {
      id: "admin-test",
      accessLevel: AccessLevel.ADMIN,
      operationalGroup: "OFFICE",
    } as never,
    [],
  );
  const assistantCtx = buildInvoiceAccessContext(
    {
      id: "assistant-test",
      accessLevel: AccessLevel.TEAM_MEMBER,
      operationalGroup: "OFFICE",
    } as never,
    [EmployeeResponsibility.ADMIN_ASSISTANT],
  );
  const memberCtx = buildInvoiceAccessContext(
    {
      id: "member-test",
      accessLevel: AccessLevel.TEAM_MEMBER,
      operationalGroup: "OFFICE",
    } as never,
    [],
  );

  assert(canAccessInvoiceManagement(adminCtx), "Admin should access invoices");
  assert(canAccessInvoiceManagement(assistantCtx), "Admin assistant should access invoices");
  assert(!canAccessInvoiceManagement(memberCtx), "Team member should not access invoices");
  assert(canManageInvoiceClients(adminCtx), "Admin should manage clients");
  assert(!canManageInvoiceClients(assistantCtx), "Admin assistant should not manage clients");
  assert(canProcessInvoiceSchedules(assistantCtx), "Admin assistant should process schedules");

  const nextCycle = computeNextCycle({ billingCycle: InvoiceBillingCycle.MONTHLY });
  const dueDate = computeDueDateForCycle({
    billingCycle: InvoiceBillingCycle.MONTHLY,
    usualDueDay: 1,
    cycleMonth: nextCycle.cycleMonth,
    cycleYear: nextCycle.cycleYear,
  });
  assert(dueDate.getUTCDate() === 1, "Monthly due date should default to the 1st");

  const reminderDate = computeReminderDate(dueDate);
  const reminderDiff =
    (dueDate.getTime() - reminderDate.getTime()) / (1000 * 60 * 60 * 24);
  assert(reminderDiff === 5, "Reminder should be 5 days before due date");

  const dueSoonStatus = deriveScheduleStatus(
    {
      status: InvoiceScheduleStatus.UPCOMING,
      dueDate,
      reminderDate,
      submittedAt: null,
      snoozedUntil: null,
    },
    startOfUtcDay(reminderDate),
  );
  assert(dueSoonStatus === InvoiceScheduleStatus.DUE_SOON, "Should be DUE_SOON on reminder date");
  assert(getInvoiceStatusColor(dueSoonStatus) === "yellow", "Due soon should be yellow");

  const dueStatus = deriveScheduleStatus(
    {
      status: InvoiceScheduleStatus.UPCOMING,
      dueDate,
      reminderDate,
      submittedAt: null,
      snoozedUntil: null,
    },
    startOfUtcDay(dueDate),
  );
  assert(dueStatus === InvoiceScheduleStatus.DUE, "Should be DUE on due date");
  assert(getInvoiceStatusColor(dueStatus) === "red", "Due should be red");

  await createInvoiceClient({
    clientName: testClientName,
    serviceType: InvoiceServiceType.CLEANING_SERVICES,
    billingCycle: InvoiceBillingCycle.MONTHLY,
    invoiceCountPerCycle: 2,
    usualDueDay: 1,
    remarks: "Automated test client",
  });

  let duplicateBlocked = false;
  try {
    await createInvoiceClient({
      clientName: testClientName,
      serviceType: InvoiceServiceType.CLEANING_SERVICES,
      billingCycle: InvoiceBillingCycle.MONTHLY,
      invoiceCountPerCycle: 1,
    });
  } catch {
    duplicateBlocked = true;
  }
  assert(
    duplicateBlocked,
    "Duplicate client name + service type + billing cycle should be rejected",
  );

  await createInvoiceClient({
    clientName: testClientName,
    serviceType: InvoiceServiceType.BIN_SERVICES,
    billingCycle: InvoiceBillingCycle.MONTHLY,
    invoiceCountPerCycle: 1,
    remarks: "Same client, different service type",
  });

  const clients = await listInvoiceClients();
  const created = clients.find(
    (row) =>
      row.clientName === testClientName &&
      row.serviceType === InvoiceServiceType.CLEANING_SERVICES,
  );
  if (!created) {
    throw new Error("Created client should appear in list");
  }
  if (!created.nextDueDate) {
    throw new Error("Next due date should be set");
  }
  assert(created.nextDueDate.endsWith("-01"), "Next due date should fall on the 1st");

  const schedules = await prisma.invoiceSchedule.findMany({
    where: { clientId: created.id },
    orderBy: { dueDate: "asc" },
  });
  assert(schedules.length >= 1, "Schedule rows should be created");

  const scheduleId = schedules[0].id;

  await snoozeInvoiceSchedule(scheduleId, {
    snoozeDays: 3,
    remarks: "Test snooze",
  });
  const snoozed = await prisma.invoiceSchedule.findUniqueOrThrow({
    where: { id: scheduleId },
  });
  assert(snoozed.status === InvoiceScheduleStatus.SNOOZED, "Snooze should set SNOOZED status");
  assert(getInvoiceStatusColor(InvoiceScheduleStatus.SNOOZED) === "blue", "Snoozed should be blue");

  await markInvoiceScheduleGenerated(scheduleId, "Invoice Test");
  const generated = await prisma.invoiceSchedule.findUniqueOrThrow({
    where: { id: scheduleId },
  });
  assert(generated.generatedAt !== null, "Generated should set generatedAt");

  const generatedNotification = await prisma.invoiceNotification.findFirst({
    where: {
      invoiceId: scheduleId,
      type: InvoiceNotificationType.GENERATED,
    },
  });
  assert(generatedNotification !== null, "Generated should create platform notification");
  assert(
    generatedNotification!.message.includes(testClientName),
    "Generated notification should include client name",
  );

  await markInvoiceScheduleSubmitted(scheduleId, "Invoice Test");
  const submitted = await prisma.invoiceSchedule.findUniqueOrThrow({
    where: { id: scheduleId },
  });
  assert(submitted.status === InvoiceScheduleStatus.SUBMITTED, "Submitted should set status");
  assert(getInvoiceStatusColor(InvoiceScheduleStatus.SUBMITTED) === "green", "Submitted is green");

  const submittedNotification = await prisma.invoiceNotification.findFirst({
    where: {
      invoiceId: scheduleId,
      type: InvoiceNotificationType.SUBMITTED,
    },
  });
  assert(submittedNotification !== null, "Submitted should create platform notification");

  await refreshScheduleStatuses();
  const syncResults = await syncInvoiceDueNotifications();
  assert(
    typeof syncResults.dueSoonCreated === "number",
    "Sync should return due soon counter",
  );

  const unreadBefore = await countUnreadInvoiceNotifications();
  assert(typeof unreadBefore === "number", "Unread count should be a number");

  if (generatedNotification) {
    await markInvoiceNotificationRead(generatedNotification.id, {
      name: "Invoice Test",
      email: "test@example.com",
    });
    const audit = await prisma.invoiceNotificationAuditLog.findFirst({
      where: { notificationId: generatedNotification.id },
      orderBy: { createdAt: "desc" },
    });
    assert(audit !== null, "Mark read should create audit log");
  }

  const unreadNotifications = await listInvoiceNotifications("unread");
  assert(Array.isArray(unreadNotifications), "Unread filter should return list");

  await softRemoveInvoiceClient(created.id);

  const clientsAfterCreate = await listInvoiceClients();
  const binClient = clientsAfterCreate.find(
    (row) =>
      row.clientName === testClientName &&
      row.serviceType === InvoiceServiceType.BIN_SERVICES,
  );
  if (binClient) {
    await softRemoveInvoiceClient(binClient.id);
  }

  const afterRemove = await listInvoiceClients();
  assert(
    !afterRemove.some((row) => row.id === created.id),
    "Removed client should be hidden from active list",
  );

  const removedRecord = await prisma.invoiceClient.findUnique({
    where: { id: created.id },
  });
  assert(removedRecord?.status === "REMOVED", "Soft delete should keep REMOVED status");

  console.log("Invoice management flow OK:", {
    testClientName,
    nextDueDate: created.nextDueDate,
    syncResults,
    unreadBefore,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
