import {
  InvoiceBillingCycle,
  InvoiceServiceType,
} from "@prisma/client";
import {
  parseInvoiceMonthLabel,
  upsertImportedInvoiceClient,
} from "@/lib/invoice-service";

export type InvoiceImportSkip = {
  clientName: string;
  reason: string;
};

export type InvoiceImportSummary = {
  totalClientsImported: number;
  monthlyClients: number;
  annualClients: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  skipped: InvoiceImportSkip[];
};

type ParsedLegacyInvoiceRow = {
  rowNumber: number;
  clientName: string;
  invoiceQuantity: number;
  cleaningServices: string;
  binsService: string;
  annualMonthRaw: string;
};

type ImportTarget = {
  rowNumber: number;
  clientName: string;
  serviceType: InvoiceServiceType;
  billingCycle: InvoiceBillingCycle;
  invoiceCountPerCycle: number;
  annualDueMonth?: number | null;
};

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

function parseInvoiceQuantity(raw: string): number {
  const match = raw.match(/(\d+)/);
  return Math.max(1, match ? Number(match[1]) : 1);
}

function normalizeServiceCell(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function parseLegacyInvoiceClientCsv(content: string): ParsedLegacyInvoiceRow[] {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  const rows = lines.slice(1).map((line, index) => {
    const fields = parseCsvLine(line);
    return {
      rowNumber: index + 2,
      clientName: fields[0]?.trim() ?? "",
      invoiceQuantity: parseInvoiceQuantity(fields[2] ?? "1"),
      cleaningServices: normalizeServiceCell(fields[4] ?? ""),
      binsService: normalizeServiceCell(fields[5] ?? ""),
      annualMonthRaw: fields[6]?.trim() ?? "",
    };
  });

  return rows.filter((row) => row.clientName.length > 0);
}

function buildImportTargets(row: ParsedLegacyInvoiceRow): {
  targets: ImportTarget[];
  skipped: InvoiceImportSkip[];
} {
  const skipped: InvoiceImportSkip[] = [];
  const targets: ImportTarget[] = [];

  if (!row.clientName) {
    return { targets, skipped };
  }

  if (/^monthly$/i.test(row.cleaningServices)) {
    targets.push({
      rowNumber: row.rowNumber,
      clientName: row.clientName,
      serviceType: InvoiceServiceType.CLEANING_SERVICES,
      billingCycle: InvoiceBillingCycle.MONTHLY,
      invoiceCountPerCycle: row.invoiceQuantity,
    });
  }

  if (/^annually$/i.test(row.binsService)) {
    const annualDueMonth = parseInvoiceMonthLabel(row.annualMonthRaw);
    if (!annualDueMonth) {
      skipped.push({
        clientName: row.clientName,
        reason: `Row ${row.rowNumber}: annual bin service requires a single month (got "${row.annualMonthRaw || "blank"}").`,
      });
    } else {
      targets.push({
        rowNumber: row.rowNumber,
        clientName: row.clientName,
        serviceType: InvoiceServiceType.BIN_SERVICES,
        billingCycle: InvoiceBillingCycle.ANNUALLY,
        invoiceCountPerCycle: row.invoiceQuantity,
        annualDueMonth,
      });
    }
  } else if (/bi\s*annually/i.test(row.binsService)) {
    skipped.push({
      clientName: row.clientName,
      reason: `Row ${row.rowNumber}: bi-annual bin service is not supported in import.`,
    });
  }

  if (targets.length === 0 && skipped.length === 0) {
    skipped.push({
      clientName: row.clientName,
      reason: `Row ${row.rowNumber}: no monthly cleaning or annual bin service found.`,
    });
  }

  return { targets, skipped };
}

export async function importLegacyInvoiceClientsFromCsv(
  content: string,
): Promise<InvoiceImportSummary> {
  const rows = parseLegacyInvoiceClientCsv(content);
  const summary: InvoiceImportSummary = {
    totalClientsImported: 0,
    monthlyClients: 0,
    annualClients: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    recordsSkipped: 0,
    skipped: [],
  };

  const importedClientNames = new Set<string>();

  for (const row of rows) {
    const { targets, skipped } = buildImportTargets(row);
    summary.skipped.push(...skipped);
    summary.recordsSkipped += skipped.length;

    for (const target of targets) {
      try {
        const result = await upsertImportedInvoiceClient({
          clientName: target.clientName,
          serviceType: target.serviceType,
          billingCycle: target.billingCycle,
          invoiceCountPerCycle: target.invoiceCountPerCycle,
          usualDueDay: 1,
          annualDueMonth: target.annualDueMonth,
        });

        importedClientNames.add(target.clientName);

        if (result === "created") {
          summary.recordsCreated += 1;
        } else {
          summary.recordsUpdated += 1;
        }

        if (target.billingCycle === InvoiceBillingCycle.MONTHLY) {
          summary.monthlyClients += 1;
        } else {
          summary.annualClients += 1;
        }
      } catch (error) {
        summary.recordsSkipped += 1;
        summary.skipped.push({
          clientName: target.clientName,
          reason:
            error instanceof Error
              ? `Row ${target.rowNumber}: ${error.message}`
              : `Row ${target.rowNumber}: import failed.`,
        });
      }
    }
  }

  summary.totalClientsImported = importedClientNames.size;
  return summary;
}
