export type JobServiceType = "Grocery Cleaning" | "Pharmacy Cleaning" | "Janitorial Service";

export type ClientLocation = {
  slug: string;
  name: string;
  serviceType: JobServiceType;
  status: "Active";
};

export const clientLocations: ClientLocation[] = [
  {
    slug: "scarborough-pennysaver-grocery",
    name: "Scarborough Pennysaver Grocery",
    serviceType: "Grocery Cleaning",
    status: "Active",
  },
  {
    slug: "canaan-pennysaver-grocery",
    name: "Canaan Pennysaver Grocery",
    serviceType: "Grocery Cleaning",
    status: "Active",
  },
  {
    slug: "carnbee-pennysaver-grocery",
    name: "Carnbee Pennysaver Grocery",
    serviceType: "Grocery Cleaning",
    status: "Active",
  },
  {
    slug: "pennysavers-mall",
    name: "Pennysavers Mall",
    serviceType: "Janitorial Service",
    status: "Active",
  },
  {
    slug: "carnbee-pennysaver-pharmacy",
    name: "Carnbee Pennysaver Pharmacy",
    serviceType: "Pharmacy Cleaning",
    status: "Active",
  },
];

export function getClientLocationBySlug(
  slug: string,
): ClientLocation | undefined {
  return clientLocations.find((location) => location.slug === slug);
}
