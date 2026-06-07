import {
  buildInventoryCsv,
  INVENTORY_EXPORT_HEADERS,
} from "@/lib/inventory-csv";
import { formatEditTimestamp } from "@/lib/admin-format";
import { listActiveInventoryItems } from "@/lib/inventory-service";

export async function buildInventoryExportCsv(): Promise<string> {
  const items = await listActiveInventoryItems();

  const rows = [
    [...INVENTORY_EXPORT_HEADERS],
    ...items.map((item) => [
      item.itemName,
      item.categoryLabel,
      String(item.availableQuantity),
      item.unit,
      item.stockStatus,
      item.storageArea,
      item.supplier ?? "",
      item.lastEditedAt
        ? formatEditTimestamp(item.lastEditedAt)
        : formatEditTimestamp(item.updatedAt),
      "",
    ]),
  ];

  return buildInventoryCsv(rows);
}
