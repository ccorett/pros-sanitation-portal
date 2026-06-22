/**
 * Verifies invoice management: due dates, status colours, actions, permissions, reminders.
 * Run: npx tsx scripts/test-invoice-management.ts
 */
import {
  AccessLevel,
  InvoiceBillingCycle,
  InvoiceScheduleStatus,
  InvoiceServiceType,
  EmployeeResponsibility,
} from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import {
  buildInvoiceAccessContext,
  canAccessInvoiceManagement,
  canManageInvoiceAlertRecipients,
  canManageInvoiceClients,
  canProcessInvoiceSchedules,
  canSendInvoiceStatusEmail,
} from "../src/lib/invoice-access";
import { buildManualStatusUpdateEmailBody } from "../src/lib/invoice-email";
import {
  computeDueDateForCycle,
  computeNextCycle,
  computeReminderDate,
  createInvoiceAlertRecipient,
  createInvoiceClient,
  deriveScheduleStatus,
  getInvoiceStatusEmailSummary,
  listInvoiceClients,
  markInvoiceScheduleGenerated,
  markInvoiceScheduleSubmitted,
  sendInvoiceReminders,
  sendManualInvoiceStatusUpdate,
  snoozeInvoiceSchedule,
  softRemoveInvoiceClient,
} from "../src/lib/invoice-service";
import { InvoiceAlertLogType } from "@prisma/client";
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
  assert(canManageInvoiceAlertRecipients(adminCtx), "Admin should manage recipients");
  assert(
    !canManageInvoiceAlertRecipients(assistantCtx),
    "Admin assistant should not manage recipients",
  );
  assert(canProcessInvoiceSchedules(assistantCtx), "Admin assistant should process schedules");
  assert(canSendInvoiceStatusEmail(adminCtx), "Admin should send status emails");
  assert(canSendInvoiceStatusEmail(assistantCtx), "Admin assistant should send status emails");
  assert(!canSendInvoiceStatusEmail(memberCtx), "Team member should not send status emails");

  const statusEmailBody = buildManualStatusUpdateEmailBody({
    sentAt: "2026-06-03",
    sentBy: "Test Admin",
    summary: {
      dueSoon: 1,
      dueToday: 2,
      overdue: 0,
      generated: 3,
      submitted: 4,
      snoozed: 1,
    },
    schedules: [
      {
        clientName: "Sample Client",
        serviceTypeLabel: "Cleaning Services",
        billingCycleLabel: "Monthly",
        dueDate: "2026-06-01",
        statusLabel: "Due Soon",
        remarks: "Test remark",
      },
    ],
  });
  assert(statusEmailBody.includes("Invoice Status Update"), "Status email should include title");
  assert(statusEmailBody.includes("Due Soon: 1"), "Status email should include summary counts");
  assert(statusEmailBody.includes("Sample Client"), "Status email should include schedule rows");

  const summary = await getInvoiceStatusEmailSummary();
  assert(
    typeof summary.generated === "number" && typeof summary.submitted === "number",
    "Status summary should include generated and submitted counts",
  );

  const manualStatusWithoutRecipients = await sendManualInvoiceStatusUpdate({
    sentBy: "Invoice Test",
  });
  assert(!manualStatusWithoutRecipients.ok, "Manual status send should fail without recipients");

  const manualStatusLog = await prisma.invoiceAlertLog.findFirst({
    where: { alertType: InvoiceAlertLogType.MANUAL_STATUS_UPDATE },
    orderBy: { createdAt: "desc" },
  });
  assert(manualStatusLog !== null, "Manual status send should create InvoiceAlertLog entry");
  assert(manualStatusLog?.sentBy === "Invoice Test", "Manual status log should record sentBy");

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
  assert(
    getInvoiceStatusColor(dueSoonStatus) === "yellow",
    "Due soon should be yellow",
  );

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
  const nextDueDate = created.nextDueDate;
  assert(nextDueDate.endsWith("-01"), "Next due date should fall on the 1st");

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

  await markInvoiceScheduleGenerated(scheduleId);
  const generated = await prisma.invoiceSchedule.findUniqueOrThrow({
    where: { id: scheduleId },
  });
  assert(generated.generatedAt !== null, "Generated should set generatedAt");

  await markInvoiceScheduleSubmitted(scheduleId);
  const submitted = await prisma.invoiceSchedule.findUniqueOrThrow({
    where: { id: scheduleId },
  });
  assert(submitted.status === InvoiceScheduleStatus.SUBMITTED, "Submitted should set status");
  assert(getInvoiceStatusColor(InvoiceScheduleStatus.SUBMITTED) === "green", "Submitted is green");

  await createInvoiceAlertRecipient({
    name: "Invoice Test Recipient",
    email: `invoice-test-${Date.now()}@example.com`,
    roleLabel: "Test",
  });

  const reminderResults = await sendInvoiceReminders();
  assert(
    typeof reminderResults === "object" && reminderResults !== null,
    "Reminder results should be an object",
  );
  assert(
    "fiveDayEmailsSent" in reminderResults && "dueDateEmailsSent" in reminderResults,
    "Reminder results should include email counters",
  );

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
    reminderRuns:
      reminderResults.fiveDayEmailsSent + reminderResults.dueDateEmailsSent,
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
