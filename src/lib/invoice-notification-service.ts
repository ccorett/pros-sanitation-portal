import {
  InvoiceClientStatus,
  InvoiceNotificationAuditAction,
  InvoiceNotificationStatus,
  InvoiceNotificationType,
  InvoiceScheduleStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type InvoiceNotificationFilter =
  | "all"
  | "unread"
  | "read"
  | "due_soon"
  | "due_today"
  | "overdue"
  | "generated"
  | "submitted";

export type InvoiceNotificationRow = {
  id: string;
  clientId: string;
  clientName: string;
  invoiceId: string;
  cycleLabel: string;
  type: InvoiceNotificationType;
  typeLabel: string;
  message: string;
  status: InvoiceNotificationStatus;
  statusLabel: string;
  createdAt: string;
  readAt: string | null;
  createdBy: string | null;
};

export type InvoiceNotificationSyncResult = {
  dueSoonCreated: number;
  dueTodayCreated: number;
  overdueCreated: number;
};

function startOfUtcDay(value: Date): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

function addUtcDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return startOfUtcDay(next);
}

function cycleLabel(month: number, year: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function notificationTypeLabel(type: InvoiceNotificationType): string {
  switch (type) {
    case InvoiceNotificationType.DUE_SOON:
      return "Due Soon";
    case InvoiceNotificationType.DUE_TODAY:
      return "Due Today";
    case InvoiceNotificationType.OVERDUE:
      return "Overdue";
    case InvoiceNotificationType.GENERATED:
      return "Generated";
    case InvoiceNotificationType.SUBMITTED:
      return "Submitted";
    default:
      return type;
  }
}

function buildNotificationMessage(
  type: InvoiceNotificationType,
  clientName: string,
): string {
  switch (type) {
    case InvoiceNotificationType.DUE_SOON:
      return `Invoice due in 5 days: ${clientName}`;
    case InvoiceNotificationType.DUE_TODAY:
      return `Invoice due today: ${clientName}`;
    case InvoiceNotificationType.OVERDUE:
      return `Invoice overdue: ${clientName}`;
    case InvoiceNotificationType.GENERATED:
      return `Invoice generated: ${clientName}`;
    case InvoiceNotificationType.SUBMITTED:
      return `Invoice submitted: ${clientName}`;
    default:
      return clientName;
  }
}

async function logNotificationAudit(input: {
  notificationId?: string | null;
  clientId: string;
  invoiceId: string;
  action: InvoiceNotificationAuditAction;
  actorName: string;
  actorEmail?: string | null;
}) {
  await prisma.invoiceNotificationAuditLog.create({
    data: {
      notificationId: input.notificationId ?? null,
      clientId: input.clientId,
      invoiceId: input.invoiceId,
      action: input.action,
      actorName: input.actorName,
      actorEmail: input.actorEmail ?? null,
    },
  });
}

async function notificationExists(
  invoiceId: string,
  type: InvoiceNotificationType,
): Promise<boolean> {
  const existing = await prisma.invoiceNotification.findFirst({
    where: { invoiceId, type },
    select: { id: true },
  });
  return Boolean(existing);
}

async function createNotificationIfNeeded(input: {
  clientId: string;
  invoiceId: string;
  type: InvoiceNotificationType;
  clientName: string;
  createdBy?: string | null;
  skipIfExists?: boolean;
}) {
  if (input.skipIfExists !== false) {
    const exists = await notificationExists(input.invoiceId, input.type);
    if (exists) {
      return null;
    }
  }

  const notification = await prisma.invoiceNotification.create({
    data: {
      clientId: input.clientId,
      invoiceId: input.invoiceId,
      type: input.type,
      message: buildNotificationMessage(input.type, input.clientName),
      status: InvoiceNotificationStatus.UNREAD,
      createdBy: input.createdBy ?? null,
    },
  });

  await logNotificationAudit({
    notificationId: notification.id,
    clientId: input.clientId,
    invoiceId: input.invoiceId,
    action: InvoiceNotificationAuditAction.NOTIFICATION_CREATED,
    actorName: input.createdBy ?? "System",
  });

  return notification;
}

function serializeNotification(row: {
  id: string;
  clientId: string;
  invoiceId: string;
  type: InvoiceNotificationType;
  message: string;
  status: InvoiceNotificationStatus;
  createdAt: Date;
  readAt: Date | null;
  createdBy: string | null;
  client: { clientName: string };
  invoice: { cycleMonth: number; cycleYear: number };
}): InvoiceNotificationRow {
  return {
    id: row.id,
    clientId: row.clientId,
    clientName: row.client.clientName,
    invoiceId: row.invoiceId,
    cycleLabel: cycleLabel(row.invoice.cycleMonth, row.invoice.cycleYear),
    type: row.type,
    typeLabel: notificationTypeLabel(row.type),
    message: row.message,
    status: row.status,
    statusLabel: row.status === InvoiceNotificationStatus.UNREAD ? "Unread" : "Read",
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt?.toISOString() ?? null,
    createdBy: row.createdBy,
  };
}

function buildFilterWhere(filter: InvoiceNotificationFilter) {
  switch (filter) {
    case "unread":
      return { status: InvoiceNotificationStatus.UNREAD };
    case "read":
      return { status: InvoiceNotificationStatus.READ };
    case "due_soon":
      return { type: InvoiceNotificationType.DUE_SOON };
    case "due_today":
      return { type: InvoiceNotificationType.DUE_TODAY };
    case "overdue":
      return { type: InvoiceNotificationType.OVERDUE };
    case "generated":
      return { type: InvoiceNotificationType.GENERATED };
    case "submitted":
      return { type: InvoiceNotificationType.SUBMITTED };
    default:
      return {};
  }
}

export async function countUnreadInvoiceNotifications(): Promise<number> {
  return prisma.invoiceNotification.count({
    where: { status: InvoiceNotificationStatus.UNREAD },
  });
}

export async function getLatestInvoiceNotificationActivity(): Promise<Date | null> {
  const latest = await prisma.invoiceNotification.findFirst({
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return latest?.createdAt ?? null;
}

export async function listInvoiceNotifications(
  filter: InvoiceNotificationFilter = "all",
): Promise<InvoiceNotificationRow[]> {
  const rows = await prisma.invoiceNotification.findMany({
    where: buildFilterWhere(filter),
    include: {
      client: { select: { clientName: true } },
      invoice: { select: { cycleMonth: true, cycleYear: true } },
    },
    orderBy: [{ createdAt: "desc" }, { client: { clientName: "asc" } }],
  });

  return rows.map(serializeNotification);
}

export async function notifyInvoiceGenerated(
  scheduleId: string,
  createdBy?: string | null,
) {
  const schedule = await prisma.invoiceSchedule.findUnique({
    where: { id: scheduleId },
    include: { client: true },
  });
  if (!schedule) {
    return null;
  }

  return createNotificationIfNeeded({
    clientId: schedule.clientId,
    invoiceId: schedule.id,
    type: InvoiceNotificationType.GENERATED,
    clientName: schedule.client.clientName,
    createdBy,
    skipIfExists: false,
  });
}

export async function notifyInvoiceSubmitted(
  scheduleId: string,
  createdBy?: string | null,
) {
  const schedule = await prisma.invoiceSchedule.findUnique({
    where: { id: scheduleId },
    include: { client: true },
  });
  if (!schedule) {
    return null;
  }

  return createNotificationIfNeeded({
    clientId: schedule.clientId,
    invoiceId: schedule.id,
    type: InvoiceNotificationType.SUBMITTED,
    clientName: schedule.client.clientName,
    createdBy,
    skipIfExists: false,
  });
}

export async function syncInvoiceDueNotifications(
  reference = new Date(),
): Promise<InvoiceNotificationSyncResult> {
  const today = startOfUtcDay(reference);
  const fiveDaysOut = addUtcDays(today, 5);
  const activeClient = { status: InvoiceClientStatus.ACTIVE };

  const [dueSoonSchedules, dueTodaySchedules, overdueSchedules] = await Promise.all([
    prisma.invoiceSchedule.findMany({
      where: {
        dueDate: fiveDaysOut,
        status: {
          in: [
            InvoiceScheduleStatus.UPCOMING,
            InvoiceScheduleStatus.DUE_SOON,
            InvoiceScheduleStatus.GENERATED,
            InvoiceScheduleStatus.SNOOZED,
          ],
        },
        client: activeClient,
      },
      include: { client: true },
    }),
    prisma.invoiceSchedule.findMany({
      where: {
        dueDate: today,
        status: { notIn: [InvoiceScheduleStatus.SUBMITTED] },
        client: activeClient,
      },
      include: { client: true },
    }),
    prisma.invoiceSchedule.findMany({
      where: {
        status: InvoiceScheduleStatus.OVERDUE,
        client: activeClient,
      },
      include: { client: true },
    }),
  ]);

  let dueSoonCreated = 0;
  let dueTodayCreated = 0;
  let overdueCreated = 0;

  for (const schedule of dueSoonSchedules) {
    const created = await createNotificationIfNeeded({
      clientId: schedule.clientId,
      invoiceId: schedule.id,
      type: InvoiceNotificationType.DUE_SOON,
      clientName: schedule.client.clientName,
      createdBy: "System",
    });
    if (created) {
      dueSoonCreated += 1;
    }
  }

  for (const schedule of dueTodaySchedules) {
    const created = await createNotificationIfNeeded({
      clientId: schedule.clientId,
      invoiceId: schedule.id,
      type: InvoiceNotificationType.DUE_TODAY,
      clientName: schedule.client.clientName,
      createdBy: "System",
    });
    if (created) {
      dueTodayCreated += 1;
    }
  }

  for (const schedule of overdueSchedules) {
    const created = await createNotificationIfNeeded({
      clientId: schedule.clientId,
      invoiceId: schedule.id,
      type: InvoiceNotificationType.OVERDUE,
      clientName: schedule.client.clientName,
      createdBy: "System",
    });
    if (created) {
      overdueCreated += 1;
    }
  }

  return { dueSoonCreated, dueTodayCreated, overdueCreated };
}

export async function markInvoiceNotificationRead(
  notificationId: string,
  actor: { name: string; email?: string | null },
) {
  const notification = await prisma.invoiceNotification.update({
    where: { id: notificationId },
    data: {
      status: InvoiceNotificationStatus.READ,
      readAt: new Date(),
    },
    include: {
      client: { select: { clientName: true } },
      invoice: { select: { cycleMonth: true, cycleYear: true } },
    },
  });

  await logNotificationAudit({
    notificationId: notification.id,
    clientId: notification.clientId,
    invoiceId: notification.invoiceId,
    action: InvoiceNotificationAuditAction.NOTIFICATION_READ,
    actorName: actor.name,
    actorEmail: actor.email,
  });

  return serializeNotification(notification);
}

export async function markInvoiceNotificationUnread(
  notificationId: string,
  actor: { name: string; email?: string | null },
) {
  const notification = await prisma.invoiceNotification.update({
    where: { id: notificationId },
    data: {
      status: InvoiceNotificationStatus.UNREAD,
      readAt: null,
    },
    include: {
      client: { select: { clientName: true } },
      invoice: { select: { cycleMonth: true, cycleYear: true } },
    },
  });

  await logNotificationAudit({
    notificationId: notification.id,
    clientId: notification.clientId,
    invoiceId: notification.invoiceId,
    action: InvoiceNotificationAuditAction.NOTIFICATION_UNREAD,
    actorName: actor.name,
    actorEmail: actor.email,
  });

  return serializeNotification(notification);
}

export { notificationTypeLabel };
