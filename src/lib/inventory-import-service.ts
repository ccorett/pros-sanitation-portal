import type { InventoryCategory, InventoryItem } from "@prisma/client";
import {
  parseInventoryCategoryLabel,
  parseInventoryCsvContent,
  pickInventoryRowValue,
  type InventoryCsvRow,
} from "@/lib/inventory-csv";
import { createInventoryItem, updateInventoryItem } from "@/lib/inventory-service";
import { prisma } from "@/lib/prisma";

export type InventoryImportPreviewAction = "Create" | "Update" | "Skip";

export type InventoryImportPreviewRow = {
  rowNumber: number;
  itemName: string;
  action: InventoryImportPreviewAction;
  currentQuantity: number | null;
  newQuantity: number | null;
  notes: string | null;
};

export type InventoryImportPreview = {
  fileName: string;
  totalRows: number;
  newCount: number;
  updateCount: number;
  skippedCount: number;
  errorCount: number;
  rows: InventoryImportPreviewRow[];
};

export type InventoryImportResult = {
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  auditLogId: string;
};

export type InventoryImportAuditDto = {
  id: string;
  fileName: string;
  importedBy: string;
  importedAt: string;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
};

type ParsedInventoryImportRow = {
  rowNumber: number;
  itemName: string;
  category: InventoryCategory;
  availableQuantity: number;
  unit: string;
  storageArea: string;
  supplier: string | null;
};

function normalizeItemName(value: string): string {
  return value.trim().toLowerCase();
}

function parseQuantity(value: string): number | null {
  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return null;
  }

  return parsed;
}

function parseImportRow(
  row: InventoryCsvRow,
  rowNumber: number,
): { parsed?: ParsedInventoryImportRow; error?: string } {
  const itemName = pickInventoryRowValue(row, ["item name", "name"]);
  const categoryLabel = pickInventoryRowValue(row, ["category"]);
  const quantityLabel = pickInventoryRowValue(row, [
    "available quantity",
    "quantity",
  ]);
  const unit = pickInventoryRowValue(row, ["unit"]);
  const storageArea = pickInventoryRowValue(row, ["storage area", "storage"]);
  const supplier = pickInventoryRowValue(row, ["supplier"]) || null;

  if (!itemName) {
    return { error: "Item Name is required." };
  }

  const category = parseInventoryCategoryLabel(categoryLabel);
  if (!category) {
    return { error: `Invalid category: ${categoryLabel || "(blank)"}` };
  }

  const availableQuantity = parseQuantity(quantityLabel);
  if (availableQuantity === null) {
    return { error: "Available Quantity must be a whole number." };
  }

  if (availableQuantity < 0) {
    return { error: "Available Quantity cannot be below 0." };
  }

  if (!unit) {
    return { error: "Unit is required." };
  }

  if (!storageArea) {
    return { error: "Storage Area is required." };
  }

  return {
    parsed: {
      rowNumber,
      itemName: itemName.trim(),
      category,
      availableQuantity,
      unit,
      storageArea,
      supplier,
    },
  };
}

function itemNeedsUpdate(
  existing: InventoryItem,
  parsed: ParsedInventoryImportRow,
): boolean {
  return (
    existing.category !== parsed.category ||
    existing.availableQuantity !== parsed.availableQuantity ||
    existing.unit !== parsed.unit ||
    existing.storageArea !== parsed.storageArea ||
    (existing.supplier ?? "") !== (parsed.supplier ?? "")
  );
}

async function buildImportPreview(
  csvContent: string,
  fileName: string,
): Promise<InventoryImportPreview> {
  const csvRows = parseInventoryCsvContent(csvContent);
  const existingItems = await prisma.inventoryItem.findMany({
    where: { isActive: true },
  });
  const existingByName = new Map(
    existingItems.map((item) => [normalizeItemName(item.itemName), item]),
  );
  const seenNames = new Set<string>();
  const rows: InventoryImportPreviewRow[] = [];

  csvRows.forEach((csvRow, index) => {
    const rowNumber = index + 1;
    const { parsed, error } = parseImportRow(csvRow, rowNumber);

    if (!parsed) {
      rows.push({
        rowNumber,
        itemName: pickInventoryRowValue(csvRow, ["item name", "name"]) || "(blank)",
        action: "Skip",
        currentQuantity: null,
        newQuantity: null,
        notes: error ?? "Invalid row.",
      });
      return;
    }

    const normalizedName = normalizeItemName(parsed.itemName);
    if (seenNames.has(normalizedName)) {
      rows.push({
        rowNumber,
        itemName: parsed.itemName,
        action: "Skip",
        currentQuantity: existingByName.get(normalizedName)?.availableQuantity ?? null,
        newQuantity: parsed.availableQuantity,
        notes: "Duplicate Item Name in import file.",
      });
      return;
    }

    seenNames.add(normalizedName);
    const existing = existingByName.get(normalizedName);

    if (!existing) {
      rows.push({
        rowNumber,
        itemName: parsed.itemName,
        action: "Create",
        currentQuantity: null,
        newQuantity: parsed.availableQuantity,
        notes: null,
      });
      return;
    }

    if (!itemNeedsUpdate(existing, parsed)) {
      rows.push({
        rowNumber,
        itemName: parsed.itemName,
        action: "Skip",
        currentQuantity: existing.availableQuantity,
        newQuantity: parsed.availableQuantity,
        notes: "No changes detected.",
      });
      return;
    }

    rows.push({
      rowNumber,
      itemName: parsed.itemName,
      action: "Update",
      currentQuantity: existing.availableQuantity,
      newQuantity: parsed.availableQuantity,
      notes: null,
    });
  });

  const newCount = rows.filter((row) => row.action === "Create").length;
  const updateCount = rows.filter((row) => row.action === "Update").length;
  const skippedCount = rows.filter((row) => row.action === "Skip").length;
  const errorCount = rows.filter(
    (row) => row.action === "Skip" && row.notes && row.notes !== "No changes detected.",
  ).length;

  return {
    fileName,
    totalRows: rows.length,
    newCount,
    updateCount,
    skippedCount,
    errorCount,
    rows,
  };
}

export async function previewInventoryCsvImport(
  csvContent: string,
  fileName: string,
): Promise<InventoryImportPreview> {
  return buildImportPreview(csvContent, fileName);
}

export async function confirmInventoryCsvImport(input: {
  csvContent: string;
  fileName: string;
  importedById: string;
  importedByName: string;
}): Promise<InventoryImportResult> {
  const preview = await buildImportPreview(input.csvContent, input.fileName);
  const importNote = `Inventory import: ${input.fileName}`;
  const existingItems = await prisma.inventoryItem.findMany({
    where: { isActive: true },
  });
  const existingByName = new Map(
    existingItems.map((item) => [normalizeItemName(item.itemName), item]),
  );

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  const csvRows = parseInventoryCsvContent(input.csvContent);
  const seenNames = new Set<string>();

  for (let index = 0; index < csvRows.length; index += 1) {
    const previewRow = preview.rows[index];
    if (!previewRow || previewRow.action === "Skip") {
      skippedCount += 1;
      if (previewRow?.notes && previewRow.notes !== "No changes detected.") {
        errorCount += 1;
      }
      continue;
    }

    const { parsed } = parseImportRow(csvRows[index], index + 1);
    if (!parsed) {
      errorCount += 1;
      continue;
    }

    const normalizedName = normalizeItemName(parsed.itemName);
    if (seenNames.has(normalizedName)) {
      skippedCount += 1;
      errorCount += 1;
      continue;
    }
    seenNames.add(normalizedName);

    if (previewRow.action === "Create") {
      await createInventoryItem({
        itemName: parsed.itemName,
        category: parsed.category,
        availableQuantity: parsed.availableQuantity,
        unit: parsed.unit,
        storageArea: parsed.storageArea,
        supplier: parsed.supplier,
        editedBy: input.importedByName,
        notes: importNote,
      });
      createdCount += 1;
      continue;
    }

    const existing = existingByName.get(normalizedName);
    if (!existing) {
      errorCount += 1;
      skippedCount += 1;
      continue;
    }

    await updateInventoryItem(existing.id, {
      category: parsed.category,
      availableQuantity: parsed.availableQuantity,
      unit: parsed.unit,
      storageArea: parsed.storageArea,
      supplier: parsed.supplier,
      editedBy: input.importedByName,
      notes: importNote,
    });
    updatedCount += 1;
  }

  const auditLog = await prisma.inventoryImportLog.create({
    data: {
      fileName: input.fileName,
      importedById: input.importedById,
      importedBy: input.importedByName,
      totalRows: preview.totalRows,
      createdCount,
      updatedCount,
      skippedCount,
      errorCount,
    },
  });

  return {
    totalRows: preview.totalRows,
    createdCount,
    updatedCount,
    skippedCount,
    errorCount,
    auditLogId: auditLog.id,
  };
}

export async function listInventoryImportAuditLogs(
  limit = 20,
): Promise<InventoryImportAuditDto[]> {
  const rows = await prisma.inventoryImportLog.findMany({
    orderBy: { importedAt: "desc" },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    fileName: row.fileName,
    importedBy: row.importedBy,
    importedAt: row.importedAt.toISOString(),
    totalRows: row.totalRows,
    createdCount: row.createdCount,
    updatedCount: row.updatedCount,
    skippedCount: row.skippedCount,
    errorCount: row.errorCount,
  }));
}

export function inventoryImportCategoryHint(): string {
  return ["Equipment", "Chemicals", "PPE", "Consumables"].join(", ");
}
