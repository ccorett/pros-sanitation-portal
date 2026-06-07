import type {
  DeliveryPriority,
  DeliveryRequest,
  DeliveryRequestItem,
  DeliveryRequestStatus,
  DeliveryStatusHistory,
  Employee,
} from "@prisma/client";
import { AccountStatus, EmployeeResponsibility } from "@prisma/client";
import { resolveDeliveryActorContext } from "@/lib/delivery-access";
import { prisma } from "@/lib/prisma";

export type DeliveryRequestItemDto = {
  id: string;
  itemName: string;
  quantity: number;
  inventoryItemId: string | null;
};

export type DeliveryStatusHistoryDto = {
  id: string;
  previousStatus: DeliveryRequestStatus | null;
  previousStatusLabel: string | null;
  newStatus: DeliveryRequestStatus;
  newStatusLabel: string;
  changedByName: string;
  notes: string | null;
  changedAt: string;
};

export type DeliveryRequestDto = {
  id: string;
  requestNumber: string;
  status: DeliveryRequestStatus;
  statusLabel: string;
  priority: DeliveryPriority;
  priorityLabel: string;
  requestedById: string;
  requestedByName: string;
  requestedByEmail: string;
  requestingLocation: string;
  responsibleSupervisorId: string | null;
  responsibleSupervisorName: string | null;
  assignedDriverId: string | null;
  assignedDriverName: string | null;
  requestedDate: string;
  notes: string | null;
  equipmentRequestId: string | null;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  items: DeliveryRequestItemDto[];
  statusHistory: DeliveryStatusHistoryDto[];
  itemsSummary: string;
};

const PRIORITY_LABELS: Record<DeliveryPriority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

const STATUS_LABELS: Record<DeliveryRequestStatus, string> = {
  PENDING: "Pending",
  ASSIGNED: "Assigned",
  IN_TRANSIT: "In Transit",
  FULFILLED: "Fulfilled",
  CANCELLED: "Cancelled",
  CANNOT_FULFIL: "Cannot Fulfil",
};

type DeliveryRequestRecord = DeliveryRequest & {
  items: DeliveryRequestItem[];
  statusHistory: DeliveryStatusHistory[];
};

const requestInclude = {
  items: { orderBy: { itemName: "asc" as const } },
  statusHistory: { orderBy: { changedAt: "desc" as const } },
} as const;

function actorName(actor: Employee): string {
  return `${actor.firstName} ${actor.lastName}`.trim() || actor.companyEmail;
}

function formatItemsSummary(items: DeliveryRequestItem[]): string {
  if (items.length === 0) {
    return "—";
  }

  return items.map((item) => `${item.itemName} × ${item.quantity}`).join(", ");
}

export function serializeDeliveryRequest(
  request: DeliveryRequestRecord,
): DeliveryRequestDto {
  return {
    id: request.id,
    requestNumber: request.requestNumber,
    status: request.status,
    statusLabel: STATUS_LABELS[request.status],
    priority: request.priority,
    priorityLabel: PRIORITY_LABELS[request.priority],
    requestedById: request.requestedById,
    requestedByName: request.requestedByName,
    requestedByEmail: request.requestedByEmail,
    requestingLocation: request.requestingLocation,
    responsibleSupervisorId: request.responsibleSupervisorId,
    responsibleSupervisorName: request.responsibleSupervisorName,
    assignedDriverId: request.assignedDriverId,
    assignedDriverName: request.assignedDriverName,
    requestedDate: request.requestedDate.toISOString(),
    notes: request.notes,
    equipmentRequestId: request.equipmentRequestId,
    createdById: request.createdById,
    createdByName: request.createdByName,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    items: request.items.map((item) => ({
      id: item.id,
      itemName: item.itemName,
      quantity: item.quantity,
      inventoryItemId: item.inventoryItemId,
    })),
    statusHistory: request.statusHistory.map((entry) => ({
      id: entry.id,
      previousStatus: entry.previousStatus,
      previousStatusLabel: entry.previousStatus
        ? STATUS_LABELS[entry.previousStatus]
        : null,
      newStatus: entry.newStatus,
      newStatusLabel: STATUS_LABELS[entry.newStatus],
      changedByName: entry.changedByName,
      notes: entry.notes,
      changedAt: entry.changedAt.toISOString(),
    })),
    itemsSummary: formatItemsSummary(request.items),
  };
}

async function generateRequestNumber(): Promise<string> {
  const today = new Date();
  const stamp = [
    today.getUTCFullYear(),
    String(today.getUTCMonth() + 1).padStart(2, "0"),
    String(today.getUTCDate()).padStart(2, "0"),
  ].join("");

  const prefix = `DR-${stamp}-`;
  const latest = await prisma.deliveryRequest.findFirst({
    where: { requestNumber: { startsWith: prefix } },
    orderBy: { requestNumber: "desc" },
    select: { requestNumber: true },
  });

  const nextSequence = latest
    ? Number.parseInt(latest.requestNumber.slice(prefix.length), 10) + 1
    : 1;

  return `${prefix}${String(nextSequence).padStart(3, "0")}`;
}

async function recordStatusChange(input: {
  deliveryRequestId: string;
  previousStatus: DeliveryRequestStatus | null;
  newStatus: DeliveryRequestStatus;
  changedBy: Employee;
  notes?: string;
}) {
  await prisma.deliveryStatusHistory.create({
    data: {
      deliveryRequestId: input.deliveryRequestId,
      previousStatus: input.previousStatus,
      newStatus: input.newStatus,
      changedById: input.changedBy.id,
      changedByName: actorName(input.changedBy),
      notes: input.notes,
    },
  });
}

export async function listDeliveryDrivers(): Promise<
  { id: string; name: string; email: string }[]
> {
  const rows = await prisma.employee.findMany({
    where: {
      accountStatus: AccountStatus.ACTIVE,
      responsibilityEntries: {
        some: { responsibility: EmployeeResponsibility.DRIVER },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      companyEmail: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: `${row.firstName} ${row.lastName}`.trim(),
    email: row.companyEmail,
  }));
}

export async function listDeliveryRequestsForActor(
  actor: Employee,
): Promise<DeliveryRequestDto[]> {
  const { canAccess, isManager, isCoordinator, isDriver } =
    await resolveDeliveryActorContext(actor);

  if (!canAccess) {
    throw new Error("You do not have access to delivery requests.");
  }

  let where = {};

  if (isManager || isCoordinator) {
    where = {};
  } else if (isDriver) {
    where = { assignedDriverId: actor.id };
  } else {
    throw new Error("You do not have access to delivery requests.");
  }

  const rows = await prisma.deliveryRequest.findMany({
    where,
    include: requestInclude,
    orderBy: [{ requestedDate: "desc" }, { createdAt: "desc" }],
  });

  return rows.map(serializeDeliveryRequest);
}

export type CreateDeliveryRequestInput = {
  items: { itemName: string; quantity: number; inventoryItemId?: string }[];
  requestedByName: string;
  requestedByEmail: string;
  requestingLocation: string;
  responsibleSupervisorName?: string;
  responsibleSupervisorId?: string;
  priority?: DeliveryPriority;
  requestedDate?: string;
  notes?: string;
  equipmentRequestId?: string;
};

export async function createDeliveryRequest(
  actor: Employee,
  input: CreateDeliveryRequestInput,
): Promise<DeliveryRequestDto> {
  const { canAccess, isManager, isCoordinator } =
    await resolveDeliveryActorContext(actor);

  if (!canAccess || (!isManager && !isCoordinator)) {
    throw new Error("You cannot create delivery requests.");
  }

  if (!input.items.length) {
    throw new Error("Add at least one delivery item.");
  }

  const requestNumber = await generateRequestNumber();
  const requestedDate = input.requestedDate
    ? new Date(input.requestedDate)
    : new Date();

  const created = await prisma.deliveryRequest.create({
    data: {
      requestNumber,
      status: "PENDING",
      priority: input.priority ?? "NORMAL",
      requestedById: actor.id,
      requestedByName: input.requestedByName.trim(),
      requestedByEmail: input.requestedByEmail.trim().toLowerCase(),
      requestingLocation: input.requestingLocation.trim(),
      responsibleSupervisorId: input.responsibleSupervisorId ?? null,
      responsibleSupervisorName: input.responsibleSupervisorName?.trim() ?? null,
      requestedDate,
      notes: input.notes?.trim() ?? null,
      equipmentRequestId: input.equipmentRequestId ?? null,
      createdById: actor.id,
      createdByName: actorName(actor),
      items: {
        create: input.items.map((item) => ({
          itemName: item.itemName.trim(),
          quantity: item.quantity,
          inventoryItemId: item.inventoryItemId ?? null,
        })),
      },
    },
    include: requestInclude,
  });

  await recordStatusChange({
    deliveryRequestId: created.id,
    previousStatus: null,
    newStatus: "PENDING",
    changedBy: actor,
    notes: "Delivery request created",
  });

  return serializeDeliveryRequest(created);
}

export type UpdateDeliveryRequestInput = {
  action: "assignDriver" | "updateStatus" | "addNote" | "close";
  assignedDriverId?: string;
  status?: DeliveryRequestStatus;
  notes?: string;
};

export async function updateDeliveryRequest(
  actor: Employee,
  requestId: string,
  input: UpdateDeliveryRequestInput,
): Promise<DeliveryRequestDto> {
  const { canAccess, isManager, isCoordinator, isDriver } =
    await resolveDeliveryActorContext(actor);

  if (!canAccess) {
    throw new Error("You do not have access to delivery requests.");
  }

  const existing = await prisma.deliveryRequest.findUnique({
    where: { id: requestId },
    include: requestInclude,
  });

  if (!existing) {
    throw new Error("Delivery request not found.");
  }

  if (input.action === "assignDriver") {
    if (!isManager && !isCoordinator) {
      throw new Error("You cannot assign drivers.");
    }

    if (!input.assignedDriverId) {
      throw new Error("Select a driver.");
    }

    if (existing.status !== "PENDING" && existing.status !== "ASSIGNED") {
      throw new Error("Only pending or assigned requests can be reassigned.");
    }

    const driver = await prisma.employee.findFirst({
      where: {
        id: input.assignedDriverId,
        accountStatus: AccountStatus.ACTIVE,
        responsibilityEntries: {
          some: { responsibility: EmployeeResponsibility.DRIVER },
        },
      },
    });

    if (!driver) {
      throw new Error("Selected driver is not available.");
    }

    const driverName = `${driver.firstName} ${driver.lastName}`.trim();
    const previousStatus = existing.status;

    const updated = await prisma.deliveryRequest.update({
      where: { id: requestId },
      data: {
        assignedDriverId: driver.id,
        assignedDriverName: driverName,
        status: "ASSIGNED",
        notes: input.notes?.trim()
          ? [existing.notes, input.notes.trim()].filter(Boolean).join("\n")
          : existing.notes,
      },
      include: requestInclude,
    });

    if (previousStatus !== "ASSIGNED") {
      await recordStatusChange({
        deliveryRequestId: requestId,
        previousStatus,
        newStatus: "ASSIGNED",
        changedBy: actor,
        notes: `Assigned to ${driverName}`,
      });
    }

    return serializeDeliveryRequest(updated);
  }

  if (input.action === "updateStatus") {
    if (!input.status) {
      throw new Error("Status is required.");
    }

    const nextStatus = input.status;
    const previousStatus = existing.status;

    if (isDriver && !isManager && !isCoordinator) {
      if (existing.assignedDriverId !== actor.id) {
        throw new Error("You can only update your assigned deliveries.");
      }

      const allowedDriverStatuses: DeliveryRequestStatus[] = [
        "IN_TRANSIT",
        "FULFILLED",
        "CANNOT_FULFIL",
      ];

      if (!allowedDriverStatuses.includes(nextStatus)) {
        throw new Error("Drivers cannot set that status.");
      }

      if (
        nextStatus === "IN_TRANSIT" &&
        previousStatus !== "ASSIGNED"
      ) {
        throw new Error("Only assigned deliveries can be marked in transit.");
      }

      if (
        (nextStatus === "FULFILLED" || nextStatus === "CANNOT_FULFIL") &&
        previousStatus !== "ASSIGNED" &&
        previousStatus !== "IN_TRANSIT"
      ) {
        throw new Error("Delivery must be assigned or in transit first.");
      }
    } else if (isCoordinator || isManager) {
      const allowedCoordinatorStatuses: DeliveryRequestStatus[] = [
        "ASSIGNED",
        "IN_TRANSIT",
        "FULFILLED",
        "CANCELLED",
        "CANNOT_FULFIL",
      ];

      if (!allowedCoordinatorStatuses.includes(nextStatus)) {
        throw new Error("That status change is not allowed.");
      }
    } else {
      throw new Error("You cannot update delivery status.");
    }

    const updated = await prisma.deliveryRequest.update({
      where: { id: requestId },
      data: {
        status: nextStatus,
        notes: input.notes?.trim()
          ? [existing.notes, input.notes.trim()].filter(Boolean).join("\n")
          : existing.notes,
      },
      include: requestInclude,
    });

    if (previousStatus !== nextStatus) {
      await recordStatusChange({
        deliveryRequestId: requestId,
        previousStatus,
        newStatus: nextStatus,
        changedBy: actor,
        notes: input.notes?.trim(),
      });
    }

    return serializeDeliveryRequest(updated);
  }

  if (input.action === "addNote") {
    if (!input.notes?.trim()) {
      throw new Error("Note text is required.");
    }

    const canAddNote =
      isManager ||
      isCoordinator ||
      (isDriver && existing.assignedDriverId === actor.id);

    if (!canAddNote) {
      throw new Error("You cannot add notes to this delivery.");
    }

    const updated = await prisma.deliveryRequest.update({
      where: { id: requestId },
      data: {
        notes: [existing.notes, input.notes.trim()].filter(Boolean).join("\n"),
      },
      include: requestInclude,
    });

    return serializeDeliveryRequest(updated);
  }

  if (input.action === "close") {
    if (!isManager && !isCoordinator) {
      throw new Error("You cannot close delivery requests.");
    }

    if (existing.status === "FULFILLED" || existing.status === "CANCELLED") {
      throw new Error("This delivery request is already closed.");
    }

    const updated = await prisma.deliveryRequest.update({
      where: { id: requestId },
      data: {
        status: "CANCELLED",
        notes: input.notes?.trim()
          ? [existing.notes, input.notes.trim()].filter(Boolean).join("\n")
          : existing.notes,
      },
      include: requestInclude,
    });

    await recordStatusChange({
      deliveryRequestId: requestId,
      previousStatus: existing.status,
      newStatus: "CANCELLED",
      changedBy: actor,
      notes: input.notes?.trim() ?? "Request closed",
    });

    return serializeDeliveryRequest(updated);
  }

  throw new Error("Invalid action.");
}
