import type { Employee } from "@prisma/client";
import { EmployeeResponsibility } from "@prisma/client";
import {
  canAccessDelivery,
  hasResponsibility,
  isManagerOrAbove,
  type EmployeeAccessContext,
} from "@/lib/operational-access";
import { toEmployeeAccessContext } from "@/lib/portal-route-access";

export { canAccessDelivery };

export function isDeliveryCoordinator(ctx: EmployeeAccessContext): boolean {
  return hasResponsibility(ctx, EmployeeResponsibility.DELIVERY_COORDINATOR);
}

export function isDeliveryDriver(ctx: EmployeeAccessContext): boolean {
  return hasResponsibility(ctx, EmployeeResponsibility.DRIVER);
}

export async function resolveDeliveryActorContext(actor: Employee) {
  const accessContext = await toEmployeeAccessContext(actor);

  return {
    accessContext,
    canAccess: canAccessDelivery(accessContext),
    isManager: isManagerOrAbove(actor.accessLevel),
    isCoordinator: isDeliveryCoordinator(accessContext),
    isDriver: isDeliveryDriver(accessContext),
  };
}
