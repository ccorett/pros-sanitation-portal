"use client";

import { BinJobWorkflow } from "@/components/bin-service/BinJobWorkflow";
import { fetchBinFieldJob } from "@/lib/bin-service/field-client";
import Link from "next/link";
import { useEffect, useState } from "react";

type BinLocationJobClientProps = {
  jobId: string;
};

export function BinLocationJobClient({ jobId }: BinLocationJobClientProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<Awaited<ReturnType<typeof fetchBinFieldJob>> | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const detail = await fetchBinFieldJob(jobId);
        if (!cancelled) setJob(detail);
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error ? cause.message : "Unable to load bin job.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
        Loading job…
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <p className="text-[#ebfbff]/60">{error ?? "Bin job not found."}</p>
        <Link
          href="/jobs/bin-management"
          className="mt-4 inline-block text-sm text-[#00c6ff] hover:text-[#6cc801]"
        >
          Back to Bin Management
        </Link>
      </div>
    );
  }

  return (
    <>
      {job.accessInstructions ? (
        <div className="glass-card mb-4 rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#00c6ff]">
            Notes
          </p>
          <p className="mt-2 text-sm text-[#ebfbff]/75">{job.accessInstructions}</p>
        </div>
      ) : null}

      <div className="mx-auto max-w-xl">
        <BinJobWorkflow
          jobId={job.jobId}
          siteName={job.siteName}
          expectedRegularBins={job.expectedRegularBins}
          expectedNewBins={job.expectedNewBins}
          signatureRequired={job.signatureRequired}
          initialStatus={job.status}
        />
      </div>
    </>
  );
}
