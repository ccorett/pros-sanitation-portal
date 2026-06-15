/**
 * Import legacy recurring invoice clients from CSV.
 * Run: npx tsx scripts/import-invoice-clients-csv.ts "path/to/Pros Client list.csv"
 */
import { config } from "dotenv";
import { readFileSync } from "fs";
import { resolve } from "path";
import { importLegacyInvoiceClientsFromCsv } from "../src/lib/invoice-import-service";
import { listInvoiceClients } from "../src/lib/invoice-service";
import { prisma } from "../src/lib/prisma";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const DEFAULT_CSV_PATH =
  "C:/Users/Kerwin/Downloads/Pros Client list - Pros Client list.csv";

async function main() {
  const filePath = process.argv[2]
    ? resolve(process.argv[2])
    : DEFAULT_CSV_PATH;
  const csvContent = readFileSync(filePath, "utf8");

  const summary = await importLegacyInvoiceClientsFromCsv(csvContent);
  const clients = await listInvoiceClients();

  console.log(
    JSON.stringify(
      {
        filePath,
        summary,
        activeClientRecords: clients.length,
        sampleImported: clients
          .filter((client) =>
            client.remarks?.includes("legacy recurring invoice register"),
          )
          .slice(0, 5)
          .map((client) => ({
            clientName: client.clientName,
            serviceType: client.serviceType,
            billingCycle: client.billingCycle,
            invoiceCountPerCycle: client.invoiceCountPerCycle,
            nextDueDate: client.nextDueDate,
            status: client.status,
          })),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
