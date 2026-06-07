import type { Employee } from "@prisma/client";
import { DeliveryRequestStatus } from "@prisma/client";
import {
  canAccessDelivery,
  isDeliveryCoordinator,
  isDeliveryDriver,
} from "@/lib/delivery-access";
import { isManagerOrAbove } from "@/lib/operational-access";
import { prisma } from "@/lib/prisma";
import { toEmployeeAccessContext } from "@/lib/portal-route-access";

const OPEN_DELIVERY_STATUSES: DeliveryRequestStatus[] = [
  DeliveryRequestStatus.PENDING,
  DeliveryRequestStatus.ASSIGNED,
  DeliveryRequestStatus.IN_TRANSIT,
];

export type DashboardDeliveryActivityKey =
  | "assignedDeliveryRequests"
  | "openDeliveryRequests"
  | "deliveriesAwaitingAssignment"
  | "deliveriesInProgress"
  | "completedDeliveriesToday";

export type DashboardDeliveryActivityItem = {
  key: DashboardDeliveryActivityKey;
  label: string;
  count: number;
};

function startOfTodayUtc(): Date {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
}

async function countOpenDeliveryRequests(): Promise<number> {
  return prisma.deliveryRequest.count({
    where: { status: { in: OPEN_DELIVERY_STATUSES } },
  });
}

async function countDeliveriesAwaitingAssignment(): Promise<number> {
  return prisma.deliveryRequest.count({
    where: { status: DeliveryRequestStatus.PENDING },
  });
}

async function countDeliveriesInProgress(): Promise<number> {
  return prisma.deliveryRequest.count({
    where: { status: DeliveryRequestStatus.IN_TRANSIT },
  });
}

async function countCompletedDeliveriesToday(): Promise<number> {
  return prisma.deliveryRequest.count({
    where: {
      status: DeliveryRequestStatus.FULFILLED,
      updatedAt: { gte: startOfTodayUtc() },
    },
  });
}

async function countAssignedDeliveryRequestsForDriver(
  driverId: string,
): Promise<number> {
  return prisma.deliveryRequest.count({
    where: {
      assignedDriverId: driverId,
      status: DeliveryRequestStatus.ASSIGNED,
    },
  });
}

async function countDeliveriesInProgressForDriver(
  driverId: string,
): Promise<number> {
  return prisma.deliveryRequest.count({
    where: {
      assignedDriverId: driverId,
      status: DeliveryRequestStatus.IN_TRANSIT,
    },
  });
}

export async function getDashboardDeliveryActivity(
  employee: Employee,
): Promise<DashboardDeliveryActivityItem[] | null> {
  const accessContext = await toEmployeeAccessContext(employee);

  if (!canAccessDelivery(accessContext)) {
    return null;
  }

  if (isManagerOrAbove(employee.accessLevel)) {
    const [openDeliveryRequests, deliveriesInProgress, completedDeliveriesToday] =
      await Promise.all([
        countOpenDeliveryRequests(),
        countDeliveriesInProgress(),
        countCompletedDeliveriesToday(),
      ]);

    return [
      { key: "openDeliveryRequests", label: "Delivery Requests", count: openDeliveryRequests },
      { key: "deliveriesInProgress", label: "Active Deliveries", count: deliveriesInProgress },
      {
        key: "completedDeliveriesToday",
        label: "Deliveries Completed Today",
        count: completedDeliveriesToday,
      },
    ];
  }

  if (isDeliveryCoordinator(accessContext)) {
    const [
      openDeliveryRequests,
      deliveriesAwaitingAssignment,
      deliveriesInProgress,
    ] = await Promise.all([
      countOpenDeliveryRequests(),
      countDeliveriesAwaitingAssignment(),
      countDeliveriesInProgress(),
    ]);

    return [
      { key: "openDeliveryRequests", label: "Delivery Requests", count: openDeliveryRequests },
      {
        key: "deliveriesAwaitingAssignment",
        label: "Deliveries Awaiting Assignment",
        count: deliveriesAwaitingAssignment,
      },
      { key: "deliveriesInProgress", label: "Active Deliveries", count: deliveriesInProgress },
    ];
  }

  if (isDeliveryDriver(accessContext)) {
    const [assignedDeliveryRequests, deliveriesInProgress] = await Promise.all([
      countAssignedDeliveryRequestsForDriver(employee.id),
      countDeliveriesInProgressForDriver(employee.id),
    ]);

    return [
      {
        key: "assignedDeliveryRequests",
        label: "Assigned Deliveries",
        count: assignedDeliveryRequests,
      },
      { key: "deliveriesInProgress", label: "Active Deliveries", count: deliveriesInProgress },
    ];
  }

  return null;
}
