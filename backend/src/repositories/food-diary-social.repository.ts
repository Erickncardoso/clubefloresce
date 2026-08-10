import { prisma } from "../lib/prisma";

type CommentPreview = {
  id: string;
  content: string;
  createdAt: Date;
  entryId: string;
  author: { id: string; name: string; avatar: string | null };
};

export class FoodDiarySocialRepository {
  async assertEntryWithImage(entryId: string) {
    return prisma.foodDiaryEntry.findFirst({
      where: { id: entryId, imageUrl: { not: null }, NOT: { imageUrl: "" } },
      select: { id: true },
    });
  }

  async findLike(entryId: string, userId: string) {
    return prisma.foodDiaryLike.findUnique({
      where: { entryId_userId: { entryId, userId } },
    });
  }

  async createLike(entryId: string, userId: string) {
    return prisma.foodDiaryLike.create({ data: { entryId, userId } });
  }

  async deleteLike(entryId: string, userId: string) {
    return prisma.foodDiaryLike.delete({
      where: { entryId_userId: { entryId, userId } },
    });
  }

  async countLikes(entryId: string) {
    return prisma.foodDiaryLike.count({ where: { entryId } });
  }

  async listComments(entryId: string) {
    return prisma.foodDiaryComment.findMany({
      where: { entryId },
      orderBy: { createdAt: "asc" },
      include: {
        author: { select: { id: true, name: true, avatar: true, role: true } },
      },
    });
  }

  async createComment(entryId: string, authorId: string, content: string) {
    return prisma.foodDiaryComment.create({
      data: { entryId, authorId, content },
      include: {
        author: { select: { id: true, name: true, avatar: true, role: true } },
      },
    });
  }

  async findCommentById(commentId: string) {
    return prisma.foodDiaryComment.findUnique({
      where: { id: commentId },
      include: {
        author: { select: { id: true, name: true, avatar: true, role: true } },
      },
    });
  }

  async updateComment(commentId: string, content: string) {
    return prisma.foodDiaryComment.update({
      where: { id: commentId },
      data: { content },
      include: {
        author: { select: { id: true, name: true, avatar: true, role: true } },
      },
    });
  }

  async deleteComment(commentId: string) {
    return prisma.foodDiaryComment.delete({ where: { id: commentId } });
  }

  async countsForEntries(entryIds: string[], viewerId: string) {
    if (!entryIds.length) {
      return {
        likeCounts: new Map<string, number>(),
        commentCounts: new Map<string, number>(),
        likedIds: new Set<string>(),
        previews: new Map<string, CommentPreview[]>(),
      };
    }

    const [likesGrouped, commentsGrouped, myLikes, recentComments] = await Promise.all([
      prisma.foodDiaryLike.groupBy({
        by: ["entryId"],
        where: { entryId: { in: entryIds } },
        _count: { _all: true },
      }),
      prisma.foodDiaryComment.groupBy({
        by: ["entryId"],
        where: { entryId: { in: entryIds } },
        _count: { _all: true },
      }),
      prisma.foodDiaryLike.findMany({
        where: { entryId: { in: entryIds }, userId: viewerId },
        select: { entryId: true },
      }),
      prisma.foodDiaryComment.findMany({
        where: { entryId: { in: entryIds } },
        orderBy: { createdAt: "desc" },
        take: entryIds.length * 3,
        include: { author: { select: { id: true, name: true, avatar: true } } },
      }),
    ]);

    const likeCounts = new Map(likesGrouped.map((r) => [r.entryId, r._count._all]));
    const commentCounts = new Map(commentsGrouped.map((r) => [r.entryId, r._count._all]));
    const likedIds = new Set(myLikes.map((l) => l.entryId));
    const previews = new Map<string, CommentPreview[]>();

    for (const c of recentComments) {
      const list = previews.get(c.entryId) || [];
      if (list.length < 2) {
        list.push(c);
        previews.set(c.entryId, list);
      }
    }
    for (const [k, list] of previews) {
      previews.set(k, [...list].reverse());
    }

    return { likeCounts, commentCounts, likedIds, previews };
  }
}
