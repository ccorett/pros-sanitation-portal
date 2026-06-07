"use client";

import { Button } from "@/components/ui/Button";
import { authInputClassName, authLabelClassName } from "@/lib/auth-form-styles";
import { formatDisplayDate } from "@/lib/hr-mock-data";
import type { AdminPolicyDto } from "@/lib/policy-service";
import type { PolicyStatus } from "@prisma/client";
import { useCallback, useEffect, useState } from "react";

const STATUS_OPTIONS: { value: PolicyStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "DRAFT", label: "Draft" },
  { value: "ARCHIVED", label: "Archived" },
];

function statusBadgeClass(status: PolicyStatus): string {
  switch (status) {
    case "ACTIVE":
      return "border-[#6cc801]/30 bg-[#6cc801]/10 text-[#6cc801]";
    case "DRAFT":
      return "border-[#00c6ff]/30 bg-[#00c6ff]/10 text-[#00c6ff]";
    case "ARCHIVED":
      return "border-[#ebfbff]/20 bg-[#ebfbff]/5 text-[#ebfbff]/55";
  }
}

type PolicyFormState = {
  title: string;
  category: string;
  body: string;
  effectiveDate: string;
  status: PolicyStatus;
};

const emptyForm = (): PolicyFormState => ({
  title: "",
  category: "",
  body: "",
  effectiveDate: new Date().toISOString().slice(0, 10),
  status: "ACTIVE",
});

export function AdminPoliciesSection() {
  const [policies, setPolicies] = useState<AdminPolicyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<PolicyFormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PolicyFormState>(emptyForm);
  const [savingEdit, setSavingEdit] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const loadPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/policies");
      if (!response.ok) {
        throw new Error("Unable to load policies.");
      }
      const data = (await response.json()) as { policies: AdminPolicyDto[] };
      setPolicies(data.policies);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to load policies.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPolicies();
  }, [loadPolicies]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to create policy.");
      }
      setCreateForm(emptyForm());
      setMessage("Policy saved.");
      await loadPolicies();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to create policy.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(policy: AdminPolicyDto) {
    setEditingId(policy.id);
    setEditForm({
      title: policy.title,
      category: policy.category,
      body: policy.body,
      effectiveDate: policy.effectiveDate,
      status: policy.status,
    });
    setMessage(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyForm());
  }

  async function handleSaveEdit(id: string) {
    setSavingEdit(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/policies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update policy.");
      }
      setEditingId(null);
      setMessage("Policy updated.");
      await loadPolicies();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to update policy.",
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleArchive(id: string) {
    setArchivingId(id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/policies/${id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to archive policy.");
      }
      if (editingId === id) {
        cancelEdit();
      }
      setMessage("Policy archived and hidden from staff view.");
      await loadPolicies();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to archive policy.",
      );
    } finally {
      setArchivingId(null);
    }
  }

  function renderFormFields(
    form: PolicyFormState,
    onChange: (next: PolicyFormState) => void,
    idPrefix: string,
  ) {
    return (
      <>
        <label className="block">
          <span className={authLabelClassName}>Title</span>
          <input
            id={`${idPrefix}-title`}
            value={form.title}
            onChange={(e) => onChange({ ...form, title: e.target.value })}
            className={`${authInputClassName} mt-2`}
            required
          />
        </label>
        <label className="block">
          <span className={authLabelClassName}>Category</span>
          <input
            id={`${idPrefix}-category`}
            value={form.category}
            onChange={(e) => onChange({ ...form, category: e.target.value })}
            className={`${authInputClassName} mt-2`}
            placeholder="e.g. Safety, HR, Operations"
            required
          />
        </label>
        <label className="block">
          <span className={authLabelClassName}>Content</span>
          <textarea
            id={`${idPrefix}-body`}
            value={form.body}
            onChange={(e) => onChange({ ...form, body: e.target.value })}
            rows={5}
            className={`${authInputClassName} mt-2`}
            required
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={authLabelClassName}>Effective date</span>
            <input
              id={`${idPrefix}-effective-date`}
              type="date"
              value={form.effectiveDate}
              onChange={(e) =>
                onChange({ ...form, effectiveDate: e.target.value })
              }
              className={`${authInputClassName} mt-2`}
              required
            />
          </label>
          <label className="block">
            <span className={authLabelClassName}>Status</span>
            <select
              id={`${idPrefix}-status`}
              value={form.status}
              onChange={(e) =>
                onChange({
                  ...form,
                  status: e.target.value as PolicyStatus,
                })
              }
              className={`${authInputClassName} mt-2`}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleCreate}
        className="glass-card space-y-4 rounded-2xl p-5 sm:p-6"
      >
        <h2 className="text-lg font-bold text-[#ebfbff]">Add Policy</h2>
        {renderFormFields(createForm, setCreateForm, "create")}
        <Button type="submit" disabled={submitting} className="min-h-[48px]">
          {submitting ? "Saving…" : "Add Policy"}
        </Button>
      </form>

      {message ? (
        <p className="rounded-xl border border-[#6cc801]/30 bg-[#6cc801]/10 px-4 py-3 text-sm text-[#6cc801]">
          {message}
        </p>
      ) : null}

      {loading ? (
        <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
          Loading policies…
        </div>
      ) : policies.length === 0 ? (
        <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
          No policies yet. Add a policy above to publish it for staff.
        </div>
      ) : (
        <div className="space-y-4">
          {policies.map((policy) => (
            <article key={policy.id} className="glass-card rounded-2xl p-5 sm:p-6">
              {editingId === policy.id ? (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-[#ebfbff]">Edit Policy</h3>
                  {renderFormFields(editForm, setEditForm, `edit-${policy.id}`)}
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      disabled={savingEdit}
                      className="min-h-[44px]"
                      onClick={() => void handleSaveEdit(policy.id)}
                    >
                      {savingEdit ? "Saving…" : "Save Changes"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-[44px]"
                      onClick={cancelEdit}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-[#ebfbff]">
                          {policy.title}
                        </h3>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(policy.status)}`}
                        >
                          {policy.statusLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#ebfbff]/45">
                        {policy.category} · v{policy.version} · Effective{" "}
                        {formatDisplayDate(policy.effectiveDate)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-[44px] text-xs"
                        onClick={() => startEdit(policy)}
                      >
                        Edit
                      </Button>
                      {policy.status !== "ARCHIVED" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-[44px] text-xs"
                          disabled={archivingId === policy.id}
                          onClick={() => void handleArchive(policy.id)}
                        >
                          {archivingId === policy.id ? "Archiving…" : "Archive"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap text-sm text-[#ebfbff]/70">
                    {policy.body}
                  </p>
                </>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
