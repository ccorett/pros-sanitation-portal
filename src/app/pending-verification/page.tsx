import { PendingVerificationScreen } from "@/components/auth/PendingVerificationScreen";
import { requirePendingVerificationAccess } from "@/lib/require-staff-access";

export default async function PendingVerificationPage() {
  const { employee } = await requirePendingVerificationAccess();

  return <PendingVerificationScreen firstName={employee.firstName} />;
}
