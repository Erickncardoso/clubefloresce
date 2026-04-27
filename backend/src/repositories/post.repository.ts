import { PrismaClient, Post, Comment } from "@prisma/client";

const prisma = new PrismaClient();

export class PostRepository {
  async findAll(): Promise<Post[]> {
    return prisma.post.findMany({
      include: { author: { select: { name: true, avatar: true } }, comments: { include: { author: { select: { name: true, avatar: true } } } } },
      orderBy: { createdAt: "desc" },
    });
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
}
