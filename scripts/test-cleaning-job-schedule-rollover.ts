/**
 * Verifies recurring cleaning schedule rollover and Assigned By display.
 * Run: npx tsx scripts/test-cleaning-job-schedule-rollover.ts
 */
import { PrismaClient } from "@prisma/client";
import { formatCleaningJobAssignedBy } from "../src/lib/cleaning-jobs-display";
import {
  CLEANING_SCHEDULE_TIME_ZONE,
  resolveRecurringCleaningSchedule,
  setCleaningScheduleNowForTests,
} from "../src/lib/cleaning-jobs-schedule";
import { getCleaningJobById } from "../src/lib/cleaning-jobs-service";

const prisma = new PrismaClient();

const SCARBOROUGH_JOB_ID = "00000000-0000-4000-8000-000000000301";

function assertEqual(label: string, actual: string, expected: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

async function main() {
  const beforeTenPm = new Date("2026-06-12T01:30:00.000Z");
  const afterTenPm = new Date("2026-06-12T02:30:00.000Z");

  const beforeSchedule = resolveRecurringCleaningSchedule(
    beforeTenPm,
    CLEANING_SCHEDULE_TIME_ZONE,
  );
  assertEqual(
    "Before 10 PM scheduled date",
    beforeSchedule.scheduledDate,
    "2026-06-11",
  );
  assertEqual("Before 10 PM due date", beforeSchedule.dueDate, "2026-06-12");

  const afterSchedule = resolveRecurringCleaningSchedule(
    afterTenPm,
    CLEANING_SCHEDULE_TIME_ZONE,
  );
  assertEqual(
    "After 10 PM scheduled date",
    afterSchedule.scheduledDate,
    "2026-06-12",
  );
  assertEqual("After 10 PM due date", afterSchedule.dueDate, "2026-06-13");

  assertEqual(
    "Assigned By display",
    formatCleaningJobAssignedBy("Super Admin"),
    "Admin",
  );
  assertEqual(
    "Assigned By display unchanged for others",
    formatCleaningJobAssignedBy("Portal Admin"),
    "Portal Admin",
  );

  await prisma.job.update({
    where: { id: SCARBOROUGH_JOB_ID },
    data: { assignedBy: "Super Admin" },
  });

  try {
    setCleaningScheduleNowForTests(beforeTenPm);
    const jobBefore = await getCleaningJobById(SCARBOROUGH_JOB_ID);
    if (!jobBefore) {
      throw new Error("Scarborough grocery job not found.");
    }

    assertEqual(
      "Serialized job before 10 PM scheduled date",
      jobBefore.scheduledDate,
      "2026-06-11",
    );
    assertEqual(
      "Serialized job before 10 PM due date",
      jobBefore.dueDate,
      "2026-06-12",
    );
    assertEqual("Serialized job assigned by", jobBefore.assignedBy, "Admin");

    setCleaningScheduleNowForTests(afterTenPm);
    const jobAfter = await getCleaningJobById(SCARBOROUGH_JOB_ID);
    if (!jobAfter) {
      throw new Error("Scarborough grocery job not found after rollover.");
    }

    assertEqual(
      "Serialized job after 10 PM scheduled date",
      jobAfter.scheduledDate,
      "2026-06-12",
    );
    assertEqual(
      "Serialized job after 10 PM due date",
      jobAfter.dueDate,
      "2026-06-13",
    );
  } finally {
    setCleaningScheduleNowForTests(undefined);
    await prisma.job.update({
      where: { id: SCARBOROUGH_JOB_ID },
      data: { assignedBy: "System Seed" },
    });
  }

  console.log("Cleaning job schedule rollover test OK:", {
    beforeTenPm: beforeSchedule,
    afterTenPm: afterSchedule,
    assignedByDisplay: "Admin",
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
