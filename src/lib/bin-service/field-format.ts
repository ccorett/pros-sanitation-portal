import { formatShortDate } from "@/lib/bin-service/schedule";

export function formatBinFieldDate(isoDate: string | null): string {
  if (!isoDate) return "—";
  return formatShortDate(new Date(`${isoDate}T12:00:00.000Z`));
}
