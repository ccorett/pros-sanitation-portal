import {
  softRemoveInvoiceClient,
  updateInvoiceClient,
} from "@/lib/invoice-service";
import { InvoiceBillingCycle, InvoiceClientStatus, InvoiceServiceType } from "@prisma/client";
import { requireInvoiceClientAdminApiActor } from "@/lib/require-invoice-api";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const VALID_CYCLES = new Set<string>(Object.values(InvoiceBillingCycle));
const VALID_STATUSES = new Set<string>(Object.values(InvoiceClientStatus));
const VALID_SERVICE_TYPES = new Set<string>(Object.values(InvoiceServiceType));

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireInvoiceClientAdminApiActor();
  if ("error" in access) {
    return access.error;
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    clientName?: string;
    serviceType?: string;
    billingCycle?: string;
    invoiceCountPerCycle?: number;
    usualDueDay?: number;
    status?: string;
    remarks?: string | null;
  };

  if (body.serviceType && !VALID_SERVICE_TYPES.has(body.serviceType)) {
    return NextResponse.json({ error: "Invalid service type." }, { status: 400 });
  }

  if (body.billingCycle && !VALID_CYCLES.has(body.billingCycle)) {
    return NextResponse.json({ error: "Invalid billing cycle." }, { status: 400 });
  }

  if (body.status && !VALID_STATUSES.has(body.status)) {
    return NextResponse.json({ error: "Invalid client status." }, { status: 400 });
  }

  try {
    const clients = await updateInvoiceClient(id, {
      clientName: body.clientName,
      serviceType: body.serviceType as InvoiceServiceType | undefined,
      billingCycle: body.billingCycle as InvoiceBillingCycle | undefined,
      invoiceCountPerCycle: body.invoiceCountPerCycle,
      usualDueDay: body.usualDueDay,
      status: body.status as InvoiceClientStatus | undefined,
      remarks: body.remarks,
    });
    return NextResponse.json({ clients });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update invoice client.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const access = await requireInvoiceClientAdminApiActor();
  if ("error" in access) {
    return access.error;
  }

  const { id } = await context.params;

  try {
    const clients = await softRemoveInvoiceClient(id);
    return NextResponse.json({ clients });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to remove invoice client.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
