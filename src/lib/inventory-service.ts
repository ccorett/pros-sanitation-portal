import type { InventoryCategory, InventoryItem, StockEditHistory } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";

export type InventoryItemDto = {
  id: string;
  itemName: string;
  category: InventoryCategory;
  categoryLabel: string;
  availableQuantity: number;
  unit: string;
  reorderLevel: number;
  storageArea: string;
  supplier: string | null;
  stockStatus: StockStatus;
  isActive: boolean;
  lastEditedAt: string | null;
  lastEditedBy: string | null;
  updatedAt: string;
};

export type StockEditHistoryDto = {
  id: string;
  previousQuantity: number;
  newQuantity: number;
  previousReorderLevel: number | null;
  newReorderLevel: number | null;
  previousStorageArea: string | null;
  newStorageArea: string | null;
  previousSupplier: string | null;
  newSupplier: string | null;
  editedBy: string;
  editedAt: string;
  notes: string | null;
  summary: string;
};

const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  EQUIPMENT: "Equipment",
  CHEMICALS: "Chemicals",
  PPE: "PPE",
  CONSUMABLES: "Consumables",
};

export function formatInventoryCategoryLabel(
  category: InventoryCategory,
): string {
  return CATEGORY_LABELS[category];
}

export function computeStockStatus(
  availableQuantity: number,
  reorderLevel: number,
): StockStatus {
  if (availableQuantity === 0) return "Out of Stock";
  if (availableQuantity <= reorderLevel) return "Low Stock";
  return "In Stock";
}

export function serializeInventoryItem(item: InventoryItem): InventoryItemDto {
  return {
    id: item.id,
    itemName: item.itemName,
    category: item.category,
    categoryLabel: formatInventoryCategoryLabel(item.category),
    availableQuantity: item.availableQuantity,
    unit: item.unit,
    reorderLevel: item.reorderLevel,
    storageArea: item.storageArea,
    supplier: item.supplier,
    stockStatus: computeStockStatus(item.availableQuantity, item.reorderLevel),
    isActive: item.isActive,
    lastEditedAt: item.lastEditedAt?.toISOString() ?? null,
    lastEditedBy: item.lastEditedBy,
    updatedAt: item.updatedAt.toISOString(),
  };
}

function buildHistorySummary(entry: StockEditHistory): string {
  const parts: string[] = [];

  if (entry.previousQuantity !== entry.newQuantity) {
    parts.push(`Quantity: ${entry.previousQuantity} → ${entry.newQuantity}`);
  }
  if (
    entry.previousReorderLevel !== null &&
    entry.newReorderLevel !== null &&
    entry.previousReorderLevel !== entry.newReorderLevel
  ) {
    parts.push(
      `Reorder level: ${entry.previousReorderLevel} → ${entry.newReorderLevel}`,
    );
  }
  if (
    entry.previousStorageArea !== entry.newStorageArea &&
    (entry.previousStorageArea || entry.newStorageArea)
  ) {
    parts.push(
      `Storage: ${entry.previousStorageArea ?? "—"} → ${entry.newStorageArea ?? "—"}`,
    );
  }
  if (
    entry.previousSupplier !== entry.newSupplier &&
    (entry.previousSupplier || entry.newSupplier)
  ) {
    parts.push(
      `Supplier: ${entry.previousSupplier ?? "—"} → ${entry.newSupplier ?? "—"}`,
    );
  }

  if (entry.notes) {
    parts.push(entry.notes);
  }

  return parts.length > 0 ? parts.join(" · ") : "Stock updated";
}

export function serializeStockEditHistory(
  entry: StockEditHistory,
): StockEditHistoryDto {
  return {
    id: entry.id,
    previousQuantity: entry.previousQuantity,
    newQuantity: entry.newQuantity,
    previousReorderLevel: entry.previousReorderLevel,
    newReorderLevel: entry.newReorderLevel,
    previousStorageArea: entry.previousStorageArea,
    newStorageArea: entry.newStorageArea,
    previousSupplier: entry.previousSupplier,
    newSupplier: entry.newSupplier,
    editedBy: entry.editedBy,
    editedAt: entry.editedAt.toISOString(),
    notes: entry.notes,
    summary: buildHistorySummary(entry),
  };
}

export async function listActiveInventoryItems(): Promise<InventoryItemDto[]> {
  const items = await prisma.inventoryItem.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { itemName: "asc" }],
  });

  return items.map(serializeInventoryItem);
}

export type UpdateInventoryItemInput = {
  availableQuantity?: number;
  reorderLevel?: number;
  storageArea?: string;
  supplier?: string | null;
  isActive?: boolean;
  editedBy: string;
};

export async function updateInventoryItem(
  id: string,
  input: UpdateInventoryItemInput,
): Promise<InventoryItemDto> {
  const existing = await prisma.inventoryItem.findUnique({ where: { id } });

  if (!existing) {
    throw new Error("Inventory item not found.");
  }

  const nextAvailableQuantity =
    input.availableQuantity ?? existing.availableQuantity;
  const nextReorderLevel = input.reorderLevel ?? existing.reorderLevel;
  const nextStorageArea = input.storageArea ?? existing.storageArea;
  const nextSupplier =
    input.supplier !== undefined ? input.supplier : existing.supplier;
  const nextIsActive = input.isActive ?? existing.isActive;

  if (nextAvailableQuantity < 0 || nextReorderLevel < 0) {
    throw new Error("Quantities cannot be negative.");
  }

  const hasFieldChange =
    nextAvailableQuantity !== existing.availableQuantity ||
    nextReorderLevel !== existing.reorderLevel ||
    nextStorageArea !== existing.storageArea ||
    nextSupplier !== existing.supplier ||
    nextIsActive !== existing.isActive;

  if (!hasFieldChange) {
    return serializeInventoryItem(existing);
  }

  const editedAt = new Date();
  const disableNote =
    input.isActive === false && existing.isActive
      ? "Item disabled"
      : null;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.stockEditHistory.create({
      data: {
        inventoryItemId: existing.id,
        previousQuantity: existing.availableQuantity,
        newQuantity: nextAvailableQuantity,
        previousReorderLevel: existing.reorderLevel,
        newReorderLevel: nextReorderLevel,
        previousStorageArea: existing.storageArea,
        newStorageArea: nextStorageArea,
        previousSupplier: existing.supplier,
        newSupplier: nextSupplier,
        editedBy: input.editedBy,
        editedAt,
        notes: disableNote,
      },
    });

    return tx.inventoryItem.update({
      where: { id },
      data: {
        availableQuantity: nextAvailableQuantity,
        reorderLevel: nextReorderLevel,
        storageArea: nextStorageArea,
        supplier: nextSupplier,
        isActive: nextIsActive,
        lastEditedAt: editedAt,
        lastEditedBy: input.editedBy,
      },
    });
  });

  return serializeInventoryItem(updated);
}

export async function listInventoryEditHistory(
  inventoryItemId: string,
): Promise<StockEditHistoryDto[]> {
  const rows = await prisma.stockEditHistory.findMany({
    where: { inventoryItemId },
    orderBy: { editedAt: "desc" },
  });

  return rows.map(serializeStockEditHistory);
}
