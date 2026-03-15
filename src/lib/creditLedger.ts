import { prisma } from "@/lib/prisma";

export type CreditTransactionType =
  | "connect"
  | "connect_earned"
  | "message"
  | "sexter_session"
  | "sexter_extend"
  | "sexter_earned"
  | "signup_bonus";

/**
 * Record a single credit transaction (client spend or companion earn).
 */
export async function recordCreditTransaction(params: {
  userId: string;
  amount: number;
  type: CreditTransactionType;
  referenceType?: "booking" | "sexter_session";
  referenceId?: string;
  relatedUserId?: string;
}) {
  await prisma.creditTransaction.create({
    data: {
      userId: params.userId,
      amount: params.amount,
      type: params.type,
      referenceType: params.referenceType ?? null,
      referenceId: params.referenceId ?? null,
      relatedUserId: params.relatedUserId ?? null,
    },
  });
}

/**
 * Record client spend and optionally companion earn (e.g. for sexter).
 * Companion userId is looked up from escortId.
 */
export async function recordClientSpendAndCompanionEarn(params: {
  clientUserId: string;
  escortId: string;
  amount: number;
  type: "sexter_session" | "sexter_extend";
  sexterSessionId: string;
}) {
  const escort = await prisma.escortProfile.findUnique({
    where: { id: params.escortId },
    select: { userId: true },
  });
  const escortUserId = escort?.userId ?? null;

  await prisma.creditTransaction.createMany({
    data: [
      {
        userId: params.clientUserId,
        amount: -params.amount,
        type: params.type,
        referenceType: "sexter_session",
        referenceId: params.sexterSessionId,
        relatedUserId: escortUserId,
      },
      ...(escortUserId
        ? [
            {
              userId: escortUserId,
              amount: params.amount,
              type: "sexter_earned" as const,
              referenceType: "sexter_session" as const,
              referenceId: params.sexterSessionId,
              relatedUserId: params.clientUserId,
            },
          ]
        : []),
    ],
  });
}
