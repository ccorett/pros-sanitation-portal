import { requireBinApiAccess } from "@/lib/bin-service/api-auth";
import {
  createBinServiceSite,
  enrichSiteWithStatus,
  listBinServiceSites,
} from "@/lib/bin-service/service";
import { NextResponse } from "next/server";

export async function GET() {
  const access = await requireBinApiAccess();
  if ("error" in access) return access.error;

  const sites = await listBinServiceSites();
  return NextResponse.json({
    sites: sites.map((site) => {
      const enriched = enrichSiteWithStatus(site);
      return {
        ...enriched.site,
        rotation: enriched.rotation,
        openJob: enriched.openJob,
      };
    }),
  });
}

export async function POST(request: Request) {
  const access = await requireBinApiAccess();
  if ("error" in access) return access.error;

  const body = (await request.json()) as {
    clientName?: string;
    name?: string;
    area?: string;
    address?: string;
  };

  if (!body.clientName?.trim() || !body.name?.trim() || !body.address?.trim()) {
    return NextResponse.json(
      { error: "Client name, site name, and address are required." },
      { status: 400 },
    );
  }

  const site = await createBinServiceSite({
    clientName: body.clientName.trim(),
    name: body.name.trim(),
    area: body.area?.trim(),
    address: body.address.trim(),
  });

  const enriched = enrichSiteWithStatus(site);
  return NextResponse.json({
    site: {
      ...enriched.site,
      rotation: enriched.rotation,
      openJob: enriched.openJob,
    },
  });
}
