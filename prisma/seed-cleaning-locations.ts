import {
  ClientLocationStatus,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";

type CleaningLocationSeed = {
  id: string;
  slug: string;
  locationName: string;
  clientName: string;
  serviceType: string;
  area: string;
  address: string;
  assignedTechnician: string;
  serviceDay: string;
  lastServiceDate: string;
  nextServiceDate: string;
  notes?: string;
};

const PENNYSAVER_CLEANING_LOCATIONS: CleaningLocationSeed[] = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    slug: "scarborough-pennysaver-grocery",
    locationName: "Scarborough Pennysaver Grocery",
    clientName: "Pennysaver",
    serviceType: "Grocery Cleaning",
    area: "Scarborough",
    address: "Scarborough, Trinidad and Tobago",
    assignedTechnician: "Jordan Mitchell",
    serviceDay: "Tuesday",
    lastServiceDate: "2026-05-13",
    nextServiceDate: "2026-05-27",
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    slug: "canaan-pennysaver-grocery",
    locationName: "Canaan Pennysaver Grocery",
    clientName: "Pennysaver",
    serviceType: "Grocery Cleaning",
    area: "Canaan",
    address: "Canaan, Trinidad and Tobago",
    assignedTechnician: "Jordan Mitchell",
    serviceDay: "Wednesday",
    lastServiceDate: "2026-05-14",
    nextServiceDate: "2026-05-28",
  },
  {
    id: "00000000-0000-4000-8000-000000000103",
    slug: "carnbee-pennysaver-grocery",
    locationName: "Carnbee Pennysaver Grocery",
    clientName: "Pennysaver",
    serviceType: "Grocery Cleaning",
    area: "Carnbee",
    address: "Carnbee, Trinidad and Tobago",
    assignedTechnician: "Alex Rivera",
    serviceDay: "Thursday",
    lastServiceDate: "2026-05-15",
    nextServiceDate: "2026-05-29",
  },
  {
    id: "00000000-0000-4000-8000-000000000104",
    slug: "carnbee-pennysaver-pharmacy",
    locationName: "Carnbee Pennysaver Pharmacy",
    clientName: "Pennysaver",
    serviceType: "Pharmacy Cleaning",
    area: "Carnbee",
    address: "Carnbee, Trinidad and Tobago",
    assignedTechnician: "Jordan Mitchell",
    serviceDay: "Monday",
    lastServiceDate: "2026-05-12",
    nextServiceDate: "2026-05-26",
  },
  {
    id: "00000000-0000-4000-8000-000000000105",
    slug: "pennysavers-mall",
    locationName: "Pennysavers Mall",
    clientName: "Pennysaver",
    serviceType: "Janitorial Service",
    area: "Scarborough",
    address: "Scarborough, Trinidad and Tobago",
    assignedTechnician: "Alex Rivera",
    serviceDay: "Friday",
    lastServiceDate: "2026-05-16",
    nextServiceDate: "2026-05-30",
  },
];

export async function seedCleaningClientLocations(
  prisma: PrismaClient,
): Promise<void> {
  for (const location of PENNYSAVER_CLEANING_LOCATIONS) {
    const data: Prisma.ClientLocationCreateInput = {
      id: location.id,
      slug: location.slug,
      locationName: location.locationName,
      clientName: location.clientName,
      serviceType: location.serviceType,
      area: location.area,
      address: location.address,
      assignedTechnician: location.assignedTechnician,
      serviceDay: location.serviceDay,
      status: ClientLocationStatus.ACTIVE,
      lastServiceDate: new Date(location.lastServiceDate),
      nextServiceDate: new Date(location.nextServiceDate),
      notes: location.notes ?? null,
    };

    await prisma.clientLocation.upsert({
      where: { slug: location.slug },
      update: {
        locationName: data.locationName,
        clientName: data.clientName,
        serviceType: data.serviceType,
        area: data.area,
        address: data.address,
        assignedTechnician: data.assignedTechnician,
        serviceDay: data.serviceDay,
        status: data.status,
        lastServiceDate: data.lastServiceDate,
        nextServiceDate: data.nextServiceDate,
        notes: data.notes,
      },
      create: data,
    });
  }
}
