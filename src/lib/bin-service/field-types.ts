import type { BinServiceJobStatus } from "@prisma/client";
import type { RotationStatusResult } from "@/lib/bin-service/status";

export type BinFieldServiceStatus =
  | "completed"
  | "cannot_access"
  | "issue_reported";

export type BinFieldSiteRow = {
  siteId: string;
  jobId: string | null;
  location: string;
  clientName: string;
  newBins: number;
  regularBins: number;
  lastServiceDate: string | null;
  nextServiceDate: string | null;
  active: boolean;
  signatureRequired: boolean;
  displayNotes: string;
  rotation: RotationStatusResult;
  openJobStatus: BinServiceJobStatus | null;
  serviceStatus: BinFieldServiceStatus | null;
  cannotAccessReason?: string;
  issueType?: string;
  issueNotes?: string;
  serviceNotes?: string;
  regularBinsServiced?: number;
  newBinsServiced?: number;
  linersUsed?: number;
  clientSignatureName?: string;
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
};

export type BinFieldAttentionItem = {
  id: string;
  siteId: string;
  jobId: string;
  locationName: string;
  serviceStatus: BinFieldServiceStatus;
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
  notes: string;
  issueOrAccessReason: string;
  lastServiceDate: string | null;
  nextServiceDate: string | null;
};

export type BinFieldJobDetail = {
  jobId: string;
  siteId: string;
  siteName: string;
  expectedRegularBins: number;
  expectedNewBins: number;
  signatureRequired: boolean;
  accessInstructions: string | null;
  status: BinServiceJobStatus;
  rotation: RotationStatusResult;
};
