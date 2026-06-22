import { sendManualInvoiceStatusUpdate } from "@/lib/invoice-service";
import { requireInvoiceStatusEmailApiActor } from "@/lib/require-invoice-api";
import { NextResponse } from "next/server";

export async function POST() {
  const access = await requireInvoiceStatusEmailApiActor();
  if ("error" in access) {
    return access.error;
  }

  const sentBy = `${access.actor.firstName} ${access.actor.lastName}`.trim();
  const result = await sendManualInvoiceStatusUpdate({ sentBy });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error ?? "Status email failed. Check email configuration.",
      },
      { status: result.error?.includes("recipients") ? 400 : 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    recipientCount: result.recipientCount,
    invoiceCount: result.invoiceCount,
  });
}
