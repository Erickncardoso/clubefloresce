import { EbookRepository } from "../repositories/ebook.repository";
import { Ebook } from "@prisma/client";
import { resolveDocumentDeliveryUrl } from "../utils/media/bunny-document-delivery";

const ebookRepository = new EbookRepository();

function mapEbookForClient(ebook: Ebook, userId?: string | null): Ebook {
  return {
    ...ebook,
    fileUrl: resolveDocumentDeliveryUrl(ebook.fileUrl, userId),
  };
}

export class EbookService {
  async getAllEbooks(userId?: string | null): Promise<Ebook[]> {
    const ebooks = await ebookRepository.findAll();
    return ebooks.map((ebook) => mapEbookForClient(ebook, userId));
  }

  async getEbookById(id: string, userId?: string | null): Promise<Ebook | null> {
    const ebook = await ebookRepository.findById(id);
    return ebook ? mapEbookForClient(ebook, userId) : null;
  }

  async createEbook(data: any, userId?: string | null): Promise<Ebook> {
    const ebook = await ebookRepository.create(data);
    return mapEbookForClient(ebook, userId);
  }

  async updateEbook(id: string, data: any, userId?: string | null): Promise<Ebook> {
    const ebook = await ebookRepository.update(id, data);
    return mapEbookForClient(ebook, userId);
  }

  async deleteEbook(id: string): Promise<Ebook> {
    return ebookRepository.delete(id);
  }
}
