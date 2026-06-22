import { getEmployeePortalAccess } from "@/lib/employee-portal-access";
import {
  buildInvoiceAccessContext,
  canAccessInvoiceManagement,
  canManageInvoiceAlertRecipients,
  canManageInvoiceClients,
  canProcessInvoiceSchedules,
  canSendInvoiceStatusEmail,
  resolveEmployeeResponsibilitiesForActor,
} from "@/lib/invoice-access";
import {
  resolveAuthenticatedSession,
  sessionExpiredApiResponse,
  unauthorizedApiResponse,
} from "@/lib/require-authenticated-session";
import { NextResponse } from "next/server";

export async function requireInvoiceApiActor() {
  const authResult = await resolveAuthenticatedSession();

  if (authResult.status === "unauthenticated") {
    return { error: unauthorizedApiResponse() } as const;
  }

  if (authResult.status === "expired") {
    return { error: sessionExpiredApiResponse() } as const;
  }

  const { session } = authResult;
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

export async function requireInvoiceStatusEmailApiActor() {
  const result = await requireInvoiceApiActor();
  if ("error" in result) {
    return result;
  }

  if (!canSendInvoiceStatusEmail(result.accessContext)) {
    return {
      error: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    } as const;
  }

  return result;
}

export { verifyAdminApiSecret as verifyInvoiceCronSecret } from "@/lib/admin-api-secret";
