import { Request, Response } from "express";
import { EbookService } from "../services/ebook.service";

const ebookService = new EbookService();

export class EbookController {
  async getAll(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.user?.id;
      const ebooks = await ebookService.getAllEbooks(userId);
      return res.json(ebooks);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  async create(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.user?.id;
      const { title, description, fileUrl, thumbnail } = req.body || {};

      if (!String(title || "").trim()) {
        return res.status(400).json({ message: "Título do ebook é obrigatório." });
      }
      if (!String(fileUrl || "").trim()) {
        return res.status(400).json({ message: "Arquivo PDF é obrigatório." });
      }

      const ebook = await ebookService.createEbook({
        title: String(title).trim(),
        description: String(description || "").trim(),
        fileUrl: String(fileUrl).trim(),
        thumbnail: thumbnail ? String(thumbnail).trim() : null,
      }, userId);
      return res.status(201).json(ebook);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async update(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.user?.id;
      const ebook = await ebookService.updateEbook(req.params.id, req.body, userId);
      return res.json(ebook);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async delete(req: Request, res: Response): Promise<any> {
    try {
      await ebookService.deleteEbook(req.params.id);
      return res.status(204).send();
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }
}
