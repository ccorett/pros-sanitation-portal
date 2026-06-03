export type CleaningServiceType =
  | "Grocery Cleaning"
  | "Pharmacy Cleaning"
  | "Janitorial Service";

export function formatLocationDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00.000Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function serviceTypeBadgeClass(serviceType: CleaningServiceType | string): string {
  if (serviceType === "Pharmacy Cleaning") {
    return "border-[#00c6ff]/35 bg-[#00c6ff]/15 text-[#00c6ff]";
  }
  return "border-[#259f00]/35 bg-[#259f00]/15 text-[#6cc801]";
}
