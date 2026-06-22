import { requireBinFieldApiAccess } from "@/lib/bin-service/api-auth";
import {
  listBinFieldSitesForActor,
  toAttentionItems,
} from "@/lib/bin-service/field-service";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const access = await requireBinFieldApiAccess(request);
  if ("error" in access) return access.error;

  const sites = await listBinFieldSitesForActor(access.employee);
  const items = toAttentionItems(sites);

  return NextResponse.json({ items });
}
