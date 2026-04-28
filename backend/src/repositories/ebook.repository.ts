import { PrismaClient, Ebook } from "@prisma/client";

const prisma = new PrismaClient();

export class EbookRepository {
  async findAll(): Promise<Ebook[]> {
    return prisma.ebook.findMany();
  }

  async findById(id: string): Promise<Ebook | null> {
    return prisma.ebook.findUnique({
      where: { id },
    });
  }

  async create(data: any): Promise<Ebook> {
    return prisma.ebook.create({
      data,
    });
  }

  async update(id: string, data: any): Promise<Ebook> {
    return prisma.ebook.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.fileUrl !== undefined ? { fileUrl: data.fileUrl } : {}),
        ...(data.thumbnail !== undefined ? { thumbnail: data.thumbnail } : {}),
      },
    });
  }

  async delete(id: string): Promise<Ebook> {
    return prisma.ebook.delete({
      where: { id },
    });
  }
}
