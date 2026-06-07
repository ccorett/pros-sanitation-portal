"use client";

import { AccessHistoryModal } from "@/components/admin/AccessHistoryModal";
import {
  canPerformAccountAction,
  getAssignableAccessLevels,
} from "@/lib/admin-account-permissions";
import { formatAccessLevelLabel } from "@/lib/access-levels";
import { formatEditTimestamp } from "@/lib/admin-format";
import type {
  AccountAuditHistoryRow,
  AdminAccountRow,
  AdminAccountsSummary,
} from "@/lib/admin-accounts-service";
import {
  ALL_EMPLOYEE_RESPONSIBILITIES,
  formatResponsibilityLabel,
} from "@/lib/employee-responsibilities";
import {
  EMPLOYEE_DEPARTMENTS,
  EMPLOYEE_JOB_TITLES,
  EMPLOYEE_LOCATION_ASSIGNMENTS,
} from "@/lib/employee-signup-options";
import { normalizePinInput } from "@/lib/pin";
import { AccessLevel, AccountStatus, EmployeeResponsibility } from "@prisma/client";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  summary: AdminAccountsSummary;
  actor: { accessLevel: AccessLevel; name: string };
  assignableLevels: AccessLevel[];
  isSuperAdmin: boolean;
};

const SUMMARY_CARDS: {
  key: keyof AdminAccountsSummary;
  label: string;
}[] = [
  { key: "totalEmployees", label: "Total Employees" },
  { key: "activeAccounts", label: "Active Accounts" },
  { key: "pendingVerification", label: "Pending Verification" },
  { key: "operations", label: "Operations" },
  { key: "sanitationBins", label: "Sanitation / Bins" },
  { key: "supervisors", label: "Supervisors" },
  { key: "managers", label: "Managers" },
  { key: "admins", label: "Admins" },
  { key: "disabledRemoved", label: "Disabled / Removed" },
];

export function AdminAccountsSection() {
  const [payload, setPayload] = useState<AccountsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAccessLevel, setFilterAccessLevel] = useState<string>("");
  const [filterDepartment, setFilterDepartment] = useState<string>("");
  const [filterLocation, setFilterLocation] = useState<string>("");
  const [filterResponsibility, setFilterResponsibility] = useState<string>("");
  const [filterAccountStatus, setFilterAccountStatus] = useState<string>("");
  const [viewTarget, setViewTarget] = useState<AdminAccountRow | null>(null);
  const [approveTarget, setApproveTarget] = useState<AdminAccountRow | null>(null);
  const [levelTarget, setLevelTarget] = useState<AdminAccountRow | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<AccessLevel>(
    AccessLevel.TEAM_MEMBER,
  );
  const [historyTarget, setHistoryTarget] = useState<AdminAccountRow | null>(null);
  const [history, setHistory] = useState<AccountAuditHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminAccountRow | null>(null);
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editLocationAssignment, setEditLocationAssignment] = useState("");
  const [editAdditionalLocations, setEditAdditionalLocations] = useState<string[]>(
    [],
  );
  const [responsibilityTarget, setResponsibilityTarget] =
    useState<AdminAccountRow | null>(null);
  const [selectedResponsibilities, setSelectedResponsibilities] = useState<
    EmployeeResponsibility[]
  >([]);
  const [deleteTarget, setDeleteTarget] = useState<AdminAccountRow | null>(null);
  const [deletePin, setDeletePin] = useState("");
  const [showRemovedAccounts, setShowRemovedAccounts] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = showRemovedAccounts ? "?includeRemoved=1" : "";
      const response = await fetch(`/api/admin/accounts${query}`);
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
  }, [showRemovedAccounts]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  async function runAction(
    account: AdminAccountRow,
    action:
      | "approve"
      | "changeAccessLevel"
      | "updateWorkProfile"
      | "changeResponsibilities"
      | "disable"
      | "deleteAccount"
      | "restoreAccount",
    options?: {
      accessLevel?: AccessLevel;
      responsibilities?: EmployeeResponsibility[];
      confirmPin?: string;
      jobTitle?: string;
      department?: string;
      locationAssignment?: string;
      primaryLocationAssignment?: string;
      additionalLocationAssignments?: string[];
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
          responsibilities: options?.responsibilities,
          confirmPin: options?.confirmPin,
          jobTitle: options?.jobTitle,
          department: options?.department,
          locationAssignment: options?.locationAssignment,
          primaryLocationAssignment: options?.primaryLocationAssignment,
          additionalLocationAssignments: options?.additionalLocationAssignments,
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
      setResponsibilityTarget(null);
      setDeleteTarget(null);
      setDeletePin("");
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
    const primary =
      account.primaryLocationAssignment === "—"
        ? ""
        : EMPLOYEE_LOCATION_ASSIGNMENTS.includes(
              account.primaryLocationAssignment as (typeof EMPLOYEE_LOCATION_ASSIGNMENTS)[number],
            )
          ? account.primaryLocationAssignment
          : "";

    setEditLocationAssignment(primary);
    setEditAdditionalLocations(
      account.additionalLocationAssignments.filter((location) =>
        EMPLOYEE_LOCATION_ASSIGNMENTS.includes(
          location as (typeof EMPLOYEE_LOCATION_ASSIGNMENTS)[number],
        ),
      ),
    );
  }

  function toggleAdditionalLocation(location: string) {
    setEditAdditionalLocations((current) =>
      current.includes(location)
        ? current.filter((item) => item !== location)
        : [...current, location],
    );
  }

  function openResponsibilityEditor(account: AdminAccountRow) {
    setResponsibilityTarget(account);
    setSelectedResponsibilities([...account.responsibilities]);
  }

  function toggleResponsibility(responsibility: EmployeeResponsibility) {
    setSelectedResponsibilities((current) =>
      current.includes(responsibility)
        ? current.filter((item) => item !== responsibility)
        : [...current, responsibility],
    );
  }

  async function openHistory(account: AdminAccountRow) {
    setHistoryTarget(account);
    setHistory([]);
    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/admin/accounts/${account.id}/history`);
      const data = (await response.json()) as {
        history?: AccountAuditHistoryRow[];
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
  const isSuperAdmin = payload?.isSuperAdmin ?? false;

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

  const filteredAccounts = useMemo(() => {
    const accounts = payload?.accounts ?? [];
    const query = searchQuery.trim().toLowerCase();

    return accounts.filter((account) => {
      if (query) {
        const haystack = `${account.employeeName} ${account.email}`.toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }

      if (filterAccessLevel && account.accessLevel !== filterAccessLevel) {
        return false;
      }

      if (filterDepartment && account.department !== filterDepartment) {
        return false;
      }

      if (
        filterLocation &&
        account.locationAssignment !== filterLocation &&
        !(filterLocation === "—" && account.locationAssignment === "—")
      ) {
        return false;
      }

      if (
        filterResponsibility &&
        !account.responsibilities.includes(
          filterResponsibility as EmployeeResponsibility,
        )
      ) {
        return false;
      }

      if (filterAccountStatus && account.accountStatus !== filterAccountStatus) {
        return false;
      }

      return true;
    });
  }, [
    payload?.accounts,
    searchQuery,
    filterAccessLevel,
    filterDepartment,
    filterLocation,
    filterResponsibility,
    filterAccountStatus,
  ]);

  const locationOptions = useMemo(() => {
    const values = new Set(
      (payload?.accounts ?? []).map((account) => account.locationAssignment),
    );
    return [...values].sort();
  }, [payload?.accounts]);

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

      {payload?.summary ? (
        <div className="glass-card min-w-0 rounded-2xl p-4 sm:p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#00c6ff]">
            Account Summary
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-9">
            {SUMMARY_CARDS.map((card) => (
              <div
                key={card.key}
                className="min-w-0 rounded-xl border border-[#ebfbff]/10 bg-[#0c151d]/40 px-3 py-2.5"
              >
                <p className="text-[10px] font-medium uppercase leading-tight tracking-wide text-[#ebfbff]/45">
                  {card.label}
                </p>
                <p className="mt-1 text-lg font-bold tabular-nums text-[#ebfbff]">
                  {payload.summary[card.key]}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(220px,260px)_minmax(0,1fr)] lg:items-start">
        <aside className="min-w-0 lg:sticky lg:top-4 lg:self-start">
          <div className="glass-card rounded-2xl p-4 sm:p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#00c6ff]">
              Search &amp; Filters
            </h2>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-sm text-[#ebfbff]/70">
                  Search by name or email
                </span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search employees…"
                  className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-[#ebfbff]"
                />
              </label>
              <FilterSelect
                label="Access level"
                value={filterAccessLevel}
                onChange={setFilterAccessLevel}
                options={Object.values(AccessLevel).map((level) => ({
                  value: level,
                  label: formatAccessLevelLabel(level),
                }))}
              />
              <FilterSelect
                label="Department"
                value={filterDepartment}
                onChange={setFilterDepartment}
                options={EMPLOYEE_DEPARTMENTS.map((department) => ({
                  value: department,
                  label: department,
                }))}
              />
              <FilterSelect
                label="Location"
                value={filterLocation}
                onChange={setFilterLocation}
                options={locationOptions.map((location) => ({
                  value: location,
                  label: location,
                }))}
              />
              <FilterSelect
                label="Responsibility"
                value={filterResponsibility}
                onChange={setFilterResponsibility}
                options={ALL_EMPLOYEE_RESPONSIBILITIES.map((responsibility) => ({
                  value: responsibility,
                  label: formatResponsibilityLabel(responsibility),
                }))}
              />
              <FilterSelect
                label="Account status"
                value={filterAccountStatus}
                onChange={setFilterAccountStatus}
                options={Object.values(AccountStatus).map((status) => ({
                  value: status,
                  label: status.charAt(0) + status.slice(1).toLowerCase(),
                }))}
              />
            </div>
            {isSuperAdmin ? (
              <label className="mt-4 flex items-center gap-3 rounded-xl border border-[#ebfbff]/10 bg-[#0c151d]/40 px-4 py-3">
                <input
                  type="checkbox"
                  checked={showRemovedAccounts}
                  onChange={(event) => setShowRemovedAccounts(event.target.checked)}
                  className="h-4 w-4 accent-[#00c6ff]"
                />
                <span className="text-sm text-[#ebfbff]/80">Show Removed Accounts</span>
              </label>
            ) : null}
            <p className="mt-4 text-xs text-[#ebfbff]/45">
              Showing {filteredAccounts.length} of {payload?.accounts.length ?? 0}{" "}
              accounts
            </p>
          </div>
        </aside>

        <div className="min-w-0">
          {loading ? (
            <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
              Loading employee accounts…
            </div>
          ) : (
            <div className="glass-card portal-table-scroll min-w-0 w-full rounded-2xl">
              <table className="w-full table-auto text-left text-xs">
            <thead>
              <tr className="border-b border-[#ebfbff]/10 text-[10px] uppercase tracking-wide text-[#ebfbff]/50">
                <th className="px-2 py-3 font-semibold sm:px-3">Employee Name</th>
                <th className="px-2 py-3 font-semibold sm:px-3">Email</th>
                <th className="px-2 py-3 font-semibold sm:px-3">Job Title</th>
                <th className="px-2 py-3 font-semibold sm:px-3">Position</th>
                <th className="px-2 py-3 font-semibold sm:px-3">Access Level</th>
                <th className="px-2 py-3 font-semibold sm:px-3">Responsibilities</th>
                <th className="px-2 py-3 font-semibold sm:px-3">Account Status</th>
                <th className="px-2 py-3 font-semibold sm:px-3">Location Assignment</th>
                <th className="px-2 py-3 font-semibold sm:px-3">Department</th>
                <th className="px-2 py-3 font-semibold sm:px-3">Last Login</th>
                <th className="px-2 py-3 font-semibold sm:px-3">Last Edited</th>
                <th className="px-2 py-3 font-semibold sm:px-3">Edited By</th>
                <th className="px-2 py-3 font-semibold sm:px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map((account) => (
                <tr
                  key={account.id}
                  className="border-b border-[#ebfbff]/5 last:border-b-0 hover:bg-[#ebfbff]/[0.03]"
                >
                  <td className="whitespace-normal px-2 py-3 font-medium text-[#ebfbff] sm:px-3">
                    {account.employeeName}
                    {account.isSuperAdminProtected ? (
                      <span className="ml-1 inline-flex rounded-full border border-[#f5c542]/35 bg-[#f5c542]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#f5c542]">
                        Protected
                      </span>
                    ) : null}
                  </td>
                  <td className="whitespace-normal break-all px-2 py-3 text-[#ebfbff]/70 sm:px-3">
                    {account.email}
                  </td>
                  <td className="whitespace-normal px-2 py-3 text-[#ebfbff]/70 sm:px-3">
                    {account.jobTitle}
                  </td>
                  <td className="whitespace-normal px-2 py-3 text-[#ebfbff]/70 sm:px-3">
                    {account.position}
                  </td>
                  <td className="whitespace-normal px-2 py-3 text-[#ebfbff]/70 sm:px-3">
                    {account.accessLevelLabel}
                  </td>
                  <td className="whitespace-normal px-2 py-3 text-[#ebfbff]/70 sm:px-3">
                    {account.responsibilitiesLabel}
                  </td>
                  <td className="whitespace-normal px-2 py-3 sm:px-3">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass(account.accountStatus)}`}
                    >
                      {account.accountStatusLabel}
                    </span>
                  </td>
                  <td className="whitespace-normal px-2 py-3 text-[#ebfbff]/70 sm:px-3">
                    {account.locationAssignment}
                  </td>
                  <td className="whitespace-normal px-2 py-3 text-[#ebfbff]/70 sm:px-3">
                    {account.department}
                  </td>
                  <td className="whitespace-normal px-2 py-3 text-[#ebfbff]/70 sm:px-3">
                    {formatOptionalTimestamp(account.lastLoginAt)}
                  </td>
                  <td className="whitespace-normal px-2 py-3 text-[#ebfbff]/70 sm:px-3">
                    {formatOptionalTimestamp(account.lastEditedAt)}
                  </td>
                  <td className="whitespace-normal px-2 py-3 text-[#ebfbff]/70 sm:px-3">
                    {account.editedBy ?? "—"}
                  </td>
                  <td className="whitespace-normal px-2 py-3 sm:px-3">
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
                      {!account.isSuperAdminProtected ? (
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
                      ) : null}
                      <ActionButton
                        label="Edit Work Profile"
                        onClick={() => openWorkProfileEditor(account)}
                        disabled={!canAct(account, "editWorkProfile")}
                      />
                      {!account.isSuperAdminProtected ? (
                        <ActionButton
                          label="Responsibilities"
                          onClick={() => openResponsibilityEditor(account)}
                          disabled={!canAct(account, "changeResponsibilities")}
                        />
                      ) : null}
                      <ActionButton
                        label="Disable"
                        tone="danger"
                        onClick={() => runAction(account, "disable")}
                        disabled={
                          !canAct(account, "disable") || busyId === account.id
                        }
                      />
                      {account.canRestore && canAct(account, "restoreAccount") ? (
                        <ActionButton
                          label="Restore"
                          tone="success"
                          onClick={() => void runAction(account, "restoreAccount")}
                          disabled={busyId === account.id}
                        />
                      ) : null}
                      {isSuperAdmin && !account.isSuperAdminProtected ? (
                        <ActionButton
                          label="Delete Account"
                          tone="danger"
                          onClick={() => {
                            setDeleteTarget(account);
                            setDeletePin("");
                          }}
                          disabled={
                            !canAct(account, "deleteAccount") ||
                            busyId === account.id
                          }
                        />
                      ) : null}
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
        </div>
      </div>

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
                <dt className="text-[#ebfbff]/45">Responsibilities</dt>
                <dd>{viewTarget.responsibilitiesLabel}</dd>
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
                <dt className="text-[#ebfbff]/45">Primary Location</dt>
                <dd>{viewTarget.primaryLocationAssignment}</dd>
              </div>
              <div>
                <dt className="text-[#ebfbff]/45">Additional Locations</dt>
                <dd>
                  {viewTarget.additionalLocationAssignments.length > 0
                    ? viewTarget.additionalLocationAssignments.join(", ")
                    : "—"}
                </dd>
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
              <span className="text-sm text-[#ebfbff]/70">Primary Location</span>
              <select
                value={editLocationAssignment}
                onChange={(event) =>
                  setEditLocationAssignment(event.target.value)
                }
                className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-[#ebfbff]"
              >
                <option value="">Select primary location</option>
                {EMPLOYEE_LOCATION_ASSIGNMENTS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <div className="block">
              <span className="text-sm text-[#ebfbff]/70">Additional Locations</span>
              <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 p-3">
                {EMPLOYEE_LOCATION_ASSIGNMENTS.filter(
                  (option) => option !== editLocationAssignment,
                ).map((option) => (
                  <label
                    key={option}
                    className="flex min-h-[40px] items-center gap-3 rounded-lg px-2 py-1 text-sm text-[#ebfbff]"
                  >
                    <input
                      type="checkbox"
                      checked={editAdditionalLocations.includes(option)}
                      onChange={() => toggleAdditionalLocation(option)}
                      className="h-4 w-4"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>
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
                    primaryLocationAssignment: editLocationAssignment,
                    additionalLocationAssignments: editAdditionalLocations.filter(
                      (location) => location !== editLocationAssignment,
                    ),
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

      {responsibilityTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0c151d]/80 p-4 backdrop-blur-sm sm:items-center">
          <div className="glass-card w-full max-w-lg space-y-4 rounded-2xl p-5 sm:p-6">
            <h3 className="text-lg font-bold text-[#ebfbff]">
              Responsibilities · {responsibilityTarget.employeeName}
            </h3>
            <p className="text-sm text-[#ebfbff]/60">
              Responsibilities control module visibility. Access level still
              controls platform authority.
            </p>
            <div className="space-y-2">
              {ALL_EMPLOYEE_RESPONSIBILITIES.map((responsibility) => (
                <label
                  key={responsibility}
                  className="flex min-h-[44px] items-center gap-3 rounded-xl border border-[#ebfbff]/10 bg-[#0c151d]/40 px-4 py-2"
                >
                  <input
                    type="checkbox"
                    checked={selectedResponsibilities.includes(responsibility)}
                    onChange={() => toggleResponsibility(responsibility)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-[#ebfbff]">
                    {formatResponsibilityLabel(responsibility)}
                  </span>
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setResponsibilityTarget(null)}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[#ebfbff]/20 bg-[#ebfbff]/5 px-4 py-3 text-sm font-semibold text-[#ebfbff]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedResponsibilities.length === 0) {
                    setError("Select at least one responsibility.");
                    return;
                  }
                  void runAction(responsibilityTarget, "changeResponsibilities", {
                    responsibilities: selectedResponsibilities,
                  });
                }}
                disabled={busyId === responsibilityTarget.id}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-4 py-3 text-sm font-semibold text-[#ebfbff] disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0c151d]/80 p-4 backdrop-blur-sm sm:items-center">
          <div className="glass-card w-full max-w-lg space-y-4 rounded-2xl p-5 sm:p-6">
            <h3 className="text-lg font-bold text-[#ebfbff]">
              Delete Account · {deleteTarget.employeeName}
            </h3>
            <p className="text-sm text-[#ff4d4f]/80">
              This soft-deletes the account immediately. The profile stays in Neon
              for 90 days, then auto-purges. HR, payslip, audit, and approval
              history are retained. Enter your Super Admin PIN to confirm.
            </p>
            <label className="block">
              <span className="text-sm text-[#ebfbff]/70">Super Admin PIN</span>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={deletePin}
                onChange={(event) =>
                  setDeletePin(normalizePinInput(event.target.value))
                }
                placeholder="Enter your 4-digit PIN"
                className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-[#ebfbff]"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeletePin("");
                }}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[#ebfbff]/20 bg-[#ebfbff]/5 px-4 py-3 text-sm font-semibold text-[#ebfbff]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deletePin.length !== 4) {
                    setError("Enter your 4-digit Super Admin PIN.");
                    return;
                  }
                  void runAction(deleteTarget, "deleteAccount", {
                    confirmPin: deletePin,
                  });
                }}
                disabled={busyId === deleteTarget.id}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[#ff4d4f]/40 bg-[#ff4d4f]/10 px-4 py-3 text-sm font-semibold text-[#ebfbff] disabled:opacity-40"
              >
                Delete Account
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

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-sm text-[#ebfbff]/70">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-[#ebfbff]"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
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
