import { requireBinApiAccess } from "@/lib/bin-service/api-auth";
import {
  enrichSiteWithStatus,
  getBinServiceSite,
  upsertBinServiceSetup,
} from "@/lib/bin-service/service";
import type { BinWeekPattern, ServiceDayOfWeek } from "@prisma/client";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ siteId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const access = await requireBinApiAccess();
  if ("error" in access) return access.error;

  const { siteId } = await context.params;
  const site = await getBinServiceSite(siteId);

  if (!site) {
    return NextResponse.json({ error: "Site not found." }, { status: 404 });
  }

  const enriched = enrichSiteWithStatus(site);
  return NextResponse.json({
    site: {
      ...enriched.site,
      rotation: enriched.rotation,
      openJob: enriched.openJob,
    },
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const access = await requireBinApiAccess();
  if ("error" in access) return access.error;

  const { siteId } = await context.params;
  const site = await getBinServiceSite(siteId);

  if (!site) {
    return NextResponse.json({ error: "Site not found." }, { status: 404 });
  }

  const body = (await request.json()) as {
    expectedRegularBins?: number;
    expectedNewBins?: number;
    weekPattern?: BinWeekPattern;
    serviceDay?: ServiceDayOfWeek;
    assignedTechnicianId?: string | null;
    accessInstructions?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
    signatureRequired?: boolean;
    active?: boolean;
  };

  if (
    body.weekPattern &&
    body.weekPattern !== "WEEK_1_3" &&
    body.weekPattern !== "WEEK_2_4"
  ) {
    return NextResponse.json({ error: "Invalid week pattern." }, { status: 400 });
  }

  const setup = await upsertBinServiceSetup(siteId, {
    expectedRegularBins: Math.max(0, Number(body.expectedRegularBins ?? 0)),
    expectedNewBins: Math.max(0, Number(body.expectedNewBins ?? 0)),
    weekPattern: body.weekPattern ?? site.setup?.weekPattern ?? "WEEK_1_3",
    serviceDay: body.serviceDay ?? site.setup?.serviceDay ?? "TUESDAY",
    assignedTechnicianId: site.setup?.assignedTechnicianId ?? null,
    accessInstructions: body.accessInstructions ?? null,
    contactName: body.contactName ?? null,
    contactPhone: body.contactPhone ?? null,
    signatureRequired: Boolean(body.signatureRequired),
    active: body.active ?? true,
  });

  const refreshed = await getBinServiceSite(siteId);
  const enriched = enrichSiteWithStatus(refreshed!);

  return NextResponse.json({
    setup,
    site: {
      ...enriched.site,
      rotation: enriched.rotation,
      openJob: enriched.openJob,
    },
  });
}
