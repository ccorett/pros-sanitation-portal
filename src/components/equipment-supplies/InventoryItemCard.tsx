import type { InventoryItem, InventoryStatus } from "@/lib/equipment-supplies-mock-data";
import { getInventoryStatus,
  inventoryStatusClass,
} from "@/lib/equipment-supplies-mock-data";
import { Package } from "lucide-react";

type InventoryItemCardProps = {
  item: InventoryItem;
  onRequest: (item: InventoryItem) => void;
};

export function InventoryItemCard({ item, onRequest }: InventoryItemCardProps) {
  const status: InventoryStatus = getInventoryStatus(
    item.availableQuantity,
    item.reorderLevel,
  );
  const statusClass = inventoryStatusClass(status);

  return (
    <article className="glass-card flex h-full flex-col rounded-2xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#00c6ff]/15 text-[#00c6ff]">
          <Package className="h-5 w-5" aria-hidden="true" />
        </div>
        <span className="rounded-full border border-[#ebfbff]/15 bg-[#ebfbff]/5 px-3 py-1 text-xs font-semibold text-[#ebfbff]/60">
          {item.category}
        </span>
      </div>

      <h2 className="mt-4 text-lg font-bold text-[#ebfbff]">{item.name}</h2>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClass}`}
        >
          {status}
        </span>
        <span className="text-sm text-[#ebfbff]/60">
          Available: {item.availableQuantity}
        </span>
      </div>

      <div className="mt-6 flex flex-1 items-end">
        <button
          type="button"
          onClick={() => onRequest(item)}
          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-4 py-3 text-sm font-semibold text-[#ebfbff] transition-colors hover:bg-[#6cc801]/20"
        >
          Request Item
        </button>
      </div>
    </article>
  );
}
