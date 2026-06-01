"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CounterField } from "@/components/bin-service/CounterField";
import {
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
} from "@/lib/auth-form-styles";
import {
  clampBinCount,
  type BinTechnicianServiceStatus,
} from "@/lib/bin-locations-status";
import {
  applyTechnicianServiceUpdate,
  type BinLocationView,
} from "@/lib/bin-locations-storage";

type BinServiceUpdateModalProps = {
  location: BinLocationView;
  updatedBy: string;
  onClose: () => void;
  onSaved: () => void;
};

const SERVICE_STATUS_OPTIONS: Array<{
  value: BinTechnicianServiceStatus;
  label: string;
}> = [
  { value: "completed", label: "Completed" },
  { value: "cannot_access", label: "Cannot Access" },
  { value: "issue_reported", label: "Issue Reported" },
];

export function BinServiceUpdateModal({
  location,
  updatedBy,
  onClose,
  onSaved,
}: BinServiceUpdateModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const maxRegular = location.regularBins;
  const maxNew = location.newBins;
  const maxLiners = maxRegular + maxNew;
  const defaultRegular = clampBinCount(
    location.regularBinsServiced ?? location.regularBins,
    maxRegular,
  );
  const defaultNew = clampBinCount(
    location.newBinsServiced ?? location.newBins,
    maxNew,
  );

  const [lastServiceDate, setLastServiceDate] = useState(
    location.lastServiceDate || today,
  );
  const [regularBinsServiced, setRegularBinsServiced] = useState(defaultRegular);
  const [newBinsServiced, setNewBinsServiced] = useState(defaultNew);
  const [linersUsed, setLinersUsed] = useState(() =>
    clampBinCount(
      location.linersUsed ?? defaultRegular + defaultNew,
      maxLiners,
    ),
  );
  const [serviceStatus, setServiceStatus] = useState<BinTechnicianServiceStatus>(
    location.serviceStatus ?? "completed",
  );
  const [notes, setNotes] = useState(location.displayNotes);
  const [issueNotes, setIssueNotes] = useState(location.issueNotes ?? "");
  const [cannotAccessReason, setCannotAccessReason] = useState(
    location.cannotAccessReason ?? "",
  );
  const [clientSignatureName, setClientSignatureName] = useState(
    location.clientSignatureName ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLinersUsed(
      clampBinCount(regularBinsServiced + newBinsServiced, maxLiners),
    );
  }, [regularBinsServiced, newBinsServiced, maxLiners]);

  function setRegularServiced(value: number) {
    setRegularBinsServiced(clampBinCount(value, maxRegular));
  }

  function setNewServiced(value: number) {
    setNewBinsServiced(clampBinCount(value, maxNew));
  }

  function setLiners(value: number) {
    setLinersUsed(clampBinCount(value, maxLiners));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (serviceStatus === "completed" && !lastServiceDate.trim()) {
      setError("Last Service Date is required when status is Completed.");
      return;
    }

    if (serviceStatus === "cannot_access" && !cannotAccessReason.trim()) {
      setError("Cannot Access Reason is required.");
      return;
    }

    if (serviceStatus === "issue_reported" && !issueNotes.trim()) {
      setError("Issue Notes are required when status is Issue Reported.");
      return;
    }

    if (location.signatureRequired && serviceStatus === "completed" && !clientSignatureName.trim()) {
      setError("Client Signature Name is required for this location.");
      return;
    }

    if (regularBinsServiced > maxRegular || newBinsServiced > maxNew) {
      setError(
        `Bins serviced cannot exceed expected counts (max ${maxRegular} regular, ${maxNew} new).`,
      );
      return;
    }

    if (linersUsed > maxLiners) {
      setError(`Liners used cannot exceed ${maxLiners} for this location.`);
      return;
    }

    setSaving(true);

    try {
      applyTechnicianServiceUpdate(location.id, {
        lastServiceDate: lastServiceDate.trim() || today,
        regularBinsServiced,
        newBinsServiced,
        linersUsed,
        serviceStatus,
        notes,
        issueNotes: issueNotes.trim() || undefined,
        cannotAccessReason: cannotAccessReason.trim() || undefined,
        clientSignatureName: clientSignatureName.trim() || undefined,
        updatedBy,
      });
      onSaved();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to save service update.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0c151d]/80 p-4 backdrop-blur-sm sm:items-center">
      <div className="glass-card max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-5 sm:p-6">
        <h3 className="text-lg font-bold text-[#ebfbff]">Update Service</h3>
        <p className="mt-1 text-sm text-[#ebfbff]/60">{location.location}</p>
        <p className="mt-1 text-xs text-[#ebfbff]/45">
          Expected: {location.regularBins} regular · {location.newBins} new
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          {error ? (
            <p className={authErrorClassName} role="alert">
              {error}
            </p>
          ) : null}

          <div>
            <label htmlFor="service-status" className={authLabelClassName}>
              Service Status
            </label>
            <select
              id="service-status"
              value={serviceStatus}
              onChange={(event) =>
                setServiceStatus(event.target.value as BinTechnicianServiceStatus)
              }
              className={authInputClassName}
            >
              {SERVICE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="last-service-date" className={authLabelClassName}>
              Last Service Date
            </label>
            <input
              id="last-service-date"
              type="date"
              required={serviceStatus === "completed"}
              value={lastServiceDate}
              onChange={(event) => setLastServiceDate(event.target.value)}
              className={authInputClassName}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <CounterField
              label="Regular Bins Serviced"
              value={regularBinsServiced}
              onChange={setRegularServiced}
              max={maxRegular}
            />
            <CounterField
              label="New Bins Serviced"
              value={newBinsServiced}
              onChange={setNewServiced}
              max={maxNew}
            />
          </div>

          <CounterField
            label="Liners Used"
            value={linersUsed}
            onChange={setLiners}
            max={maxLiners}
          />

          <div>
            <label htmlFor="service-notes" className={authLabelClassName}>
              Notes
            </label>
            <textarea
              id="service-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className={authInputClassName}
            />
          </div>

          {serviceStatus === "cannot_access" ? (
            <div>
              <label htmlFor="cannot-access-reason" className={authLabelClassName}>
                Cannot Access Reason
              </label>
              <textarea
                id="cannot-access-reason"
                required
                value={cannotAccessReason}
                onChange={(event) => setCannotAccessReason(event.target.value)}
                rows={2}
                className={authInputClassName}
              />
            </div>
          ) : null}

          {serviceStatus === "issue_reported" ? (
            <div>
              <label htmlFor="issue-notes" className={authLabelClassName}>
                Issue Notes
              </label>
              <textarea
                id="issue-notes"
                required
                value={issueNotes}
                onChange={(event) => setIssueNotes(event.target.value)}
                rows={3}
                className={authInputClassName}
              />
            </div>
          ) : null}

          {(location.signatureRequired || serviceStatus === "completed") && (
            <div>
              <label htmlFor="client-signature" className={authLabelClassName}>
                Client Signature Name
                {location.signatureRequired ? " (required)" : ""}
              </label>
              <input
                id="client-signature"
                type="text"
                value={clientSignatureName}
                onChange={(event) => setClientSignatureName(event.target.value)}
                className={authInputClassName}
              />
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" variant="login" loading={saving} fullWidth>
              Save Service Update
            </Button>
            <Button type="button" variant="ghost" fullWidth onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
