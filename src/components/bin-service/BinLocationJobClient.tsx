"use client";

import { BinLocationWorkflow } from "@/components/bin-service/BinLocationWorkflow";
import { getBinLocationById } from "@/lib/bin-locations-storage";
import Link from "next/link";

type BinLocationJobClientProps = {
  locationId: string;
};

export function BinLocationJobClient({ locationId }: BinLocationJobClientProps) {
  const location = getBinLocationById(locationId);

  if (!location) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <p className="text-[#ebfbff]/60">Bin location not found.</p>
        <Link
          href="/jobs/bin-management"
          className="mt-4 inline-block text-sm text-[#00c6ff] hover:text-[#6cc801]"
        >
          Back to Bin Management
        </Link>
      </div>
    );
  }

  const signatureRequired = location.notes.toLowerCase().includes("signature required");

  return (
    <>
      {location.notes ? (
        <div className="glass-card mb-4 rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#00c6ff]">
            Notes
          </p>
          <p className="mt-2 text-sm text-[#ebfbff]/75">{location.notes}</p>
        </div>
      ) : null}

      <div className="mx-auto max-w-xl">
        <BinLocationWorkflow
          locationId={location.id}
          siteName={location.location}
          expectedRegularBins={location.regularBins}
          expectedNewBins={location.newBins}
          signatureRequired={signatureRequired}
          initialStatus={location.workflowStatus}
        />
      </div>
    </>
  );
}
