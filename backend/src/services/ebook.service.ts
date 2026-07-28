import { EbookRepository } from "../repositories/ebook.repository";
import { Ebook } from "@prisma/client";
import {
  normalizeStoredDocumentUrl,
  resolveDocumentDeliveryUrl,
} from "../utils/media/bunny-document-delivery";
import { scheduleRagDelete, scheduleRagReindex } from "./rag/rag-hooks";

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
    const payload = {
      ...data,
      ...(data.fileUrl !== undefined
        ? { fileUrl: normalizeStoredDocumentUrl(data.fileUrl) }
        : {}),
    };
    const ebook = await ebookRepository.create(payload);
    scheduleRagReindex({ type: "ebook", id: ebook.id });
    return mapEbookForClient(ebook, userId);
  }

  async updateEbook(id: string, data: any, userId?: string | null): Promise<Ebook> {
    const payload = {
      ...data,
      ...(data.fileUrl !== undefined
        ? { fileUrl: normalizeStoredDocumentUrl(data.fileUrl) }
        : {}),
    };
    const ebook = await ebookRepository.update(id, payload);
    scheduleRagReindex({ type: "ebook", id: ebook.id });
    return mapEbookForClient(ebook, userId);
  }

  async deleteEbook(id: string): Promise<Ebook> {
    scheduleRagDelete("ebook", id);
    return ebookRepository.delete(id);
  }
}
