import { prisma } from "../lib/prisma";
import type { InstagramQueueItem, InstagramQueueKind, Prisma } from "@prisma/client";

export class InstagramQueueRepository {
  async enqueue(data: {
    userId: string;
    automationId?: string | null;
    kind: InstagramQueueKind;
    recipientId?: string | null;
    commentId?: string | null;
    payload: Prisma.InputJsonValue;
    scheduledFor?: Date;
  }): Promise<InstagramQueueItem> {
    return prisma.instagramQueueItem.create({
      data: {
        userId: data.userId,
        automationId: data.automationId ?? null,
        kind: data.kind,
        recipientId: data.recipientId ?? null,
        commentId: data.commentId ?? null,
        payload: data.payload,
        scheduledFor: data.scheduledFor ?? new Date(),
      },
    });
  }

  /** Evita responder duas vezes o mesmo comentário com o mesmo tipo de resposta. */
  async existsForComment(commentId: string, kind: InstagramQueueKind): Promise<boolean> {
    const found = await prisma.instagramQueueItem.findFirst({
      where: { commentId, kind },
      select: { id: true },
    });
    return Boolean(found);
  }

  /**
   * Trava atômica: FOR UPDATE SKIP LOCKED — vários drains simultâneos
   * (setInterval + webhook) nunca pegam o mesmo item.
   */
  async claimBatch(claimedBy: string, limit: number): Promise<InstagramQueueItem[]> {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      UPDATE "InstagramQueueItem"
      SET status = 'sending', "claimedAt" = now(), "claimedBy" = ${claimedBy}, "updatedAt" = now()
      WHERE id IN (
        SELECT id FROM "InstagramQueueItem"
        WHERE status = 'pending' AND "scheduledFor" <= now()
        ORDER BY "scheduledFor" ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id
    `;
    if (!rows.length) return [];
    return prisma.instagramQueueItem.findMany({
      where: { id: { in: rows.map((r) => r.id) } },
      orderBy: { scheduledFor: "asc" },
    });
  }

  async markSent(id: string): Promise<void> {
    await prisma.instagramQueueItem.update({
      where: { id },
      data: { status: "sent", sentAt: new Date(), lastError: null },
    });
  }

  async markFailed(id: string, error: string, attempts: number, maxAttempts: number): Promise<void> {
    const willRetry = attempts < maxAttempts;
    await prisma.instagramQueueItem.update({
      where: { id },
      data: {
        status: willRetry ? "pending" : "failed",
        attempts,
        lastError: error.slice(0, 2000),
        claimedAt: null,
        claimedBy: null,
        // backoff exponencial: 2, 4, 8 minutos
        ...(willRetry
          ? { scheduledFor: new Date(Date.now() + Math.pow(2, attempts) * 60_000) }
          : {}),
      },
    });
  }

  async markSkipped(id: string, reason: string): Promise<void> {
    await prisma.instagramQueueItem.update({
      where: { id },
      data: { status: "skipped", lastError: reason.slice(0, 2000) },
    });
  }

  /** Itens 'sending' órfãos (processo caiu no meio do envio) voltam para 'pending'. */
  async releaseStuck(olderThanMs = 5 * 60_000): Promise<number> {
    const result = await prisma.instagramQueueItem.updateMany({
      where: { status: "sending", claimedAt: { lt: new Date(Date.now() - olderThanMs) } },
      data: { status: "pending", claimedAt: null, claimedBy: null },
    });
    return result.count;
  }

  async listRecent(userId: string, limit = 50): Promise<InstagramQueueItem[]> {
    return prisma.instagramQueueItem.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}
