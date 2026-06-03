import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

try {
  const tables = await prisma.$queryRaw`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('inventory_items', 'stock_edit_history')
    ORDER BY table_name
  `;

  const enumRow = await prisma.$queryRaw`
    SELECT typname FROM pg_type WHERE typname = 'InventoryCategory'
  `;

  const [itemCount, historyCount] = await Promise.all([
    prisma.inventoryItem.count(),
    prisma.stockEditHistory.count(),
  ]);

  console.log(
    JSON.stringify(
      {
        tables,
        inventoryCategoryEnum: enumRow,
        rowCounts: { inventoryItems: itemCount, stockEditHistory: historyCount },
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
