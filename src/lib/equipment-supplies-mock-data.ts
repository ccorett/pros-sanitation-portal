export type InventoryCategory =
  | "Equipment"
  | "Chemicals"
  | "PPE"
  | "Consumables";

export type InventoryStatus = "In Stock" | "Low Stock" | "Out of Stock";

export type InventoryUrgency = "Normal" | "High" | "Critical";

export type InventoryItem = {
  id: string;
  name: string;
  category: InventoryCategory;
  availableQuantity: number;
  unit: string;
  reorderLevel: number;
  storageArea: string;
  lastUpdated: string;
};

export type InventoryRequest = {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  reason: string;
  urgency: InventoryUrgency;
  submittedAt: string;
};

export const inventoryCategories: InventoryCategory[] = [
  "Equipment",
  "Chemicals",
  "PPE",
  "Consumables",
];

export const inventoryItems: InventoryItem[] = [
  {
    id: "eq-001",
    name: "Pressure Washer",
    category: "Equipment",
    availableQuantity: 3,
    unit: "unit",
    reorderLevel: 2,
    storageArea: "Depot Bay A",
    lastUpdated: "2026-05-18",
  },
  {
    id: "eq-002",
    name: "Wet/Dry Vacuum",
    category: "Equipment",
    availableQuantity: 0,
    unit: "unit",
    reorderLevel: 2,
    storageArea: "Depot Bay A",
    lastUpdated: "2026-05-15",
  },
  {
    id: "eq-003",
    name: "Floor Scrubber",
    category: "Equipment",
    availableQuantity: 1,
    unit: "unit",
    reorderLevel: 2,
    storageArea: "Depot Bay B",
    lastUpdated: "2026-05-19",
  },
  {
    id: "eq-004",
    name: "Extension Hose Kit",
    category: "Equipment",
    availableQuantity: 5,
    unit: "kit",
    reorderLevel: 3,
    storageArea: "Depot Bay A",
    lastUpdated: "2026-05-17",
  },
  {
    id: "ch-001",
    name: "Degreaser Concentrate",
    category: "Chemicals",
    availableQuantity: 12,
    unit: "gal",
    reorderLevel: 6,
    storageArea: "Chemical Store",
    lastUpdated: "2026-05-20",
  },
  {
    id: "ch-002",
    name: "Disinfectant Solution",
    category: "Chemicals",
    availableQuantity: 0,
    unit: "gal",
    reorderLevel: 8,
    storageArea: "Chemical Store",
    lastUpdated: "2026-05-14",
  },
  {
    id: "ch-003",
    name: "Glass Cleaner",
    category: "Chemicals",
    availableQuantity: 2,
    unit: "gal",
    reorderLevel: 5,
    storageArea: "Chemical Store",
    lastUpdated: "2026-05-19",
  },
  {
    id: "ch-004",
    name: "Sanitizer Refill",
    category: "Chemicals",
    availableQuantity: 4,
    unit: "L",
    reorderLevel: 6,
    storageArea: "Chemical Store",
    lastUpdated: "2026-05-16",
  },
  {
    id: "ppe-001",
    name: "Nitrile Gloves (box)",
    category: "PPE",
    availableQuantity: 24,
    unit: "box",
    reorderLevel: 10,
    storageArea: "PPE Cage",
    lastUpdated: "2026-05-20",
  },
  {
    id: "ppe-002",
    name: "Safety Goggles",
    category: "PPE",
    availableQuantity: 6,
    unit: "pair",
    reorderLevel: 8,
    storageArea: "PPE Cage",
    lastUpdated: "2026-05-18",
  },
  {
    id: "ppe-003",
    name: "Hi-Vis Vest",
    category: "PPE",
    availableQuantity: 0,
    unit: "unit",
    reorderLevel: 5,
    storageArea: "PPE Cage",
    lastUpdated: "2026-05-12",
  },
  {
    id: "ppe-004",
    name: "Rubber Boots (pair)",
    category: "PPE",
    availableQuantity: 3,
    unit: "pair",
    reorderLevel: 4,
    storageArea: "PPE Cage",
    lastUpdated: "2026-05-17",
  },
  {
    id: "con-001",
    name: "Trash Liners (roll)",
    category: "Consumables",
    availableQuantity: 45,
    unit: "roll",
    reorderLevel: 20,
    storageArea: "Consumables Shelf",
    lastUpdated: "2026-05-20",
  },
  {
    id: "con-002",
    name: "Paper Towels (case)",
    category: "Consumables",
    availableQuantity: 0,
    unit: "case",
    reorderLevel: 6,
    storageArea: "Consumables Shelf",
    lastUpdated: "2026-05-13",
  },
  {
    id: "con-003",
    name: "Microfiber Cloths",
    category: "Consumables",
    availableQuantity: 18,
    unit: "pack",
    reorderLevel: 12,
    storageArea: "Consumables Shelf",
    lastUpdated: "2026-05-19",
  },
  {
    id: "con-004",
    name: "Spray Bottles",
    category: "Consumables",
    availableQuantity: 10,
    unit: "unit",
    reorderLevel: 15,
    storageArea: "Consumables Shelf",
    lastUpdated: "2026-05-18",
  },
];

export const urgencyOptions: InventoryUrgency[] = ["Normal", "High", "Critical"];

export function getInventoryStatus(
  quantity: number,
  reorderLevel: number,
): InventoryStatus {
  if (quantity === 0) return "Out of Stock";
  if (quantity < reorderLevel) return "Low Stock";
  return "In Stock";
}

export function inventoryStatusClass(status: InventoryStatus): string {
  if (status === "In Stock") {
    return "border-[#6cc801]/35 bg-[#6cc801]/15 text-[#6cc801]";
  }
  if (status === "Low Stock") {
    return "border-[#f5c542]/35 bg-[#f5c542]/15 text-[#f5c542]";
  }
  return "border-[#ebfbff]/20 bg-[#ebfbff]/10 text-[#ebfbff]/50";
}

export function urgencyClass(urgency: InventoryUrgency): string {
  if (urgency === "Critical") {
    return "border-[#ff4d4f]/35 bg-[#ff4d4f]/15 text-[#ff4d4f]";
  }
  if (urgency === "High") {
    return "border-[#f5c542]/35 bg-[#f5c542]/15 text-[#f5c542]";
  }
  return "border-[#00c6ff]/35 bg-[#00c6ff]/15 text-[#00c6ff]";
}

export function formatRequestDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatInventoryDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00.000Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
