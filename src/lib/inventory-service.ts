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

export function isLowStockItem(item: Pick<
  InventoryItem,
  "availableQuantity" | "reorderLevel" | "isActive"
>): boolean {
  return item.isActive && item.availableQuantity <= item.reorderLevel;
}

export function isOnPurchasingList(item: Pick<
  InventoryItem,
  | "availableQuantity"
  | "reorderLevel"
  | "isActive"
  | "purchasingExcludedFromList"
  | "purchasingOrderedAt"
>): boolean {
  return (
    isLowStockItem(item) &&
    !item.purchasingExcludedFromList &&
    item.purchasingOrderedAt === null
  );
}

export function suggestedPurchaseQuantity(
  availableQuantity: number,
  reorderLevel: number,
): number {
  return Math.max(reorderLevel * 2 - availableQuantity, reorderLevel);
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

export type CreateInventoryItemInput = {
  itemName: string;
  category: InventoryCategory;
  availableQuantity: number;
  unit: string;
  reorderLevel?: number;
  storageArea: string;
  supplier?: string | null;
  editedBy: string;
  notes?: string | null;
};

export type UpdateInventoryItemInput = {
  itemName?: string;
  category?: InventoryCategory;
  availableQuantity?: number;
  unit?: string;
  reorderLevel?: number;
  storageArea?: string;
  supplier?: string | null;
  isActive?: boolean;
  editedBy: string;
  notes?: string | null;
};

const DEFAULT_NEW_ITEM_REORDER_LEVEL = 5;

export async function createInventoryItem(
  input: CreateInventoryItemInput,
): Promise<InventoryItemDto> {
  const itemName = input.itemName.trim();
  const storageArea = input.storageArea.trim();
  const unit = input.unit.trim();
  const reorderLevel = input.reorderLevel ?? DEFAULT_NEW_ITEM_REORDER_LEVEL;

  if (!itemName || !storageArea || !unit) {
    throw new Error("Item name, unit, and storage area are required.");
  }

  if (input.availableQuantity < 0 || reorderLevel < 0) {
    throw new Error("Quantities cannot be negative.");
  }

  const editedAt = new Date();
  const created = await prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.create({
      data: {
        itemName,
        category: input.category,
        availableQuantity: input.availableQuantity,
        unit,
        reorderLevel,
        storageArea,
        supplier: input.supplier?.trim() || null,
        lastEditedAt: editedAt,
        lastEditedBy: input.editedBy,
      },
    });

    await tx.stockEditHistory.create({
      data: {
        inventoryItemId: item.id,
        previousQuantity: 0,
        newQuantity: input.availableQuantity,
        previousReorderLevel: reorderLevel,
        newReorderLevel: reorderLevel,
        previousStorageArea: storageArea,
        newStorageArea: storageArea,
        previousSupplier: input.supplier?.trim() || null,
        newSupplier: input.supplier?.trim() || null,
        editedBy: input.editedBy,
        editedAt,
        notes: input.notes ?? "Inventory item created",
      },
    });

    return item;
  });

  return serializeInventoryItem(created);
}

export async function updateInventoryItem(
  id: string,
  input: UpdateInventoryItemInput,
): Promise<InventoryItemDto> {
  const existing = await prisma.inventoryItem.findUnique({ where: { id } });

  if (!existing) {
    throw new Error("Inventory item not found.");
  }

  const nextItemName = input.itemName?.trim() ?? existing.itemName;
  const nextCategory = input.category ?? existing.category;
  const nextAvailableQuantity =
    input.availableQuantity ?? existing.availableQuantity;
  const nextUnit = input.unit?.trim() ?? existing.unit;
  const nextReorderLevel = input.reorderLevel ?? existing.reorderLevel;
  const nextStorageArea = input.storageArea ?? existing.storageArea;
  const nextSupplier =
    input.supplier !== undefined ? input.supplier : existing.supplier;
  const nextIsActive = input.isActive ?? existing.isActive;
  const stockRecovered = nextAvailableQuantity > nextReorderLevel;

  if (nextAvailableQuantity < 0 || nextReorderLevel < 0) {
    throw new Error("Quantities cannot be negative.");
  }

  const hasFieldChange =
    nextItemName !== existing.itemName ||
    nextCategory !== existing.category ||
    nextAvailableQuantity !== existing.availableQuantity ||
    nextUnit !== existing.unit ||
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
  const categoryNote =
    nextCategory !== existing.category
      ? `Category: ${formatInventoryCategoryLabel(existing.category)} → ${formatInventoryCategoryLabel(nextCategory)}`
      : null;
  const historyNotes =
    input.notes ??
    ([disableNote, categoryNote].filter(Boolean).join(" · ") || null);

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
        notes: historyNotes,
      },
    });

    return tx.inventoryItem.update({
      where: { id },
      data: {
        itemName: nextItemName,
        category: nextCategory,
        availableQuantity: nextAvailableQuantity,
        unit: nextUnit,
        reorderLevel: nextReorderLevel,
        storageArea: nextStorageArea,
        supplier: nextSupplier,
        isActive: nextIsActive,
        lastEditedAt: editedAt,
        lastEditedBy: input.editedBy,
        ...(stockRecovered
          ? {
              purchasingExcludedFromList: false,
              purchasingOrderedAt: null,
            }
          : {}),
      },
    });
  });

  return serializeInventoryItem(updated);
}

export async function countLowStockActiveItems(): Promise<number> {
  const items = await prisma.inventoryItem.findMany({
    where: { isActive: true },
    select: {
      availableQuantity: true,
      reorderLevel: true,
      isActive: true,
    },
  });

  return items.filter(isLowStockItem).length;
}

export async function listPurchasingListItems(): Promise<InventoryItemDto[]> {
  const items = await prisma.inventoryItem.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { itemName: "asc" }],
  });

  return items.filter(isOnPurchasingList).map(serializeInventoryItem);
}

export async function markPurchasingOrdered(
  id: string,
  editedBy: string,
): Promise<InventoryItemDto> {
  const existing = await prisma.inventoryItem.findUnique({ where: { id } });

  if (!existing) {
    throw new Error("Inventory item not found.");
  }

  if (!isLowStockItem(existing)) {
    throw new Error("Only low-stock items can be marked ordered.");
  }

  const editedAt = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    await tx.stockEditHistory.create({
      data: {
        inventoryItemId: existing.id,
        previousQuantity: existing.availableQuantity,
        newQuantity: existing.availableQuantity,
        previousReorderLevel: existing.reorderLevel,
        newReorderLevel: existing.reorderLevel,
        previousStorageArea: existing.storageArea,
        newStorageArea: existing.storageArea,
        previousSupplier: existing.supplier,
        newSupplier: existing.supplier,
        editedBy,
        editedAt,
        notes: "Marked Ordered: Needs Purchase → Ordered",
      },
    });

    return tx.inventoryItem.update({
      where: { id },
      data: {
        purchasingOrderedAt: editedAt,
        lastEditedAt: editedAt,
        lastEditedBy: editedBy,
      },
    });
  });

  return serializeInventoryItem(updated);
}

export async function excludeFromPurchasingList(
  id: string,
  editedBy: string,
): Promise<InventoryItemDto> {
  const existing = await prisma.inventoryItem.findUnique({ where: { id } });

  if (!existing) {
    throw new Error("Inventory item not found.");
  }

  if (!isLowStockItem(existing)) {
    throw new Error("Only low-stock items can be removed from the purchasing list.");
  }

  const editedAt = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    await tx.stockEditHistory.create({
      data: {
        inventoryItemId: existing.id,
        previousQuantity: existing.availableQuantity,
        newQuantity: existing.availableQuantity,
        previousReorderLevel: existing.reorderLevel,
        newReorderLevel: existing.reorderLevel,
        previousStorageArea: existing.storageArea,
        newStorageArea: existing.storageArea,
        previousSupplier: existing.supplier,
        newSupplier: existing.supplier,
        editedBy,
        editedAt,
        notes: "Removed From List: Active → Removed",
      },
    });

    return tx.inventoryItem.update({
      where: { id },
      data: {
        purchasingExcludedFromList: true,
        lastEditedAt: editedAt,
        lastEditedBy: editedBy,
      },
    });
  });

  return serializeInventoryItem(updated);
}

export async function getLatestInventoryActivityLabel(): Promise<string | null> {
  const latest = await prisma.inventoryItem.findFirst({
    where: { isActive: true, lastEditedAt: { not: null } },
    orderBy: { lastEditedAt: "desc" },
    select: { lastEditedAt: true },
  });

  return latest?.lastEditedAt?.toISOString() ?? null;
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
