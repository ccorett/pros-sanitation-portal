import { createInvoiceClient } from "@/lib/invoice-service";
import { InvoiceBillingCycle, InvoiceServiceType } from "@prisma/client";
import { requireInvoiceClientAdminApiActor } from "@/lib/require-invoice-api";
import { NextResponse } from "next/server";

const VALID_CYCLES = new Set<string>(Object.values(InvoiceBillingCycle));
const VALID_SERVICE_TYPES = new Set<string>(Object.values(InvoiceServiceType));

export async function GET() {
  const { listInvoiceClients } = await import("@/lib/invoice-service");
  const access = await requireInvoiceClientAdminApiActor();
  if ("error" in access) {
    return access.error;
  }

  const clients = await listInvoiceClients();
  return NextResponse.json({ clients });
}

export async function POST(request: Request) {
  const access = await requireInvoiceClientAdminApiActor();
  if ("error" in access) {
    return access.error;
  }

  const body = (await request.json()) as {
    clientName?: string;
    serviceType?: string;
    billingCycle?: string;
    invoiceCountPerCycle?: number;
    usualDueDay?: number;
    remarks?: string | null;
  };

  if (!body.clientName?.trim()) {
    return NextResponse.json({ error: "Client name is required." }, { status: 400 });
  }

  if (!body.serviceType || !VALID_SERVICE_TYPES.has(body.serviceType)) {
    return NextResponse.json({ error: "Invalid service type." }, { status: 400 });
  }

  if (!body.billingCycle || !VALID_CYCLES.has(body.billingCycle)) {
    return NextResponse.json({ error: "Invalid billing cycle." }, { status: 400 });
  }

  try {
    const clients = await createInvoiceClient({
      clientName: body.clientName,
      serviceType: body.serviceType as InvoiceServiceType,
      billingCycle: body.billingCycle as InvoiceBillingCycle,
      invoiceCountPerCycle: Number(body.invoiceCountPerCycle ?? 1),
      usualDueDay: body.usualDueDay,
      remarks: body.remarks,
    });
    return NextResponse.json({ clients });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create invoice client.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
