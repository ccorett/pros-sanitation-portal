import type { Policy } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PolicyDto = {
  id: string;
  title: string;
  body: string;
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
    prisma.policy.findMany({ orderBy: { effectiveDate: "desc" } }),
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
  const policy = await prisma.policy.findUnique({ where: { id: policyId } });
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
  version: string;
  effectiveDate: string;
  createdAt: string;
  updatedAt: string;
};

export function serializeAdminPolicy(policy: Policy): AdminPolicyDto {
  return {
    id: policy.id,
    title: policy.title,
    body: policy.body,
    version: policy.version,
    effectiveDate: policy.effectiveDate.toISOString().slice(0, 10),
    createdAt: policy.createdAt.toISOString(),
    updatedAt: policy.updatedAt.toISOString(),
  };
}

export async function listPoliciesForAdmin(): Promise<AdminPolicyDto[]> {
  const policies = await prisma.policy.findMany({
    orderBy: { effectiveDate: "desc" },
  });
  return policies.map(serializeAdminPolicy);
}

export type CreatePolicyInput = {
  title: string;
  body: string;
  version: string;
  effectiveDate: string;
};

export async function createPolicy(input: CreatePolicyInput): Promise<AdminPolicyDto> {
  const policy = await prisma.policy.create({
    data: {
      title: input.title.trim(),
      body: input.body.trim(),
      version: input.version.trim(),
      effectiveDate: new Date(`${input.effectiveDate}T12:00:00.000Z`),
    },
  });
  return serializeAdminPolicy(policy);
}

export type UpdatePolicyInput = Partial<CreatePolicyInput>;

export async function updatePolicy(
  id: string,
  input: UpdatePolicyInput,
): Promise<AdminPolicyDto> {
  const policy = await prisma.policy.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.body !== undefined ? { body: input.body.trim() } : {}),
      ...(input.version !== undefined ? { version: input.version.trim() } : {}),
      ...(input.effectiveDate !== undefined
        ? { effectiveDate: new Date(`${input.effectiveDate}T12:00:00.000Z`) }
        : {}),
    },
  });
  return serializeAdminPolicy(policy);
}

export async function deletePolicy(id: string): Promise<void> {
  await prisma.policy.delete({ where: { id } });
}

export async function countUnacknowledgedPolicies(
  employeeId: string,
): Promise<number> {
  const [total, acknowledged] = await Promise.all([
    prisma.policy.count(),
    prisma.policyAcknowledgement.count({ where: { employeeId } }),
  ]);
  return Math.max(0, total - acknowledged);
}
