"use client";

import type {
  HrOrganisationView,
  OrganisationEmployeeRow,
  OrganisationLocationGroup,
} from "@/lib/hr-organisation-service";
import { useCallback, useEffect, useState } from "react";

function NameList({
  people,
  emptyLabel,
}: {
  people: OrganisationEmployeeRow[];
  emptyLabel: string;
}) {
  if (people.length === 0) {
    return <p className="mt-2 text-sm text-[#ebfbff]/50">{emptyLabel}</p>;
  }

  return (
    <ul className="mt-2 space-y-1.5">
      {people.map((person) => (
        <li
          key={person.id}
          className="text-sm font-medium text-[#ebfbff]/85 before:mr-2 before:text-[#00c6ff] before:content-['•']"
        >
          {person.name}
        </li>
      ))}
    </ul>
  );
}

function LocationCard({ location }: { location: OrganisationLocationGroup }) {
  return (
    <article className="glass-card flex h-full flex-col rounded-2xl p-5 sm:p-6">
      <h3 className="text-base font-bold text-[#ebfbff] sm:text-lg">
        {location.locationName}
      </h3>

      <div className="mt-4 flex-1 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#00c6ff]">
            Supervisors
          </p>
          <NameList
            people={location.supervisors}
            emptyLabel="No supervisors assigned."
          />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6cc801]">
            Employees
          </p>
          <NameList
            people={location.teamMembers}
            emptyLabel="No employees assigned."
          />
        </div>
      </div>
    </article>
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
        throw new Error(payload.error ?? "Unable to load team structure.");
      }
      setData(payload);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load team structure.",
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
        Loading team structure…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-card rounded-2xl p-8 text-sm text-[#ff4d4f]">
        {error ?? "Unable to load team structure."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-[#ebfbff]/60">
        {data.scope === "all-locations"
          ? "All locations — managers, supervisors, and employees."
          : "Your assigned location only."}
      </p>

      {data.scope === "all-locations" ? (
        <section className="glass-card rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-bold text-[#ebfbff]">Managers</h2>
          <NameList
            people={data.managers}
            emptyLabel="No managers listed."
          />
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.locations.map((location) => (
          <LocationCard key={location.locationName} location={location} />
        ))}
      </div>
    </div>
  );
}
