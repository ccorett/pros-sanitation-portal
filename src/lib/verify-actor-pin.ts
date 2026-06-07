import { verifyPassword } from "better-auth/crypto";
import { prisma } from "@/lib/prisma";
import { isPinValid } from "@/lib/pin";

export async function verifyActorPin(
  userId: string,
  pin: string,
): Promise<boolean> {
  if (!isPinValid(pin)) {
    return false;
  }

  const account = await prisma.account.findFirst({
    where: {
      userId,
      providerId: "credential",
    },
    select: { password: true },
  });

  if (!account?.password) {
    return false;
  }

  return verifyPassword({ password: pin, hash: account.password });
}
