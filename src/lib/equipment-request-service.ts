import type {
  Employee,
  EquipmentRequest,
  EquipmentRequestStatus,
  InventoryItem,
  RequestUrgency,
} from "@prisma/client";
import { AccessLevel } from "@prisma/client";
import { canAccessAdminModule } from "@/lib/access-levels";
import { isManagerOrAbove } from "@/lib/operational-access";
import { prisma } from "@/lib/prisma";

export type EquipmentRequestDto = {
  id: string;
  inventoryItemId: string;
  itemName: string;
  unit: string;
  requestedById: string;
  requestedByName: string;
  requestedByEmail: string;
  quantityRequested: number;
  reason: string;
  urgency: RequestUrgency;
  urgencyLabel: string;
  status: EquipmentRequestStatus;
  statusLabel: string;
  reviewedById: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  decisionNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

const URGENCY_LABELS: Record<RequestUrgency, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

const STATUS_LABELS: Record<EquipmentRequestStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  FULFILLED: "Fulfilled",
  CANCELLED: "Cancelled",
};

export function mapUiUrgencyToRequestUrgency(
  urgency: string,
): RequestUrgency {
  switch (urgency.trim().toLowerCase()) {
    case "low":
      return "LOW";
    case "high":
      return "HIGH";
    case "critical":
    case "urgent":
      return "URGENT";
    default:
      return "NORMAL";
  }
}

export function serializeEquipmentRequest(
  request: EquipmentRequest & { inventoryItem: InventoryItem },
): EquipmentRequestDto {
  return {
    id: request.id,
    inventoryItemId: request.inventoryItemId,
    itemName: request.inventoryItem.itemName,
    unit: request.inventoryItem.unit,
    requestedById: request.requestedById,
    requestedByName: request.requestedByName,
    requestedByEmail: request.requestedByEmail,
    quantityRequested: request.quantityRequested,
    reason: request.reason,
    urgency: request.urgency,
    urgencyLabel: URGENCY_LABELS[request.urgency],
    status: request.status,
    statusLabel: STATUS_LABELS[request.status],
    reviewedById: request.reviewedById,
    reviewedByName: request.reviewedByName,
    reviewedAt: request.reviewedAt?.toISOString() ?? null,
    decisionNotes: request.decisionNotes,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

const requestInclude = {
  inventoryItem: true,
} as const;

async function getSupervisorVisibleRequesterIds(
  supervisor: Employee,
): Promise<string[]> {
  if (!supervisor.locationAssignment) {
    return [supervisor.id];
  }

  const teamMembers = await prisma.employee.findMany({
    where: { locationAssignment: supervisor.locationAssignment },
    select: { id: true },
  });

  return teamMembers.map((member) => member.id);
}

export async function listEquipmentRequestsForActor(
  actor: Employee,
): Promise<EquipmentRequestDto[]> {
  let where: { requestedById?: string | { in: string[] } } = {};

  if (
    isManagerOrAbove(actor.accessLevel) ||
    canAccessAdminModule(actor.accessLevel)
  ) {
    where = {};
  } else if (actor.accessLevel === AccessLevel.SUPERVISOR) {
    const requesterIds = await getSupervisorVisibleRequesterIds(actor);
    where = { requestedById: { in: requesterIds } };
  } else {
    where = { requestedById: actor.id };
  }

  const rows = await prisma.equipmentRequest.findMany({
    where,
    include: requestInclude,
    orderBy: { createdAt: "desc" },
  });

  return rows.map(serializeEquipmentRequest);
}

export type CreateEquipmentRequestInput = {
  inventoryItemId: string;
  quantityRequested: number;
  reason: string;
  urgency: RequestUrgency;
  requester: Employee;
};

export async function createEquipmentRequest(
  input: CreateEquipmentRequestInput,
): Promise<EquipmentRequestDto> {
  if (input.quantityRequested < 1) {
    throw new Error("Quantity must be at least 1.");
  }

  if (!input.reason.trim()) {
    throw new Error("Reason is required.");
  }

  const item = await prisma.inventoryItem.findFirst({
    where: { id: input.inventoryItemId, isActive: true },
  });

  if (!item) {
    throw new Error("Inventory item not found.");
  }

  const requesterName =
    `${input.requester.firstName} ${input.requester.lastName}`.trim();

  const created = await prisma.equipmentRequest.create({
    data: {
      inventoryItemId: input.inventoryItemId,
      requestedById: input.requester.id,
      requestedByName: requesterName,
      requestedByEmail: input.requester.companyEmail,
      quantityRequested: input.quantityRequested,
      reason: input.reason.trim(),
      urgency: input.urgency,
    },
    include: requestInclude,
  });

  return serializeEquipmentRequest(created);
}

export type ReviewEquipmentRequestInput = {
  requestId: string;
  status: EquipmentRequestStatus;
  reviewer: Employee;
  decisionNotes?: string | null;
};

export async function reviewEquipmentRequest(
  input: ReviewEquipmentRequestInput,
): Promise<EquipmentRequestDto> {
  const existing = await prisma.equipmentRequest.findUnique({
    where: { id: input.requestId },
    include: requestInclude,
  });

  if (!existing) {
    throw new Error("Equipment request not found.");
  }

  const reviewerName =
    `${input.reviewer.firstName} ${input.reviewer.lastName}`.trim();
  const reviewedAt = new Date();
  const notes = input.decisionNotes?.trim() || null;

  if (input.status === "FULFILLED") {
    if (existing.status !== "APPROVED") {
      throw new Error("Only approved requests can be marked fulfilled.");
    }

    const item = existing.inventoryItem;
    if (existing.quantityRequested > item.availableQuantity) {
      throw new Error("Requested quantity exceeds available stock.");
    }

    const newQuantity = item.availableQuantity - existing.quantityRequested;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.stockEditHistory.create({
        data: {
          inventoryItemId: item.id,
          previousQuantity: item.availableQuantity,
          newQuantity,
          previousReorderLevel: item.reorderLevel,
          newReorderLevel: item.reorderLevel,
          previousStorageArea: item.storageArea,
          newStorageArea: item.storageArea,
          previousSupplier: item.supplier,
          newSupplier: item.supplier,
          editedBy: reviewerName,
          editedAt: reviewedAt,
          notes: `Fulfilled equipment request ${existing.id}`,
        },
      });

      await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          availableQuantity: newQuantity,
          lastEditedAt: reviewedAt,
          lastEditedBy: reviewerName,
        },
      });

      return tx.equipmentRequest.update({
        where: { id: existing.id },
        data: {
          status: "FULFILLED",
          reviewedById: input.reviewer.id,
          reviewedByName: reviewerName,
          reviewedAt,
          decisionNotes: notes,
        },
        include: requestInclude,
      });
    });

    return serializeEquipmentRequest(updated);
  }

  if (input.status === "APPROVED") {
    if (existing.status !== "PENDING") {
      throw new Error("Only pending requests can be approved.");
    }
  } else if (input.status === "REJECTED") {
    if (existing.status !== "PENDING" && existing.status !== "APPROVED") {
      throw new Error("This request cannot be rejected.");
    }
  } else if (input.status === "CANCELLED") {
    if (existing.status === "FULFILLED" || existing.status === "REJECTED") {
      throw new Error("This request cannot be cancelled.");
    }
  } else {
    throw new Error("Unsupported status update.");
  }

  const updated = await prisma.equipmentRequest.update({
    where: { id: existing.id },
    data: {
      status: input.status,
      reviewedById: input.reviewer.id,
      reviewedByName: reviewerName,
      reviewedAt,
      decisionNotes: notes,
    },
    include: requestInclude,
  });

  return serializeEquipmentRequest(updated);
}
