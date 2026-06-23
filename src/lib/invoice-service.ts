import {
  InvoiceBillingCycle,
  InvoiceClientStatus,
  InvoiceScheduleStatus,
  InvoiceServiceType,
  type InvoiceClient,
  type InvoiceSchedule,
} from "@prisma/client";
import { invoiceStatusLabel } from "@/lib/invoice-status";
import { prisma } from "@/lib/prisma";

const TERMINAL_SCHEDULE_STATUSES: InvoiceScheduleStatus[] = [
  InvoiceScheduleStatus.SUBMITTED,
];

export type InvoiceClientRow = {
  id: string;
  clientName: string;
  serviceType: InvoiceServiceType;
  billingCycle: InvoiceBillingCycle;
  invoiceCountPerCycle: number;
  usualDueDay: number;
  annualDueMonth: number | null;
  status: InvoiceClientStatus;
  remarks: string | null;
  nextDueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceScheduleRow = {
  id: string;
  clientId: string;
  clientName: string;
  serviceType: InvoiceServiceType;
  billingCycle: InvoiceBillingCycle;
  invoiceCountPerCycle: number;
  cycleLabel: string;
  cycleMonth: number;
  cycleYear: number;
  reminderDate: string;
  dueDate: string;
  status: InvoiceScheduleStatus;
  statusLabel: string;
  generatedAt: string | null;
  submittedAt: string | null;
  snoozedUntil: string | null;
  remarks: string | null;
  updatedAt: string;
};

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return startOfUtcDay(next);
}

function clampDueDay(day: number): number {
  return Math.min(28, Math.max(1, day));
}

function clampAnnualMonth(month: number): number {
  return Math.min(12, Math.max(1, month));
}

export function parseInvoiceMonthLabel(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s+/g, " ");
  if (!cleaned || /&|\band\b/i.test(cleaned)) {
    return null;
  }

  const key = cleaned.toLowerCase();
  const monthMap: Record<string, number> = {
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    sept: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12,
  };

  return monthMap[key] ?? null;
}

async function assertUniqueInvoiceClient(input: {
  clientName: string;
  serviceType: InvoiceServiceType;
  billingCycle: InvoiceBillingCycle;
  excludeId?: string;
}) {
  const existing = await prisma.invoiceClient.findFirst({
    where: {
      clientName: input.clientName.trim(),
      serviceType: input.serviceType,
      billingCycle: input.billingCycle,
      status: { not: InvoiceClientStatus.REMOVED },
      ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
    },
    select: { id: true },
  });

  if (existing) {
    throw new Error(
      "A recurring client with this client name, service type, and billing cycle already exists.",
    );
  }
}

export function computeDueDateForCycle(input: {
  billingCycle: InvoiceBillingCycle;
  usualDueDay: number;
  cycleMonth: number;
  cycleYear: number;
}): Date {
  const dueDay = clampDueDay(input.usualDueDay);
  if (input.billingCycle === InvoiceBillingCycle.ANNUALLY) {
    return startOfUtcDay(
      new Date(Date.UTC(input.cycleYear, input.cycleMonth - 1, dueDay)),
    );
  }
  return startOfUtcDay(
    new Date(Date.UTC(input.cycleYear, input.cycleMonth - 1, dueDay)),
  );
}

export function computeReminderDate(dueDate: Date): Date {
  return addUtcDays(dueDate, -5);
}

export function computeNextCycle(input: {
  billingCycle: InvoiceBillingCycle;
  annualDueMonth?: number | null;
  reference?: Date;
}): { cycleMonth: number; cycleYear: number } {
  const reference = startOfUtcDay(input.reference ?? new Date());
  if (input.billingCycle === InvoiceBillingCycle.ANNUALLY) {
    const month = clampAnnualMonth(input.annualDueMonth ?? 1);
    const year = reference.getUTCFullYear();
    const dueThisYear = startOfUtcDay(new Date(Date.UTC(year, month - 1, 1)));
    if (reference.getTime() <= dueThisYear.getTime()) {
      return { cycleMonth: month, cycleYear: year };
    }
    return { cycleMonth: month, cycleYear: year + 1 };
  }

  const nextMonthDate = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 1),
  );
  return {
    cycleMonth: nextMonthDate.getUTCMonth() + 1,
    cycleYear: nextMonthDate.getUTCFullYear(),
  };
}

export function deriveScheduleStatus(
  schedule: Pick<
    InvoiceSchedule,
    "status" | "dueDate" | "reminderDate" | "submittedAt" | "snoozedUntil"
  >,
  today = startOfUtcDay(new Date()),
): InvoiceScheduleStatus {
  if (schedule.submittedAt || schedule.status === InvoiceScheduleStatus.SUBMITTED) {
    return InvoiceScheduleStatus.SUBMITTED;
  }

  if (
    schedule.status === InvoiceScheduleStatus.SNOOZED &&
    schedule.snoozedUntil &&
    startOfUtcDay(schedule.snoozedUntil) > today
  ) {
    return InvoiceScheduleStatus.SNOOZED;
  }

  if (schedule.status === InvoiceScheduleStatus.GENERATED) {
    const due = startOfUtcDay(schedule.dueDate);
    if (today.getTime() >= due.getTime()) {
      return InvoiceScheduleStatus.DUE;
    }
    const reminder = startOfUtcDay(schedule.reminderDate);
    if (today.getTime() >= reminder.getTime()) {
      return InvoiceScheduleStatus.DUE_SOON;
    }
    return InvoiceScheduleStatus.GENERATED;
  }

  const due = startOfUtcDay(schedule.dueDate);
  const reminder = startOfUtcDay(schedule.reminderDate);

  if (today.getTime() > due.getTime()) {
    return InvoiceScheduleStatus.OVERDUE;
  }
  if (today.getTime() === due.getTime()) {
    return InvoiceScheduleStatus.DUE;
  }
  if (today.getTime() >= reminder.getTime()) {
    return InvoiceScheduleStatus.DUE_SOON;
  }
  return InvoiceScheduleStatus.UPCOMING;
}

function cycleLabel(month: number, year: number, billingCycle: InvoiceBillingCycle): string {
  if (billingCycle === InvoiceBillingCycle.ANNUALLY) {
    return String(year);
  }
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function refreshScheduleStatuses(scheduleIds?: string[]) {
  const schedules = await prisma.invoiceSchedule.findMany({
    where: scheduleIds ? { id: { in: scheduleIds } } : undefined,
  });

  const today = startOfUtcDay(new Date());
  await Promise.all(
    schedules.map(async (schedule) => {
      if (TERMINAL_SCHEDULE_STATUSES.includes(schedule.status)) {
        return;
      }
      const nextStatus = deriveScheduleStatus(schedule, today);
      if (nextStatus !== schedule.status) {
        await prisma.invoiceSchedule.update({
          where: { id: schedule.id },
          data: { status: nextStatus },
        });
      }
    }),
  );
}

async function ensureScheduleForClient(
  client: InvoiceClient,
  cycleMonth: number,
  cycleYear: number,
) {
  const dueDate = computeDueDateForCycle({
    billingCycle: client.billingCycle,
    usualDueDay: client.usualDueDay,
    cycleMonth,
    cycleYear,
  });
  const reminderDate = computeReminderDate(dueDate);
  const status = deriveScheduleStatus({
    status: InvoiceScheduleStatus.UPCOMING,
    dueDate,
    reminderDate,
    submittedAt: null,
    snoozedUntil: null,
  });

  return prisma.invoiceSchedule.upsert({
    where: {
      clientId_cycleMonth_cycleYear: {
        clientId: client.id,
        cycleMonth,
        cycleYear,
      },
    },
    create: {
      clientId: client.id,
      cycleMonth,
      cycleYear,
      dueDate,
      reminderDate,
      status,
    },
    update: {
      dueDate,
      reminderDate,
    },
  });
}

async function ensureUpcomingSchedulesForClient(client: InvoiceClient) {
  const current = computeNextCycle({
    billingCycle: client.billingCycle,
    annualDueMonth: client.annualDueMonth,
    reference: new Date(),
  });
  await ensureScheduleForClient(client, current.cycleMonth, current.cycleYear);

  if (client.billingCycle === InvoiceBillingCycle.MONTHLY) {
    const next = computeNextCycle({
      billingCycle: client.billingCycle,
      annualDueMonth: client.annualDueMonth,
      reference: addUtcDays(startOfUtcDay(new Date()), 32),
    });
    await ensureScheduleForClient(client, next.cycleMonth, next.cycleYear);
  }
}

function serializeClient(
  client: InvoiceClient & { schedules: InvoiceSchedule[] },
): InvoiceClientRow {
  const activeSchedules = client.schedules
    .filter((schedule) => schedule.status !== InvoiceScheduleStatus.SUBMITTED)
    .sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime());

  return {
    id: client.id,
    clientName: client.clientName,
    serviceType: client.serviceType,
    billingCycle: client.billingCycle,
    invoiceCountPerCycle: client.invoiceCountPerCycle,
    usualDueDay: client.usualDueDay,
    annualDueMonth: client.annualDueMonth,
    status: client.status,
    remarks: client.remarks,
    nextDueDate: activeSchedules[0] ? formatIsoDate(activeSchedules[0].dueDate) : null,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  };
}

function serializeSchedule(
  schedule: InvoiceSchedule & {
    client: Pick<
      InvoiceClient,
      "clientName" | "serviceType" | "billingCycle" | "invoiceCountPerCycle" | "status"
    >;
  },
): InvoiceScheduleRow {
  const status = deriveScheduleStatus(schedule);
  return {
    id: schedule.id,
    clientId: schedule.clientId,
    clientName: schedule.client.clientName,
    serviceType: schedule.client.serviceType,
    billingCycle: schedule.client.billingCycle,
    invoiceCountPerCycle: schedule.client.invoiceCountPerCycle,
    cycleLabel: cycleLabel(
      schedule.cycleMonth,
      schedule.cycleYear,
      schedule.client.billingCycle,
    ),
    cycleMonth: schedule.cycleMonth,
    cycleYear: schedule.cycleYear,
    reminderDate: formatIsoDate(schedule.reminderDate),
    dueDate: formatIsoDate(schedule.dueDate),
    status,
    statusLabel: invoiceStatusLabel(status),
    generatedAt: schedule.generatedAt?.toISOString() ?? null,
    submittedAt: schedule.submittedAt?.toISOString() ?? null,
    snoozedUntil: schedule.snoozedUntil
      ? formatIsoDate(schedule.snoozedUntil)
      : null,
    remarks: schedule.remarks,
    updatedAt: schedule.updatedAt.toISOString(),
  };
}

export async function listInvoiceClients(options?: {
  includeRemoved?: boolean;
}): Promise<InvoiceClientRow[]> {
  await refreshScheduleStatuses();

  const clients = await prisma.invoiceClient.findMany({
    where: options?.includeRemoved
      ? undefined
      : { status: { not: InvoiceClientStatus.REMOVED } },
    include: {
      schedules: {
        where: { status: { not: InvoiceScheduleStatus.SUBMITTED } },
        orderBy: { dueDate: "asc" },
        take: 3,
      },
    },
    orderBy: [{ status: "asc" }, { clientName: "asc" }, { serviceType: "asc" }],
  });

  return clients.map(serializeClient);
}

export async function listInvoiceSchedules(options?: {
  includeSubmitted?: boolean;
}): Promise<InvoiceScheduleRow[]> {
  await refreshScheduleStatuses();

  const schedules = await prisma.invoiceSchedule.findMany({
    where: {
      client: { status: { not: InvoiceClientStatus.REMOVED } },
      ...(options?.includeSubmitted
        ? {}
        : { status: { not: InvoiceScheduleStatus.SUBMITTED } }),
    },
    include: {
      client: {
        select: {
          clientName: true,
          serviceType: true,
          billingCycle: true,
          invoiceCountPerCycle: true,
          status: true,
        },
      },
    },
    orderBy: [{ dueDate: "asc" }, { client: { clientName: "asc" } }],
  });

  return schedules.map(serializeSchedule);
}

export async function createInvoiceClient(input: {
  clientName: string;
  serviceType: InvoiceServiceType;
  billingCycle: InvoiceBillingCycle;
  invoiceCountPerCycle: number;
  usualDueDay?: number;
  annualDueMonth?: number | null;
  remarks?: string | null;
}) {
  await assertUniqueInvoiceClient({
    clientName: input.clientName,
    serviceType: input.serviceType,
    billingCycle: input.billingCycle,
  });

  const client = await prisma.invoiceClient.create({
    data: {
      clientName: input.clientName.trim(),
      serviceType: input.serviceType,
      billingCycle: input.billingCycle,
      invoiceCountPerCycle: Math.max(1, input.invoiceCountPerCycle),
      usualDueDay: clampDueDay(input.usualDueDay ?? 1),
      annualDueMonth:
        input.billingCycle === InvoiceBillingCycle.ANNUALLY
          ? input.annualDueMonth
            ? clampAnnualMonth(input.annualDueMonth)
            : 1
          : null,
      remarks: input.remarks?.trim() || null,
      status: InvoiceClientStatus.ACTIVE,
    },
  });

  await ensureUpcomingSchedulesForClient(client);
  return listInvoiceClients();
}

export async function updateInvoiceClient(
  clientId: string,
  input: {
    clientName?: string;
    serviceType?: InvoiceServiceType;
    billingCycle?: InvoiceBillingCycle;
    invoiceCountPerCycle?: number;
    usualDueDay?: number;
    annualDueMonth?: number | null;
    status?: InvoiceClientStatus;
    remarks?: string | null;
  },
) {
  const current = await prisma.invoiceClient.findUniqueOrThrow({
    where: { id: clientId },
  });

  const nextClientName =
    input.clientName !== undefined ? input.clientName.trim() : current.clientName;
  const nextServiceType = input.serviceType ?? current.serviceType;
  const nextBillingCycle = input.billingCycle ?? current.billingCycle;
  const nextStatus = input.status ?? current.status;
  const nextAnnualDueMonth =
    input.annualDueMonth !== undefined
      ? input.annualDueMonth
      : current.annualDueMonth;

  if (nextStatus !== InvoiceClientStatus.REMOVED) {
    await assertUniqueInvoiceClient({
      clientName: nextClientName,
      serviceType: nextServiceType,
      billingCycle: nextBillingCycle,
      excludeId: clientId,
    });
  }

  const client = await prisma.invoiceClient.update({
    where: { id: clientId },
    data: {
      ...(input.clientName !== undefined ? { clientName: nextClientName } : {}),
      ...(input.serviceType !== undefined ? { serviceType: input.serviceType } : {}),
      ...(input.billingCycle !== undefined ? { billingCycle: input.billingCycle } : {}),
      ...(input.invoiceCountPerCycle !== undefined
        ? { invoiceCountPerCycle: Math.max(1, input.invoiceCountPerCycle) }
        : {}),
      ...(input.usualDueDay !== undefined
        ? { usualDueDay: clampDueDay(input.usualDueDay) }
        : {}),
      ...(input.annualDueMonth !== undefined
        ? {
            annualDueMonth:
              nextBillingCycle === InvoiceBillingCycle.ANNUALLY && nextAnnualDueMonth
                ? clampAnnualMonth(nextAnnualDueMonth)
                : nextBillingCycle === InvoiceBillingCycle.ANNUALLY
                  ? 1
                  : null,
          }
        : input.billingCycle !== undefined
          ? {
              annualDueMonth:
                nextBillingCycle === InvoiceBillingCycle.ANNUALLY
                  ? clampAnnualMonth(nextAnnualDueMonth ?? 1)
                  : null,
            }
          : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.remarks !== undefined
        ? { remarks: input.remarks?.trim() || null }
        : {}),
    },
  });

  if (client.status === InvoiceClientStatus.ACTIVE) {
    await ensureUpcomingSchedulesForClient(client);
  }

  return listInvoiceClients();
}

export async function softRemoveInvoiceClient(clientId: string) {
  await prisma.invoiceClient.update({
    where: { id: clientId },
    data: { status: InvoiceClientStatus.REMOVED },
  });
  return listInvoiceClients();
}

export const LEGACY_INVOICE_IMPORT_REMARKS =
  "Imported from legacy recurring invoice register";

export type UpsertImportedInvoiceClientInput = {
  clientName: string;
  serviceType: InvoiceServiceType;
  billingCycle: InvoiceBillingCycle;
  invoiceCountPerCycle: number;
  usualDueDay?: number;
  annualDueMonth?: number | null;
};

export async function upsertImportedInvoiceClient(
  input: UpsertImportedInvoiceClientInput,
): Promise<"created" | "updated"> {
  const clientName = input.clientName.trim();
  const existing = await prisma.invoiceClient.findFirst({
    where: {
      clientName,
      serviceType: input.serviceType,
      status: { not: InvoiceClientStatus.REMOVED },
    },
  });

  const data = {
    clientName,
    serviceType: input.serviceType,
    billingCycle: input.billingCycle,
    invoiceCountPerCycle: Math.max(1, input.invoiceCountPerCycle),
    usualDueDay: clampDueDay(input.usualDueDay ?? 1),
    annualDueMonth:
      input.billingCycle === InvoiceBillingCycle.ANNUALLY
        ? clampAnnualMonth(input.annualDueMonth ?? 1)
        : null,
    status: InvoiceClientStatus.ACTIVE,
    remarks: LEGACY_INVOICE_IMPORT_REMARKS,
  };

  if (existing) {
    const client = await prisma.invoiceClient.update({
      where: { id: existing.id },
      data,
    });
    await ensureUpcomingSchedulesForClient(client);
    return "updated";
  }

  const client = await prisma.invoiceClient.create({ data });
  await ensureUpcomingSchedulesForClient(client);
  return "created";
}

export async function markInvoiceScheduleGenerated(
  scheduleId: string,
  createdBy?: string | null,
) {
  const now = new Date();
  await prisma.invoiceSchedule.update({
    where: { id: scheduleId },
    data: {
      status: InvoiceScheduleStatus.GENERATED,
      generatedAt: now,
    },
  });

  const { notifyInvoiceGenerated } = await import("@/lib/invoice-notification-service");
  await notifyInvoiceGenerated(scheduleId, createdBy);

  return listInvoiceSchedules({ includeSubmitted: true });
}

export async function markInvoiceScheduleSubmitted(
  scheduleId: string,
  createdBy?: string | null,
) {
  const now = new Date();
  await prisma.invoiceSchedule.update({
    where: { id: scheduleId },
    data: {
      status: InvoiceScheduleStatus.SUBMITTED,
      submittedAt: now,
    },
  });

  const { notifyInvoiceSubmitted } = await import("@/lib/invoice-notification-service");
  await notifyInvoiceSubmitted(scheduleId, createdBy);

  const schedule = await prisma.invoiceSchedule.findUnique({
    where: { id: scheduleId },
    include: { client: true },
  });

  if (schedule?.client.status === InvoiceClientStatus.ACTIVE) {
    const next = computeNextCycle({
      billingCycle: schedule.client.billingCycle,
      annualDueMonth: schedule.client.annualDueMonth,
      reference: addUtcDays(schedule.dueDate, 1),
    });
    await ensureScheduleForClient(schedule.client, next.cycleMonth, next.cycleYear);
  }

  return listInvoiceSchedules({ includeSubmitted: true });
}

export async function snoozeInvoiceSchedule(
  scheduleId: string,
  input: { snoozedUntil?: string; snoozeDays?: number; remarks?: string | null },
) {
  const snoozedUntil = input.snoozedUntil
    ? startOfUtcDay(new Date(`${input.snoozedUntil}T00:00:00.000Z`))
    : addUtcDays(startOfUtcDay(new Date()), Math.max(1, input.snoozeDays ?? 1));

  await prisma.invoiceSchedule.update({
    where: { id: scheduleId },
    data: {
      status: InvoiceScheduleStatus.SNOOZED,
      snoozedUntil,
      ...(input.remarks !== undefined
        ? { remarks: input.remarks?.trim() || null }
        : {}),
    },
  });
  return listInvoiceSchedules({ includeSubmitted: true });
}

export async function updateInvoiceScheduleRemarks(
  scheduleId: string,
  remarks: string | null,
) {
  await prisma.invoiceSchedule.update({
    where: { id: scheduleId },
    data: { remarks: remarks?.trim() || null },
  });
  return listInvoiceSchedules({ includeSubmitted: true });
}

export async function countOpenInvoiceSchedules(): Promise<number> {
  const summary = await getInvoiceAlertSummary();
  return summary.dueSoon + summary.dueToday + summary.overdue + summary.upcoming;
}

export type InvoiceAlertSummary = {
  dueSoon: number;
  dueToday: number;
  overdue: number;
  upcoming: number;
};

export async function getInvoiceAlertSummary(): Promise<InvoiceAlertSummary> {
  await refreshScheduleStatuses();
  const today = startOfUtcDay(new Date());

  const [dueSoon, dueToday, overdue, upcoming] = await Promise.all([
    prisma.invoiceSchedule.count({
      where: {
        status: InvoiceScheduleStatus.DUE_SOON,
        client: { status: InvoiceClientStatus.ACTIVE },
      },
    }),
    prisma.invoiceSchedule.count({
      where: {
        dueDate: today,
        status: {
          notIn: [InvoiceScheduleStatus.SUBMITTED],
        },
        client: { status: InvoiceClientStatus.ACTIVE },
      },
    }),
    prisma.invoiceSchedule.count({
      where: {
        status: InvoiceScheduleStatus.OVERDUE,
        client: { status: InvoiceClientStatus.ACTIVE },
      },
    }),
    prisma.invoiceSchedule.count({
      where: {
        status: InvoiceScheduleStatus.UPCOMING,
        client: { status: InvoiceClientStatus.ACTIVE },
      },
    }),
  ]);

  return { dueSoon, dueToday, overdue, upcoming };
}
