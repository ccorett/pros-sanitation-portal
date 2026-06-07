import type { Policy, PolicyStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const POLICY_STATUS_LABELS: Record<PolicyStatus, string> = {
  ACTIVE: "Active",
  DRAFT: "Draft",
  ARCHIVED: "Archived",
};

export type PolicyDto = {
  id: string;
  title: string;
  body: string;
  category: string;
  version: string;
  effectiveDate: string;
  acknowledged: boolean;
  acknowledgedAt: string | null;
};

function serializePolicy(
  policy: Policy,
  acknowledgement?: { acknowledgedAt: Date } | null,
): PolicyDto {
  return {
    id: policy.id,
    title: policy.title,
    body: policy.body,
    category: policy.category,
    version: policy.version,
    effectiveDate: policy.effectiveDate.toISOString().slice(0, 10),
    acknowledged: Boolean(acknowledgement),
    acknowledgedAt: acknowledgement?.acknowledgedAt.toISOString() ?? null,
  };
}

export async function listPoliciesForEmployee(
  employeeId: string,
): Promise<PolicyDto[]> {
  const [policies, acknowledgements] = await Promise.all([
    prisma.policy.findMany({
      where: { status: "ACTIVE" },
      orderBy: { effectiveDate: "desc" },
    }),
    prisma.policyAcknowledgement.findMany({
      where: { employeeId },
      select: { policyId: true, acknowledgedAt: true },
    }),
  ]);

  const ackByPolicy = new Map(
    acknowledgements.map((row) => [row.policyId, row]),
  );

  return policies.map((policy) =>
    serializePolicy(policy, ackByPolicy.get(policy.id)),
  );
}

export async function acknowledgePolicy(
  employeeId: string,
  policyId: string,
): Promise<PolicyDto> {
  const policy = await prisma.policy.findFirst({
    where: { id: policyId, status: "ACTIVE" },
  });
  if (!policy) {
    throw new Error("Policy not found.");
  }

  await prisma.policyAcknowledgement.upsert({
    where: {
      employeeId_policyId: { employeeId, policyId },
    },
    create: { employeeId, policyId },
    update: { acknowledgedAt: new Date() },
  });

  const acknowledgement = await prisma.policyAcknowledgement.findUnique({
    where: { employeeId_policyId: { employeeId, policyId } },
  });

  return serializePolicy(policy, acknowledgement ?? undefined);
}

export type AdminPolicyDto = {
  id: string;
  title: string;
  body: string;
  category: string;
  version: string;
  status: PolicyStatus;
  statusLabel: string;
  effectiveDate: string;
  createdAt: string;
  updatedAt: string;
};

export function serializeAdminPolicy(policy: Policy): AdminPolicyDto {
  return {
    id: policy.id,
    title: policy.title,
    body: policy.body,
    category: policy.category,
    version: policy.version,
    status: policy.status,
    statusLabel: POLICY_STATUS_LABELS[policy.status],
    effectiveDate: policy.effectiveDate.toISOString().slice(0, 10),
    createdAt: policy.createdAt.toISOString(),
    updatedAt: policy.updatedAt.toISOString(),
  };
}

export async function listPoliciesForAdmin(): Promise<AdminPolicyDto[]> {
  const policies = await prisma.policy.findMany({
    where: { status: { in: ["ACTIVE", "DRAFT", "ARCHIVED"] } },
    orderBy: [{ status: "asc" }, { effectiveDate: "desc" }],
  });
  return policies.map(serializeAdminPolicy);
}

export async function countActivePolicies(): Promise<number> {
  return prisma.policy.count({ where: { status: "ACTIVE" } });
}

export type CreatePolicyInput = {
  title: string;
  body: string;
  category: string;
  status: PolicyStatus;
  effectiveDate: string;
};

export async function createPolicy(input: CreatePolicyInput): Promise<AdminPolicyDto> {
  const policy = await prisma.policy.create({
    data: {
      title: input.title.trim(),
      body: input.body.trim(),
      category: input.category.trim(),
      version: "1.0",
      status: input.status,
      effectiveDate: new Date(`${input.effectiveDate}T12:00:00.000Z`),
    },
  });
  return serializeAdminPolicy(policy);
}

export type UpdatePolicyInput = {
  title?: string;
  body?: string;
  category?: string;
  status?: PolicyStatus;
  effectiveDate?: string;
};

export async function updatePolicy(
  id: string,
  input: UpdatePolicyInput,
): Promise<AdminPolicyDto> {
  const existing = await prisma.policy.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Policy not found.");
  }

  const bodyChanged =
    input.body !== undefined && input.body.trim() !== existing.body.trim();

  const policy = await prisma.policy.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.body !== undefined ? { body: input.body.trim() } : {}),
      ...(input.category !== undefined ? { category: input.category.trim() } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.effectiveDate !== undefined
        ? { effectiveDate: new Date(`${input.effectiveDate}T12:00:00.000Z`) }
        : {}),
      ...(bodyChanged
        ? {
            version: bumpPolicyVersion(existing.version),
          }
        : {}),
    },
  });
  return serializeAdminPolicy(policy);
}

function bumpPolicyVersion(version: string): string {
  const match = version.trim().match(/^(\d+)\.(\d+)$/);
  if (!match) {
    return "1.0";
  }

  const major = Number(match[1]);
  const minor = Number(match[2]) + 1;
  return `${major}.${minor}`;
}

export async function archivePolicy(id: string): Promise<AdminPolicyDto> {
  const policy = await prisma.policy.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });
  return serializeAdminPolicy(policy);
}

/** @deprecated Use archivePolicy — kept for route compatibility. */
export async function deletePolicy(id: string): Promise<void> {
  await archivePolicy(id);
}

export async function countUnacknowledgedPolicies(
  employeeId: string,
): Promise<number> {
  const [activePolicies, acknowledged] = await Promise.all([
    prisma.policy.count({ where: { status: "ACTIVE" } }),
    prisma.policyAcknowledgement.count({
      where: {
        employeeId,
        policy: { status: "ACTIVE" },
      },
    }),
  ]);
  return Math.max(0, activePolicies - acknowledged);
}
