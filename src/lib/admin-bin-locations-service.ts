import {
  formatServiceDayLabel,
  formatWeekPatternLabel,
} from "@/lib/bin-service/schedule";
import {
  enrichSiteWithStatus,
  listBinServiceSites,
} from "@/lib/bin-service/service";
import type { RotationStatusResult } from "@/lib/bin-service/status";
import type { BinWeekPattern, ServiceDayOfWeek } from "@prisma/client";

export type AdminBinLocationRow = {
  siteId: string;
  location: string;
  clientName: string;
  newBinsExpected: number;
  regularBinsExpected: number;
  totalBins: number;
  lastServiceDate: string | null;
  nextServiceDate: string | null;
  statusLabel: string;
  notes: string;
  lastEditedAt: string | null;
  weekPattern: BinWeekPattern | null;
  weekPatternLabel: string | null;
  serviceDay: ServiceDayOfWeek | null;
  serviceDayLabel: string | null;
  removedAt: string | null;
  rotation: RotationStatusResult;
  isDueOrOverdue: boolean;
  needsAttention: boolean;
};

export async function listAdminBinLocationRows(): Promise<AdminBinLocationRow[]> {
  const sites = await listBinServiceSites();

  return sites.map((site) => {
    const { rotation, openJob } = enrichSiteWithStatus(site);
    const setup = site.setup;
    const newBins = setup?.expectedNewBins ?? 0;
    const regularBins = setup?.expectedRegularBins ?? 0;

    return {
      siteId: site.id,
      location: site.name,
      clientName: site.client.name,
      newBinsExpected: newBins,
      regularBinsExpected: regularBins,
      totalBins: newBins + regularBins,
      lastServiceDate: setup?.lastCompletedServiceDate
        ? setup.lastCompletedServiceDate.toISOString().slice(0, 10)
        : null,
      nextServiceDate: setup?.nextServiceDate
        ? setup.nextServiceDate.toISOString().slice(0, 10)
        : openJob
          ? openJob.scheduledDate.toISOString().slice(0, 10)
          : null,
      statusLabel: rotation.label,
      notes: setup?.accessInstructions?.trim() ?? "",
      lastEditedAt: setup?.updatedAt
        ? setup.updatedAt.toISOString()
        : site.updatedAt.toISOString(),
      weekPattern: setup?.weekPattern ?? null,
      weekPatternLabel: setup ? formatWeekPatternLabel(setup.weekPattern) : null,
      serviceDay: setup?.serviceDay ?? null,
      serviceDayLabel: setup ? formatServiceDayLabel(setup.serviceDay) : null,
      removedAt: setup?.removedAt ? setup.removedAt.toISOString() : null,
      rotation,
      isDueOrOverdue:
        rotation.isOverdue ||
        rotation.isDueSoon ||
        rotation.color === "red" ||
        rotation.color === "yellow",
      needsAttention: rotation.needsAttention,
    };
  });
}

export function filterAdminBinLocationRows(
  rows: AdminBinLocationRow[],
  filters: {
    search?: string;
    status?: string;
    dueOverdue?: string;
    weekPattern?: string;
    serviceDay?: string;
    minTotalBins?: string;
    maxTotalBins?: string;
    lastServicedFrom?: string;
    lastServicedTo?: string;
    showRemoved?: boolean;
  },
): AdminBinLocationRow[] {
  const search = filters.search?.trim().toLowerCase() ?? "";

  return rows.filter((row) => {
    if (filters.status === "Removed") {
      if (!row.removedAt) return false;
    } else if (!filters.showRemoved && row.removedAt) {
      return false;
    }

    if (search && !row.location.toLowerCase().includes(search)) {
      return false;
    }

    if (filters.status && filters.status !== "all" && filters.status !== "Removed") {
      if (row.statusLabel !== filters.status) {
        return false;
      }
    }

    if (filters.dueOverdue && filters.dueOverdue !== "all") {
      if (filters.dueOverdue === "due" && !row.rotation.isDueSoon) return false;
      if (filters.dueOverdue === "overdue" && !row.rotation.isOverdue) return false;
      if (filters.dueOverdue === "due_or_overdue" && !row.isDueOrOverdue) {
        return false;
      }
    }

    if (
      filters.weekPattern &&
      filters.weekPattern !== "all" &&
      row.weekPattern !== filters.weekPattern
    ) {
      return false;
    }

    if (
      filters.serviceDay &&
      filters.serviceDay !== "all" &&
      row.serviceDay !== filters.serviceDay
    ) {
      return false;
    }

    const minTotal = filters.minTotalBins ? Number(filters.minTotalBins) : null;
    const maxTotal = filters.maxTotalBins ? Number(filters.maxTotalBins) : null;
    if (minTotal !== null && Number.isFinite(minTotal) && row.totalBins < minTotal) {
      return false;
    }
    if (maxTotal !== null && Number.isFinite(maxTotal) && row.totalBins > maxTotal) {
      return false;
    }

    const lastIso = row.lastServiceDate
      ? new Date(`${row.lastServiceDate}T00:00:00.000Z`).getTime()
      : null;
    if (filters.lastServicedFrom) {
      const from = new Date(`${filters.lastServicedFrom}T00:00:00.000Z`).getTime();
      if (lastIso === null || lastIso < from) return false;
    }
    if (filters.lastServicedTo) {
      const to = new Date(`${filters.lastServicedTo}T00:00:00.000Z`).getTime();
      if (lastIso === null || lastIso > to) return false;
    }

    return true;
  });
}

export function uniqueAdminBinStatuses(rows: AdminBinLocationRow[]): string[] {
  const labels = new Set(rows.map((row) => row.statusLabel));
  labels.add("Removed");
  return Array.from(labels).sort((a, b) => a.localeCompare(b));
}
