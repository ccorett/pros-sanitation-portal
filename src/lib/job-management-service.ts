import type { ClientLocation } from "@prisma/client";
import { ClientLocationStatus } from "@prisma/client";
import { filterCleaningLocationsForContext } from "@/lib/job-assignment-service";
import type { EmployeeAccessContext } from "@/lib/operational-access";
import { prisma } from "@/lib/prisma";

export type ClientLocationDto = {
  id: string;
  slug: string;
  name: string;
  locationName: string;
  clientName: string;
  serviceType: string;
  area: string;
  address: string;
  assignedTechnician: string;
  serviceDay: string;
  status: "Active" | "Inactive";
  lastServiceDate: string;
  nextServiceDate: string;
  notes: string | null;
};

export type UpdateClientLocationInput = {
  locationName?: string;
  clientName?: string;
  serviceType?: string;
  area?: string;
  address?: string;
  assignedTechnician?: string;
  serviceDay?: string;
  status?: ClientLocationStatus;
  lastServiceDate?: string | null;
  nextServiceDate?: string | null;
  notes?: string | null;
};

function toDateOnlyIso(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

function serializeClientLocation(row: ClientLocation): ClientLocationDto {
  return {
    id: row.id,
    slug: row.slug,
    name: row.locationName,
    locationName: row.locationName,
    clientName: row.clientName,
    serviceType: row.serviceType ?? "",
    area: row.area,
    address: row.address,
    assignedTechnician: row.assignedTechnician,
    serviceDay: row.serviceDay,
    status: row.status === ClientLocationStatus.ACTIVE ? "Active" : "Inactive",
    lastServiceDate: toDateOnlyIso(row.lastServiceDate),
    nextServiceDate: toDateOnlyIso(row.nextServiceDate),
    notes: row.notes,
  };
}

const cleaningLocationWhere = {
  serviceType: { not: null },
} as const;

export async function listCleaningClientLocations(): Promise<ClientLocationDto[]> {
  const rows = await prisma.clientLocation.findMany({
    where: cleaningLocationWhere,
    orderBy: { locationName: "asc" },
  });

  return rows.map(serializeClientLocation);
}

export async function listCleaningClientLocationsForContext(
  ctx: EmployeeAccessContext,
): Promise<ClientLocationDto[]> {
  const locations = await listCleaningClientLocations();
  return filterCleaningLocationsForContext(ctx, locations);
}

export async function getCleaningClientLocationById(
  id: string,
): Promise<ClientLocationDto | null> {
  const row = await prisma.clientLocation.findFirst({
    where: { id, ...cleaningLocationWhere },
  });

  return row ? serializeClientLocation(row) : null;
}

export async function getCleaningClientLocationBySlug(
  slug: string,
): Promise<ClientLocationDto | null> {
  const row = await prisma.clientLocation.findFirst({
    where: { slug, ...cleaningLocationWhere },
  });

  return row ? serializeClientLocation(row) : null;
}

export async function updateCleaningClientLocation(
  id: string,
  input: UpdateClientLocationInput,
): Promise<ClientLocationDto> {
  const existing = await prisma.clientLocation.findFirst({
    where: { id, ...cleaningLocationWhere },
  });

  if (!existing) {
    throw new Error("Cleaning location not found.");
  }

  const updated = await prisma.clientLocation.update({
    where: { id },
    data: {
      locationName: input.locationName?.trim() || undefined,
      clientName: input.clientName?.trim() || undefined,
      serviceType: input.serviceType?.trim() || undefined,
      area: input.area?.trim(),
      address: input.address?.trim() || undefined,
      assignedTechnician: input.assignedTechnician?.trim(),
      serviceDay: input.serviceDay?.trim(),
      status: input.status,
      lastServiceDate:
        input.lastServiceDate === null
          ? null
          : input.lastServiceDate
            ? new Date(input.lastServiceDate)
            : undefined,
      nextServiceDate:
        input.nextServiceDate === null
          ? null
          : input.nextServiceDate
            ? new Date(input.nextServiceDate)
            : undefined,
      notes: input.notes === null ? null : input.notes?.trim(),
    },
  });

  return serializeClientLocation(updated);
}

