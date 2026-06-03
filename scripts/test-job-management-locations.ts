/**
 * Verifies cleaning client locations load from Neon and PATCH persists.
 * Run: npx tsx scripts/test-job-management-locations.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  getCleaningClientLocationBySlug,
  listCleaningClientLocations,
  updateCleaningClientLocation,
} from "../src/lib/job-management-service";

const prisma = new PrismaClient();

const EXPECTED_SLUGS = [
  "scarborough-pennysaver-grocery",
  "canaan-pennysaver-grocery",
  "carnbee-pennysaver-grocery",
  "carnbee-pennysaver-pharmacy",
  "pennysavers-mall",
];

async function main() {
  const locations = await listCleaningClientLocations();

  if (locations.length !== 5) {
    throw new Error(`Expected 5 cleaning locations, got ${locations.length}`);
  }

  for (const slug of EXPECTED_SLUGS) {
    const found = locations.some((location) => location.slug === slug);
    if (!found) {
      throw new Error(`Missing seeded location slug: ${slug}`);
    }
  }

  const target = await getCleaningClientLocationBySlug(
    "scarborough-pennysaver-grocery",
  );
  if (!target) {
    throw new Error("Scarborough location not found.");
  }

  const testNotes = `Test note ${Date.now()}`;
  const updated = await updateCleaningClientLocation(target.id, {
    notes: testNotes,
  });

  if (updated.notes !== testNotes) {
    throw new Error("PATCH did not persist notes.");
  }

  const reloaded = await getCleaningClientLocationBySlug(
    "scarborough-pennysaver-grocery",
  );
  if (reloaded?.notes !== testNotes) {
    throw new Error("Reloaded location notes do not match PATCH.");
  }

  await updateCleaningClientLocation(target.id, { notes: null });

  console.log("Job management locations test OK:", {
    count: locations.length,
    slugs: locations.map((location) => location.slug),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
