import { Request, Response } from "express";
import { EbookService } from "../services/ebook.service";

const ebookService = new EbookService();

export class EbookController {
  async getAll(req: Request, res: Response): Promise<any> {
    try {
      const ebooks = await ebookService.getAllEbooks();
      return res.json(ebooks);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  async create(req: Request, res: Response): Promise<any> {
    try {
      const ebook = await ebookService.createEbook(req.body);
      return res.status(201).json(ebook);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async update(req: Request, res: Response): Promise<any> {
    try {
      const ebook = await ebookService.updateEbook(req.params.id, req.body);
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
