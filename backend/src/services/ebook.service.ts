import { EbookRepository } from "../repositories/ebook.repository";
import { Ebook } from "@prisma/client";

const ebookRepository = new EbookRepository();

export class EbookService {
  async getAllEbooks(): Promise<Ebook[]> {
    return ebookRepository.findAll();
  }

  async getEbookById(id: string): Promise<Ebook | null> {
    return ebookRepository.findById(id);
  }

  async createEbook(data: any): Promise<Ebook> {
    return ebookRepository.create(data);
  }

  async deleteEbook(id: string): Promise<Ebook> {
    return ebookRepository.delete(id);
  }
}
