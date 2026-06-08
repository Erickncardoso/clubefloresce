import { PrismaClient, Post, Comment } from "@prisma/client";

const prisma = new PrismaClient();

export class PostRepository {
  async findAllPatientCommunity(userId?: string) {
    const posts = await prisma.post.findMany({
      where: { author: { role: "PACIENTE" } },
      include: {
        author: { select: { id: true, name: true, avatar: true, role: true } },
        comments: {
          where: { author: { role: "PACIENTE" } },
          include: { author: { select: { id: true, name: true, avatar: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
        ...(userId
          ? { likedBy: { where: { id: userId }, select: { id: true } } }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return posts.map(({ likedBy, ...post }) => ({
      ...post,
      likedByMe: userId ? (likedBy?.length ?? 0) > 0 : false,
      likes: post.likesCount,
    }));
  }

  async findById(id: string) {
    return prisma.post.findUnique({
      where: { id },
      include: { author: { select: { id: true, role: true } } },
    });
  }

  async delete(id: string) {
    return prisma.post.delete({ where: { id } });
  }

  async create(data: any): Promise<Post> {
    return prisma.post.create({
      data,
    });
  }

  async createComment(data: any): Promise<Comment> {
    return prisma.comment.create({
      data,
    });
  }

  async togglePostLike(userId: string, postId: string) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { likedBy: { where: { id: userId } } },
    });

    if (!post) throw new Error("Publicação não encontrada.");

    const isLiked = post.likedBy.length > 0;

    const updated = await prisma.post.update({
      where: { id: postId },
      data: isLiked
        ? {
            likesCount: { decrement: 1 },
            likedBy: { disconnect: { id: userId } },
          }
        : {
            likesCount: { increment: 1 },
            likedBy: { connect: { id: userId } },
          },
      include: {
        likedBy: { where: { id: userId }, select: { id: true } },
      },
    });

    return {
      likes: updated.likesCount,
      likedByMe: updated.likedBy.length > 0,
    };
  }
}
