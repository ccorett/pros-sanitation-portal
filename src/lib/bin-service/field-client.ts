import type {
  BinFieldAttentionItem,
  BinFieldJobDetail,
  BinFieldSiteRow,
} from "@/lib/bin-service/field-types";
import type { RotationStatusResult } from "@/lib/bin-service/status";

export type BinFieldTodayJob = {
  id: string;
  siteId: string;
  status: string;
  siteName: string;
  lastServiceDate: string | null;
  nextServiceDate: string | null;
  displayNotes: string;
  rotation: RotationStatusResult;
  setup: {
    expectedRegularBins: number;
    expectedNewBins: number;
  };
  site: {
    name: string;
    area: string | null;
  };
};

export async function fetchBinFieldSites(): Promise<BinFieldSiteRow[]> {
  const response = await fetch("/api/bin-service/field/sites", {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Unable to load bin locations.");
  }
  const data = (await response.json()) as { sites: BinFieldSiteRow[] };
  return data.sites;
}

export async function fetchBinFieldAttention(): Promise<BinFieldAttentionItem[]> {
  const response = await fetch("/api/bin-service/field/attention", {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Unable to load bin attention items.");
  }
  const data = (await response.json()) as { items: BinFieldAttentionItem[] };
  return data.items;
}

export async function fetchBinJobsToday(): Promise<BinFieldTodayJob[]> {
  const response = await fetch("/api/bin-service/jobs/today", {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Unable to load today's bin jobs.");
  }
  const data = (await response.json()) as { jobs: BinFieldTodayJob[] };
  return data.jobs;
}

export async function fetchBinFieldJob(
  jobId: string,
): Promise<BinFieldJobDetail> {
  const response = await fetch(`/api/bin-service/jobs/${jobId}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Unable to load bin job.");
  }
  const data = (await response.json()) as { job: BinFieldJobDetail };
  return data.job;
}
