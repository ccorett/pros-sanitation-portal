"use client";

import { AccessHistoryModal } from "@/components/admin/AccessHistoryModal";
import {
  canPerformAccountAction,
  getAssignableAccessLevels,
} from "@/lib/admin-account-permissions";
import { formatAccessLevelLabel } from "@/lib/access-levels";
import { formatEditTimestamp } from "@/lib/admin-format";
import type {
  AccessHistoryRow,
  AdminAccountRow,
} from "@/lib/admin-accounts-service";
import {
  EMPLOYEE_DEPARTMENTS,
  EMPLOYEE_JOB_TITLES,
  EMPLOYEE_LOCATION_ASSIGNMENTS,
} from "@/lib/employee-signup-options";
import { AccessLevel, AccountStatus } from "@prisma/client";
import { useCallback, useEffect, useState } from "react";

function statusClass(status: AccountStatus): string {
  if (status === "ACTIVE") {
    return "border-[#6cc801]/35 bg-[#6cc801]/15 text-[#6cc801]";
  }
  if (status === "DISABLED" || status === "REMOVED") {
    return "border-[#ff4d4f]/35 bg-[#ff4d4f]/15 text-[#ff4d4f]";
  }
  return "border-[#f5c542]/35 bg-[#f5c542]/15 text-[#f5c542]";
}

function formatOptionalTimestamp(iso: string | null): string {
  if (!iso) return "—";
  return formatEditTimestamp(iso);
}

type AccountsPayload = {
  accounts: AdminAccountRow[];
  actor: { accessLevel: AccessLevel; name: string };
  assignableLevels: AccessLevel[];
};

export function AdminAccountsSection() {
  const [payload, setPayload] = useState<AccountsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewTarget, setViewTarget] = useState<AdminAccountRow | null>(null);
  const [approveTarget, setApproveTarget] = useState<AdminAccountRow | null>(null);
  const [levelTarget, setLevelTarget] = useState<AdminAccountRow | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<AccessLevel>(
    AccessLevel.TEAM_MEMBER,
  );
  const [historyTarget, setHistoryTarget] = useState<AdminAccountRow | null>(null);
  const [history, setHistory] = useState<AccessHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminAccountRow | null>(null);
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editLocationAssignment, setEditLocationAssignment] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/accounts");
      const data = (await response.json()) as AccountsPayload & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load accounts.");
      }
      setPayload(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  async function runAction(
    account: AdminAccountRow,
    action: "approve" | "changeAccessLevel" | "updateWorkProfile" | "disable" | "remove",
    options?: {
      accessLevel?: AccessLevel;
      jobTitle?: string;
      department?: string;
      locationAssignment?: string;
    },
  ) {
    setBusyId(account.id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          accessLevel: options?.accessLevel,
          jobTitle: options?.jobTitle,
          department: options?.department,
          locationAssignment: options?.locationAssignment,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Action failed.");
      }
      setMessage(`Updated ${account.employeeName}.`);
      setLevelTarget(null);
      setApproveTarget(null);
      setEditTarget(null);
      await loadAccounts();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  function openWorkProfileEditor(account: AdminAccountRow) {
    setEditTarget(account);
    setEditJobTitle(
      EMPLOYEE_JOB_TITLES.includes(
        account.jobTitle as (typeof EMPLOYEE_JOB_TITLES)[number],
      )
        ? account.jobTitle
        : "",
    );
    setEditDepartment(
      EMPLOYEE_DEPARTMENTS.includes(
        account.department as (typeof EMPLOYEE_DEPARTMENTS)[number],
      )
        ? account.department
        : "",
    );
    setEditLocationAssignment(
      account.locationAssignment === "—"
        ? ""
        : EMPLOYEE_LOCATION_ASSIGNMENTS.includes(
              account.locationAssignment as (typeof EMPLOYEE_LOCATION_ASSIGNMENTS)[number],
            )
          ? account.locationAssignment
          : "",
    );
  }

  async function openHistory(account: AdminAccountRow) {
    setHistoryTarget(account);
    setHistory([]);
    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/admin/accounts/${account.id}/history`);
      const data = (await response.json()) as {
        history?: AccessHistoryRow[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load history.");
      }
      setHistory(data.history ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load history.");
      setHistoryTarget(null);
    } finally {
      setHistoryLoading(false);
    }
  }

  const actorLevel = payload?.actor.accessLevel;

  function canAct(
    account: AdminAccountRow,
    action: Parameters<typeof canPerformAccountAction>[3],
  ) {
    if (!actorLevel) return false;
    return canPerformAccountAction(
      actorLevel,
      account.accessLevel,
      account.accountStatus,
      action,
    );
  }

  const assignableLevels = actorLevel
    ? getAssignableAccessLevels(actorLevel)
    : [];

  return (
    <section className="min-w-0 space-y-4">
      {message ? (
        <p className="rounded-xl border border-[#6cc801]/30 bg-[#6cc801]/10 px-4 py-3 text-sm text-[#6cc801]">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 px-4 py-3 text-sm text-[#ff4d4f]">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
          Loading employee accounts…
        </div>
      ) : (
        <div className="glass-card portal-table-scroll rounded-2xl">
          <table className="min-w-[1700px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
                <th className="px-4 py-4 font-semibold sm:px-6">Employee Name</th>
                <th className="px-4 py-4 font-semibold">Email</th>
                <th className="px-4 py-4 font-semibold">Job Title</th>
                <th className="px-4 py-4 font-semibold">Position</th>
                <th className="px-4 py-4 font-semibold">Access Level</th>
                <th className="px-4 py-4 font-semibold">Account Status</th>
                <th className="px-4 py-4 font-semibold">Location Assignment</th>
                <th className="px-4 py-4 font-semibold">Department</th>
                <th className="px-4 py-4 font-semibold">Last Login</th>
                <th className="px-4 py-4 font-semibold">Last Edited</th>
                <th className="px-4 py-4 font-semibold">Edited By</th>
                <th className="px-4 py-4 font-semibold sm:px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(payload?.accounts ?? []).map((account) => (
                <tr
                  key={account.id}
                  className="border-b border-[#ebfbff]/5 last:border-b-0 hover:bg-[#ebfbff]/[0.03]"
                >
                  <td className="px-4 py-4 font-medium text-[#ebfbff] sm:px-6">
                    {account.employeeName}
                  </td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">{account.email}</td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">{account.jobTitle}</td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">{account.position}</td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">
                    {account.accessLevelLabel}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(account.accountStatus)}`}
                    >
                      {account.accountStatusLabel}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">
                    {account.locationAssignment}
                  </td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">{account.department}</td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">
                    {formatOptionalTimestamp(account.lastLoginAt)}
                  </td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">
                    {formatOptionalTimestamp(account.lastEditedAt)}
                  </td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">
                    {account.editedBy ?? "—"}
                  </td>
                  <td className="px-4 py-4 sm:px-6">
                    <div className="flex flex-wrap gap-2">
                      <ActionButton
                        label="View"
                        onClick={() => setViewTarget(account)}
                        disabled={!canAct(account, "view")}
                      />
                      <ActionButton
                        label="Approve"
                        tone="success"
                        onClick={() => {
                          setApproveTarget(account);
                          setSelectedLevel(
                            assignableLevels[0] ?? AccessLevel.TEAM_MEMBER,
                          );
                        }}
                        disabled={!canAct(account, "approve")}
                      />
                      <ActionButton
                        label="Change Level"
                        onClick={() => {
                          setLevelTarget(account);
                          setSelectedLevel(
                            assignableLevels[0] ?? AccessLevel.TEAM_MEMBER,
                          );
                        }}
                        disabled={!canAct(account, "changeAccessLevel")}
                      />
                      <ActionButton
                        label="Edit Work Profile"
                        onClick={() => openWorkProfileEditor(account)}
                        disabled={!canAct(account, "editWorkProfile")}
                      />
                      <ActionButton
                        label="Disable"
                        tone="danger"
                        onClick={() => runAction(account, "disable")}
                        disabled={
                          !canAct(account, "disable") || busyId === account.id
                        }
                      />
                      <ActionButton
                        label="Remove"
                        tone="danger"
                        onClick={() => runAction(account, "remove")}
                        disabled={
                          !canAct(account, "remove") || busyId === account.id
                        }
                      />
                      <ActionButton
                        label="History"
                        onClick={() => openHistory(account)}
                        disabled={!canAct(account, "viewHistory")}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0c151d]/80 p-4 backdrop-blur-sm sm:items-center">
          <div className="glass-card w-full max-w-lg rounded-2xl p-5 sm:p-6">
            <h3 className="text-lg font-bold text-[#ebfbff]">{viewTarget.employeeName}</h3>
            <dl className="mt-4 space-y-2 text-sm text-[#ebfbff]/70">
              <div>
                <dt className="text-[#ebfbff]/45">Email</dt>
                <dd>{viewTarget.email}</dd>
              </div>
              <div>
                <dt className="text-[#ebfbff]/45">Access Level</dt>
                <dd>{viewTarget.accessLevelLabel}</dd>
              </div>
              <div>
                <dt className="text-[#ebfbff]/45">Account Status</dt>
                <dd>{viewTarget.accountStatusLabel}</dd>
              </div>
              <div>
                <dt className="text-[#ebfbff]/45">Job Title</dt>
                <dd>{viewTarget.jobTitle}</dd>
              </div>
              <div>
                <dt className="text-[#ebfbff]/45">Position</dt>
                <dd>{viewTarget.position}</dd>
              </div>
              <div>
                <dt className="text-[#ebfbff]/45">Department</dt>
                <dd>{viewTarget.department}</dd>
              </div>
              <div>
                <dt className="text-[#ebfbff]/45">Location</dt>
                <dd>{viewTarget.locationAssignment}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => setViewTarget(null)}
              className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-4 py-3 text-sm font-semibold text-[#ebfbff]"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {approveTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0c151d]/80 p-4 backdrop-blur-sm sm:items-center">
          <div className="glass-card w-full max-w-lg space-y-4 rounded-2xl p-5 sm:p-6">
            <h3 className="text-lg font-bold text-[#ebfbff]">
              Approve Account · {approveTarget.employeeName}
            </h3>
            <p className="text-sm text-[#ebfbff]/60">
              Assign an access level and activate this employee portal account.
            </p>
            <label className="block">
              <span className="text-sm text-[#ebfbff]/70">Access level</span>
              <select
                value={selectedLevel}
                onChange={(event) =>
                  setSelectedLevel(event.target.value as AccessLevel)
                }
                className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-[#ebfbff]"
              >
                {assignableLevels.map((level) => (
                  <option key={level} value={level}>
                    {formatAccessLevelLabel(level)}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-sm text-[#ebfbff]/70">
              Position:{" "}
              <span className="font-semibold text-[#ebfbff]">
                {formatAccessLevelLabel(selectedLevel)}
              </span>
              <span className="text-[#ebfbff]/50"> (set automatically)</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setApproveTarget(null)}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[#ebfbff]/20 bg-[#ebfbff]/5 px-4 py-3 text-sm font-semibold text-[#ebfbff]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  runAction(approveTarget, "approve", {
                    accessLevel: selectedLevel,
                  })
                }
                disabled={busyId === approveTarget.id}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-4 py-3 text-sm font-semibold text-[#ebfbff] disabled:opacity-40"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {levelTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0c151d]/80 p-4 backdrop-blur-sm sm:items-center">
          <div className="glass-card w-full max-w-lg space-y-4 rounded-2xl p-5 sm:p-6">
            <h3 className="text-lg font-bold text-[#ebfbff]">
              Change Access Level · {levelTarget.employeeName}
            </h3>
            <label className="block">
              <span className="text-sm text-[#ebfbff]/70">New access level</span>
              <select
                value={selectedLevel}
                onChange={(event) =>
                  setSelectedLevel(event.target.value as AccessLevel)
                }
                className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-[#ebfbff]"
              >
                {assignableLevels.map((level) => (
                  <option key={level} value={level}>
                    {formatAccessLevelLabel(level)}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-sm text-[#ebfbff]/70">
              Position:{" "}
              <span className="font-semibold text-[#ebfbff]">
                {formatAccessLevelLabel(selectedLevel)}
              </span>
              <span className="text-[#ebfbff]/50"> (set automatically)</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLevelTarget(null)}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[#ebfbff]/20 bg-[#ebfbff]/5 px-4 py-3 text-sm font-semibold text-[#ebfbff]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  runAction(levelTarget, "changeAccessLevel", {
                    accessLevel: selectedLevel,
                  })
                }
                disabled={busyId === levelTarget.id}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-4 py-3 text-sm font-semibold text-[#ebfbff] disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0c151d]/80 p-4 backdrop-blur-sm sm:items-center">
          <div className="glass-card w-full max-w-lg space-y-4 rounded-2xl p-5 sm:p-6">
            <h3 className="text-lg font-bold text-[#ebfbff]">
              Edit Work Profile · {editTarget.employeeName}
            </h3>
            <p className="text-sm text-[#ebfbff]/60">
              Admin and Super Admin only. Changes save to Neon and update the
              employee profile immediately.
            </p>
            <label className="block">
              <span className="text-sm text-[#ebfbff]/70">Job Title</span>
              <select
                value={editJobTitle}
                onChange={(event) => setEditJobTitle(event.target.value)}
                className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-[#ebfbff]"
              >
                <option value="">Select job title</option>
                {EMPLOYEE_JOB_TITLES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <div className="block">
              <span className="text-sm text-[#ebfbff]/70">Position</span>
              <p
                className="mt-2 min-h-[48px] rounded-xl border border-[#ebfbff]/10 bg-[#0c151d]/40 px-4 py-3 text-[#ebfbff]/80"
                aria-readonly="true"
              >
                {editTarget.accessLevelLabel}
                <span className="ml-2 text-sm text-[#ebfbff]/50">
                  (from access level)
                </span>
              </p>
            </div>
            <label className="block">
              <span className="text-sm text-[#ebfbff]/70">Department</span>
              <select
                value={editDepartment}
                onChange={(event) => setEditDepartment(event.target.value)}
                className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-[#ebfbff]"
              >
                <option value="">Select department</option>
                {EMPLOYEE_DEPARTMENTS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm text-[#ebfbff]/70">Location Assignment</span>
              <select
                value={editLocationAssignment}
                onChange={(event) =>
                  setEditLocationAssignment(event.target.value)
                }
                className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-[#ebfbff]"
              >
                <option value="">Select location</option>
                {EMPLOYEE_LOCATION_ASSIGNMENTS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[#ebfbff]/20 bg-[#ebfbff]/5 px-4 py-3 text-sm font-semibold text-[#ebfbff]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!editJobTitle || !editDepartment || !editLocationAssignment) {
                    setError("Complete all work profile fields.");
                    return;
                  }
                  void runAction(editTarget, "updateWorkProfile", {
                    jobTitle: editJobTitle,
                    department: editDepartment,
                    locationAssignment: editLocationAssignment,
                  });
                }}
                disabled={busyId === editTarget.id}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-4 py-3 text-sm font-semibold text-[#ebfbff] disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {historyTarget ? (
        <AccessHistoryModal
          employeeName={historyTarget.employeeName}
          history={history}
          loading={historyLoading}
          onClose={() => setHistoryTarget(null)}
        />
      ) : null}
    </section>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  tone = "default",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "success" | "danger";
}) {
  const classes =
    tone === "success"
      ? "border-[#6cc801]/40 bg-[#6cc801]/10"
      : tone === "danger"
        ? "border-[#ff4d4f]/40 bg-[#ff4d4f]/10"
        : "border-[#00c6ff]/40 bg-[#00c6ff]/10";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-[44px] items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold text-[#ebfbff] disabled:opacity-40 ${classes}`}
    >
      {label}
    </button>
  );
}
