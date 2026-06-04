"use client";

import type {
  HrOrganisationView,
  OrganisationEmployeeRow,
} from "@/lib/hr-organisation-service";
import { useCallback, useEffect, useState } from "react";

function EmployeeLine({ employee }: { employee: OrganisationEmployeeRow }) {
  return (
    <li className="rounded-xl border border-[#ebfbff]/10 bg-[#0c151d]/40 px-4 py-3">
      <p className="font-medium text-[#ebfbff]">{employee.name}</p>
      <p className="mt-1 text-xs text-[#ebfbff]/50">{employee.email}</p>
      <dl className="mt-2 grid gap-1 text-xs text-[#ebfbff]/65 sm:grid-cols-3">
        <div>
          <dt className="text-[#ebfbff]/40">Job title</dt>
          <dd>{employee.jobTitle}</dd>
        </div>
        <div>
          <dt className="text-[#ebfbff]/40">Department</dt>
          <dd>{employee.department}</dd>
        </div>
        <div>
          <dt className="text-[#ebfbff]/40">Position</dt>
          <dd>{employee.position}</dd>
        </div>
      </dl>
    </li>
  );
}

export function HrOrganisationView() {
  const [data, setData] = useState<HrOrganisationView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/hr/organisation", { cache: "no-store" });
      const payload = (await response.json()) as HrOrganisationView & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load organisation view.");
      }
      setData(payload);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load organisation view.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-8 text-sm text-[#ebfbff]/55">
        Loading organisation view from Neon…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-card rounded-2xl p-8 text-sm text-[#ff4d4f]">
        {error ?? "Unable to load organisation view."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-[#ebfbff]/60">
        {data.scope === "all-locations"
          ? "All locations — supervisors and team members from Neon."
          : "Your assigned location only."}
      </p>

      {data.locations.map((location) => (
        <section
          key={location.locationName}
          className="glass-card rounded-2xl p-5 sm:p-6"
        >
          <h2 className="text-lg font-bold text-[#ebfbff]">
            {location.locationName}
          </h2>

          <div className="mt-5 space-y-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[#00c6ff]">
                Supervisors
              </h3>
              {location.supervisors.length === 0 ? (
                <p className="mt-2 text-sm text-[#ebfbff]/50">
                  No supervisors assigned to this location.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {location.supervisors.map((supervisor) => (
                    <EmployeeLine key={supervisor.id} employee={supervisor} />
                  ))}
                </ul>
              )}
            </div>

            <div className="border-l-2 border-[#6cc801]/40 pl-4 sm:pl-6">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[#6cc801]">
                Team Members
              </h3>
              {location.teamMembers.length === 0 ? (
                <p className="mt-2 text-sm text-[#ebfbff]/50">
                  No team members assigned to this location.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {location.teamMembers.map((member) => (
                    <EmployeeLine key={member.id} employee={member} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
