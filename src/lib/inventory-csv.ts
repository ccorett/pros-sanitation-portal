import type { InventoryCategory } from "@prisma/client";
import { formatInventoryCategoryLabel } from "@/lib/inventory-service";

export type InventoryCsvRow = Record<string, string>;

export const INVENTORY_EXPORT_HEADERS = [
  "Item Name",
  "Category",
  "Available Quantity",
  "Unit",
  "Stock Status",
  "Storage Area",
  "Supplier",
  "Last Updated",
  "Action",
] as const;

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  fields.push(current.trim());
  return fields;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function parseInventoryCsvContent(content: string): InventoryCsvRow[] {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  const values = lines.map(parseCsvLine);
  const headerIndex = values.findIndex((row) =>
    row.some((cell) => normalizeHeader(cell ?? "") === "item name"),
  );

  if (headerIndex === -1) {
    throw new Error("CSV is missing an Item Name header row.");
  }

  const headers = values[headerIndex].map((cell) => normalizeHeader(cell ?? ""));
  const rows: InventoryCsvRow[] = [];

  for (const rawRow of values.slice(headerIndex + 1)) {
    if (!rawRow.some((cell) => cell?.trim())) {
      continue;
    }

    const row: InventoryCsvRow = {};
    for (let index = 0; index < headers.length; index += 1) {
      const header = headers[index];
      if (!header) {
        continue;
      }
      row[header] = (rawRow[index] ?? "").trim();
    }

    rows.push(row);
  }

  return rows;
}

const CATEGORY_ALIASES: Record<InventoryCategory, string[]> = {
  EQUIPMENT: ["equipment"],
  CHEMICALS: ["chemicals", "chemical"],
  PPE: ["ppe", "personal protective equipment"],
  CONSUMABLES: ["consumables", "consumable"],
};

export function parseInventoryCategoryLabel(
  value: string,
): InventoryCategory | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  for (const [category, aliases] of Object.entries(CATEGORY_ALIASES) as Array<
    [InventoryCategory, string[]]
  >) {
    if (
      aliases.includes(normalized) ||
      formatInventoryCategoryLabel(category).toLowerCase() === normalized
    ) {
      return category;
    }
  }

  return null;
}

export function pickInventoryRowValue(
  row: InventoryCsvRow,
  aliases: string[],
): string {
  for (const alias of aliases) {
    const value = row[normalizeHeader(alias)];
    if (value?.trim()) {
      return value.trim();
    }
  }
  return "";
}

export function buildInventoryCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}
