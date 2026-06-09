import {
  computeInitialNextServiceDate,
  computeNextServiceDateAfterCompletion,
  startOfUtcDay,
} from "@/lib/bin-service/schedule";
import { createBinServiceSite } from "@/lib/bin-service/service";
import {
  parseBinLocationCsvContent,
  pickBinLocationRowValue,
  type BinLocationCsvRow,
} from "@/lib/bin-location-csv";
import type { BinServiceSetup } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const DEFAULT_BIN_IMPORT_CLIENT = "Pennysaver";

export type BinLocationImportPreviewAction = "Create" | "Update" | "Skip";

export type BinLocationImportPreviewRow = {
  rowNumber: number;
  location: string;
  action: BinLocationImportPreviewAction;
  expectedNewBins: number | null;
  expectedRegularBins: number | null;
  totalBins: number | null;
  notes: string | null;
};

export type BinLocationImportPreview = {
  fileName: string;
  totalRows: number;
  newCount: number;
  updateCount: number;
  skippedCount: number;
  errorCount: number;
  rows: BinLocationImportPreviewRow[];
};

export type BinLocationImportResult = {
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  auditLogId: string;
};

export type BinLocationImportAuditDto = {
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

type ParsedBinLocationImportRow = {
  rowNumber: number;
  location: string;
  expectedNewBins: number;
  expectedRegularBins: number;
  totalBinsProvided: number | null;
  totalBinsCalculated: number;
  totalBinsWarning: string | null;
  lastServiceDate: Date | null;
  nextServiceDate: Date | null;
  statusLabel: string | null;
  active: boolean;
  notes: string;
};

function normalizeLocationName(value: string): string {
  return value.trim().toLowerCase();
}

function parseWholeNumber(value: string): number | null {
  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function parseOptionalDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const month = Number(usMatch[1]);
    const day = Number(usMatch[2]);
    const year = Number(usMatch[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(parsed.getTime())) {
      return startOfUtcDay(parsed);
    }
  }

  const iso = new Date(trimmed);
  if (!Number.isNaN(iso.getTime())) {
    return startOfUtcDay(iso);
  }

  return null;
}

function parseActiveStatus(statusLabel: string): boolean {
  const normalized = statusLabel.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  if (["inactive", "disabled", "closed"].includes(normalized)) {
    return false;
  }

  return true;
}

function resolveNextServiceDate(input: {
  providedNextDate: Date | null;
  providedLastDate: Date | null;
  existingSetup?: BinServiceSetup | null;
}): Date | null {
  if (input.providedNextDate) {
    return input.providedNextDate;
  }

  const weekPattern = input.existingSetup?.weekPattern ?? "WEEK_1_3";
  const serviceDay = input.existingSetup?.serviceDay ?? "TUESDAY";
  const lastDate =
    input.providedLastDate ?? input.existingSetup?.lastCompletedServiceDate ?? null;

  if (lastDate) {
    return computeNextServiceDateAfterCompletion(lastDate, serviceDay, weekPattern);
  }

  if (input.existingSetup?.nextServiceDate) {
    return input.existingSetup.nextServiceDate;
  }

  return computeInitialNextServiceDate(serviceDay, weekPattern);
}

function parseImportRow(
  row: BinLocationCsvRow,
  rowNumber: number,
): { parsed?: ParsedBinLocationImportRow; error?: string } {
  const location = pickBinLocationRowValue(row, ["location"]);
  const newBinsLabel = pickBinLocationRowValue(row, ["new bins expected", "new bins"]);
  const regularBinsLabel = pickBinLocationRowValue(row, [
    "regular bins expected",
    "regular bins",
  ]);
  const totalBinsLabel = pickBinLocationRowValue(row, ["total bins"]);
  const lastServiceDateLabel = pickBinLocationRowValue(row, ["last service date"]);
  const nextServiceDateLabel = pickBinLocationRowValue(row, ["next service date"]);
  const statusLabel = pickBinLocationRowValue(row, ["status"]);
  const notes = pickBinLocationRowValue(row, ["notes"]);

  if (!location) {
    return { error: "Location is required." };
  }

  const expectedNewBins = parseWholeNumber(newBinsLabel);
  if (expectedNewBins === null) {
    return { error: "New Bins Expected must be a whole number." };
  }

  const expectedRegularBins = parseWholeNumber(regularBinsLabel);
  if (expectedRegularBins === null) {
    return { error: "Regular Bins Expected must be a whole number." };
  }

  const totalBinsProvided = totalBinsLabel
    ? parseWholeNumber(totalBinsLabel)
    : null;
  const totalBinsCalculated = expectedNewBins + expectedRegularBins;
  let totalBinsWarning: string | null = null;

  if (totalBinsLabel && totalBinsProvided === null) {
    return { error: "Total Bins must be a whole number when provided." };
  }

  if (totalBinsProvided !== null && totalBinsProvided !== totalBinsCalculated) {
    totalBinsWarning = `Total Bins (${totalBinsProvided}) does not match New + Regular (${totalBinsCalculated}). Import will use ${totalBinsCalculated}.`;
  }

  const lastServiceDate = lastServiceDateLabel
    ? parseOptionalDate(lastServiceDateLabel)
    : null;
  if (lastServiceDateLabel && !lastServiceDate) {
    return { error: "Last Service Date is invalid." };
  }

  const nextServiceDate = nextServiceDateLabel
    ? parseOptionalDate(nextServiceDateLabel)
    : null;
  if (nextServiceDateLabel && !nextServiceDate) {
    return { error: "Next Service Date is invalid." };
  }

  return {
    parsed: {
      rowNumber,
      location: location.trim(),
      expectedNewBins,
      expectedRegularBins,
      totalBinsProvided,
      totalBinsCalculated,
      totalBinsWarning,
      lastServiceDate,
      nextServiceDate,
      statusLabel: statusLabel || null,
      active: parseActiveStatus(statusLabel),
      notes,
    },
  };
}

function setupNeedsUpdate(
  existing: BinServiceSetup,
  parsed: ParsedBinLocationImportRow,
  resolvedNextServiceDate: Date | null,
): boolean {
  const existingNotes = existing.accessInstructions?.trim() ?? "";
  const parsedNotes = parsed.notes.trim();
  const existingLast = existing.lastCompletedServiceDate?.toISOString() ?? null;
  const parsedLast = parsed.lastServiceDate?.toISOString() ?? null;
  const existingNext = existing.nextServiceDate?.toISOString() ?? null;
  const parsedNext = resolvedNextServiceDate?.toISOString() ?? null;

  return (
    existing.expectedNewBins !== parsed.expectedNewBins ||
    existing.expectedRegularBins !== parsed.expectedRegularBins ||
    existing.active !== parsed.active ||
    existingNotes !== parsedNotes ||
    existingLast !== parsedLast ||
    existingNext !== parsedNext
  );
}

async function loadExistingSitesByLocation() {
  const sites = await prisma.binServiceSite.findMany({
    include: { setup: true },
  });

  const byLocation = new Map<string, (typeof sites)[number]>();
  for (const site of sites) {
    const key = normalizeLocationName(site.name);
    if (!byLocation.has(key)) {
      byLocation.set(key, site);
    }
  }

  return byLocation;
}

function previewMessage(parsed: ParsedBinLocationImportRow): string | null {
  if (parsed.totalBinsWarning) {
    return parsed.totalBinsWarning;
  }
  return null;
}

async function buildImportPreview(
  csvContent: string,
  fileName: string,
): Promise<BinLocationImportPreview> {
  const csvRows = parseBinLocationCsvContent(csvContent);
  const existingByLocation = await loadExistingSitesByLocation();
  const seenLocations = new Set<string>();
  const rows: BinLocationImportPreviewRow[] = [];

  csvRows.forEach((csvRow, index) => {
    const rowNumber = index + 1;
    const { parsed, error } = parseImportRow(csvRow, rowNumber);

    if (!parsed) {
      rows.push({
        rowNumber,
        location: pickBinLocationRowValue(csvRow, ["location"]) || "(blank)",
        action: "Skip",
        expectedNewBins: null,
        expectedRegularBins: null,
        totalBins: null,
        notes: error ?? "Invalid row.",
      });
      return;
    }

    const normalizedLocation = normalizeLocationName(parsed.location);
    if (seenLocations.has(normalizedLocation)) {
      rows.push({
        rowNumber,
        location: parsed.location,
        action: "Skip",
        expectedNewBins: parsed.expectedNewBins,
        expectedRegularBins: parsed.expectedRegularBins,
        totalBins: parsed.totalBinsCalculated,
        notes: "Duplicate Location in import file.",
      });
      return;
    }

    seenLocations.add(normalizedLocation);
    const existing = existingByLocation.get(normalizedLocation);
    const resolvedNextServiceDate = resolveNextServiceDate({
      providedNextDate: parsed.nextServiceDate,
      providedLastDate: parsed.lastServiceDate,
      existingSetup: existing?.setup,
    });

    if (!existing) {
      rows.push({
        rowNumber,
        location: parsed.location,
        action: "Create",
        expectedNewBins: parsed.expectedNewBins,
        expectedRegularBins: parsed.expectedRegularBins,
        totalBins: parsed.totalBinsCalculated,
        notes: previewMessage(parsed),
      });
      return;
    }

    if (!existing.setup) {
      rows.push({
        rowNumber,
        location: parsed.location,
        action: "Update",
        expectedNewBins: parsed.expectedNewBins,
        expectedRegularBins: parsed.expectedRegularBins,
        totalBins: parsed.totalBinsCalculated,
        notes: previewMessage(parsed),
      });
      return;
    }

    if (!setupNeedsUpdate(existing.setup, parsed, resolvedNextServiceDate)) {
      rows.push({
        rowNumber,
        location: parsed.location,
        action: "Skip",
        expectedNewBins: parsed.expectedNewBins,
        expectedRegularBins: parsed.expectedRegularBins,
        totalBins: parsed.totalBinsCalculated,
        notes: previewMessage(parsed) ?? "No changes detected.",
      });
      return;
    }

    rows.push({
      rowNumber,
      location: parsed.location,
      action: "Update",
      expectedNewBins: parsed.expectedNewBins,
      expectedRegularBins: parsed.expectedRegularBins,
      totalBins: parsed.totalBinsCalculated,
      notes: previewMessage(parsed),
    });
  });

  const newCount = rows.filter((row) => row.action === "Create").length;
  const updateCount = rows.filter((row) => row.action === "Update").length;
  const skippedCount = rows.filter((row) => row.action === "Skip").length;
  const errorCount = rows.filter(
    (row) =>
      row.action === "Skip" &&
      row.notes &&
      row.notes !== "No changes detected." &&
      !row.notes.startsWith("Total Bins"),
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

async function applyParsedRow(parsed: ParsedBinLocationImportRow) {
  const existingByLocation = await loadExistingSitesByLocation();
  const existing = existingByLocation.get(normalizeLocationName(parsed.location));

  if (!existing) {
    const site = await createBinServiceSite({
      clientName: DEFAULT_BIN_IMPORT_CLIENT,
      name: parsed.location,
      address: parsed.location,
    });

    const nextServiceDate = resolveNextServiceDate({
      providedNextDate: parsed.nextServiceDate,
      providedLastDate: parsed.lastServiceDate,
    });

    await prisma.binServiceSetup.create({
      data: {
        siteId: site.id,
        expectedRegularBins: parsed.expectedRegularBins,
        expectedNewBins: parsed.expectedNewBins,
        weekPattern: "WEEK_1_3",
        serviceDay: "TUESDAY",
        assignedTechnicianId: null,
        accessInstructions: parsed.notes.trim() || null,
        signatureRequired: false,
        active: parsed.active,
        lastCompletedServiceDate: parsed.lastServiceDate,
        nextServiceDate,
      },
    });

    return "created" as const;
  }

  const nextServiceDate = resolveNextServiceDate({
    providedNextDate: parsed.nextServiceDate,
    providedLastDate: parsed.lastServiceDate,
    existingSetup: existing.setup,
  });

  await prisma.binServiceSetup.upsert({
    where: { siteId: existing.id },
    create: {
      siteId: existing.id,
      expectedRegularBins: parsed.expectedRegularBins,
      expectedNewBins: parsed.expectedNewBins,
      weekPattern: "WEEK_1_3",
      serviceDay: "TUESDAY",
      assignedTechnicianId: null,
      accessInstructions: parsed.notes.trim() || null,
      signatureRequired: false,
      active: parsed.active,
      lastCompletedServiceDate: parsed.lastServiceDate,
      nextServiceDate,
    },
    update: {
      expectedRegularBins: parsed.expectedRegularBins,
      expectedNewBins: parsed.expectedNewBins,
      accessInstructions: parsed.notes.trim() || null,
      active: parsed.active,
      lastCompletedServiceDate: parsed.lastServiceDate,
      nextServiceDate,
    },
  });

  return "updated" as const;
}

export async function previewBinLocationCsvImport(
  csvContent: string,
  fileName: string,
): Promise<BinLocationImportPreview> {
  return buildImportPreview(csvContent, fileName);
}

export async function confirmBinLocationCsvImport(input: {
  csvContent: string;
  fileName: string;
  importedById: string;
  importedByName: string;
}): Promise<BinLocationImportResult> {
  const preview = await buildImportPreview(input.csvContent, input.fileName);
  const csvRows = parseBinLocationCsvContent(input.csvContent);
  const seenLocations = new Set<string>();

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let index = 0; index < csvRows.length; index += 1) {
    const previewRow = preview.rows[index];
    if (!previewRow || previewRow.action === "Skip") {
      skippedCount += 1;
      if (
        previewRow?.notes &&
        previewRow.notes !== "No changes detected." &&
        !previewRow.notes.startsWith("Total Bins")
      ) {
        errorCount += 1;
      }
      continue;
    }

    const { parsed, error } = parseImportRow(csvRows[index], index + 1);
    if (!parsed || error) {
      skippedCount += 1;
      errorCount += 1;
      continue;
    }

    const normalizedLocation = normalizeLocationName(parsed.location);
    if (seenLocations.has(normalizedLocation)) {
      skippedCount += 1;
      errorCount += 1;
      continue;
    }
    seenLocations.add(normalizedLocation);

    const result = await applyParsedRow(parsed);
    if (result === "created") {
      createdCount += 1;
    } else {
      updatedCount += 1;
    }
  }

  const auditLog = await prisma.binLocationImportLog.create({
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

export async function listBinLocationImportAuditLogs(): Promise<
  BinLocationImportAuditDto[]
> {
  const logs = await prisma.binLocationImportLog.findMany({
    orderBy: { importedAt: "desc" },
    take: 25,
  });

  return logs.map((log) => ({
    id: log.id,
    fileName: log.fileName,
    importedBy: log.importedBy,
    importedAt: log.importedAt.toISOString(),
    totalRows: log.totalRows,
    createdCount: log.createdCount,
    updatedCount: log.updatedCount,
    skippedCount: log.skippedCount,
    errorCount: log.errorCount,
  }));
}
