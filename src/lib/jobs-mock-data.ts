export type JobServiceType = "Grocery Cleaning" | "Pharmacy Cleaning" | "Janitorial Service";

export type ClientLocation = {
  slug: string;
  name: string;
  serviceType: JobServiceType;
  status: "Active";
  area: string;
  assignedTechnician: string;
  serviceDay: string;
  lastServiceDate: string;
  nextServiceDate: string;
};

export const clientLocations: ClientLocation[] = [
  {
    slug: "scarborough-pennysaver-grocery",
    name: "Scarborough Pennysaver Grocery",
    serviceType: "Grocery Cleaning",
    status: "Active",
    area: "Scarborough",
    assignedTechnician: "Jordan Mitchell",
    serviceDay: "Tuesday",
    lastServiceDate: "2026-05-13",
    nextServiceDate: "2026-05-27",
  },
  {
    slug: "canaan-pennysaver-grocery",
    name: "Canaan Pennysaver Grocery",
    serviceType: "Grocery Cleaning",
    status: "Active",
    area: "Canaan",
    assignedTechnician: "Jordan Mitchell",
    serviceDay: "Wednesday",
    lastServiceDate: "2026-05-14",
    nextServiceDate: "2026-05-28",
  },
  {
    slug: "carnbee-pennysaver-grocery",
    name: "Carnbee Pennysaver Grocery",
    serviceType: "Grocery Cleaning",
    status: "Active",
    area: "Carnbee",
    assignedTechnician: "Alex Rivera",
    serviceDay: "Thursday",
    lastServiceDate: "2026-05-15",
    nextServiceDate: "2026-05-29",
  },
  {
    slug: "pennysavers-mall",
    name: "Pennysavers Mall",
    serviceType: "Janitorial Service",
    status: "Active",
    area: "Scarborough",
    assignedTechnician: "Alex Rivera",
    serviceDay: "Friday",
    lastServiceDate: "2026-05-16",
    nextServiceDate: "2026-05-30",
  },
  {
    slug: "carnbee-pennysaver-pharmacy",
    name: "Carnbee Pennysaver Pharmacy",
    serviceType: "Pharmacy Cleaning",
    status: "Active",
    area: "Carnbee",
    assignedTechnician: "Jordan Mitchell",
    serviceDay: "Monday",
    lastServiceDate: "2026-05-12",
    nextServiceDate: "2026-05-26",
  },
];

export function getClientLocationBySlug(
  slug: string,
): ClientLocation | undefined {
  return clientLocations.find((location) => location.slug === slug);
}

export function formatLocationDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00.000Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function serviceTypeBadgeClass(serviceType: JobServiceType): string {
  if (serviceType === "Pharmacy Cleaning") {
    return "border-[#00c6ff]/35 bg-[#00c6ff]/15 text-[#00c6ff]";
  }
  return "border-[#259f00]/35 bg-[#259f00]/15 text-[#6cc801]";
}
