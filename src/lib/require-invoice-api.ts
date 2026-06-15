import { auth } from "@/lib/auth";
import { getEmployeePortalAccess } from "@/lib/employee-portal-access";
import {
  buildInvoiceAccessContext,
  canAccessInvoiceManagement,
  canManageInvoiceAlertRecipients,
  canManageInvoiceClients,
  canProcessInvoiceSchedules,
  resolveEmployeeResponsibilitiesForActor,
} from "@/lib/invoice-access";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function requireInvoiceApiActor() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return {
      error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    } as const;
  }

  const access = await getEmployeePortalAccess(session.user.id);

  if (!access.allowed || access.pendingVerification) {
    return {
      error: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    } as const;
  }

  const responsibilities = await resolveEmployeeResponsibilitiesForActor(
    access.employee,
  );
  const accessContext = buildInvoiceAccessContext(access.employee, responsibilities);

  if (!canAccessInvoiceManagement(accessContext)) {
    return {
      error: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    } as const;
  }

  return { actor: access.employee, accessContext, session } as const;
}

export async function requireInvoiceClientAdminApiActor() {
  const result = await requireInvoiceApiActor();
  if ("error" in result) {
    return result;
  }

  if (!canManageInvoiceClients(result.accessContext)) {
    return {
      error: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    } as const;
  }

  return result;
}

export async function requireInvoiceRecipientAdminApiActor() {
  const result = await requireInvoiceApiActor();
  if ("error" in result) {
    return result;
  }

  if (!canManageInvoiceAlertRecipients(result.accessContext)) {
    return {
      error: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    } as const;
  }

  return result;
}

export async function requireInvoiceProcessApiActor() {
  const result = await requireInvoiceApiActor();
  if ("error" in result) {
    return result;
  }

  if (!canProcessInvoiceSchedules(result.accessContext)) {
    return {
      error: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    } as const;
  }

  return result;
}

export function verifyInvoiceCronSecret(request: Request): boolean {
  const configured = process.env.ADMIN_API_SECRET?.trim();
  if (!configured) {
    return process.env.NODE_ENV === "development";
  }

  const headerSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const querySecret = new URL(request.url).searchParams.get("secret");
  return headerSecret === configured || querySecret === configured;
}
