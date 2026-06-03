import type { BinFieldSiteRow } from "@/lib/bin-service/field-types";

export function filterDueOverdueSites(rows: BinFieldSiteRow[]): BinFieldSiteRow[] {
  return rows.filter(
    (row) =>
      row.rotation.needsAttention ||
      row.rotation.color === "red" ||
      row.rotation.color === "yellow",
  );
}

export function filterAttentionSites(rows: BinFieldSiteRow[]): BinFieldSiteRow[] {
  return rows.filter((row) => row.rotation.needsAttention);
}
