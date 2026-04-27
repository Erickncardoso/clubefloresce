import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { cloudinaryUpload } from "../utils/cloudinary";

// Diretório de upload temporário
const getUploadPath = () => {
  const uploadPath = path.join(__dirname, "../../public/uploads");
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
  return uploadPath;
};

// Configuração de armazenamento temporário (diskStorage)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, getUploadPath());
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// ── Multer para IMAGENS ──────────────────────────────────────────
export const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error("Apenas imagens são permitidas (jpeg, jpg, png, webp, gif)"));
  },
});

// ── Multer para VÍDEOS ──────────────────────────────────────────
export const uploadVideo = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|mov|webm|avi|mkv|m4v/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const allowedMimes = [
      "video/mp4",
      "video/quicktime",
      "video/webm",
      "video/x-msvideo",
      "video/x-matroska",
      "video/m4v",
      "application/octet-stream",
    ];
    const mimetype = allowedMimes.includes(file.mimetype) || extname;
    if (extname || mimetype) return cb(null, true);
    cb(new Error("Formato de vídeo não suportado. Use mp4, mov, webm, avi ou mkv."));
  },
});

// ── Multer para DOCUMENTOS (PDF, etc) ──────────────────────────────────────────
export const uploadFile = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|epub/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const allowedMimes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/epub+zip",
    ];
    const mimetype = allowedMimes.includes(file.mimetype) || extname;
    if (extname || mimetype) return cb(null, true);
    cb(new Error("Formato de documento não suportado. Use PDF, DOC, DOCX ou EPUB."));
  },
});

export class UploadController {
  private getLocalFileUrl(req: Request, fileName: string): string {
    const protocol = (req.headers["x-forwarded-proto"] as string) || req.protocol || "http";
    const host = req.get("host") || "localhost:3001";
    return `${protocol}://${host}/public/uploads/${encodeURIComponent(fileName)}`;
  }

  // Upload de imagem -> Cloudinary
  async handleUpload(req: Request, res: Response): Promise<any> {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado." });
      }

      console.log(`[UploadController] Iniciando upload de imagem para Cloudinary: ${req.file.filename}`);
      
      // Upload para Cloudinary
      const cloudinaryUrl = await cloudinaryUpload(req.file.path, "clube-image-uploads");

      // Deletar arquivo local temporário
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        console.log(`[UploadController] Arquivo temporário removido: ${req.file.path}`);
      }

      return res.json({ 
        url: cloudinaryUrl, 
        fileName: req.file.filename 
      });
    } catch (error: any) {
      if (req.file) {
        const localUrl = this.getLocalFileUrl(req, req.file.filename);
        console.warn(`[UploadController] Cloudinary indisponível para imagem. Usando fallback local: ${req.file.filename}`);
        return res.json({
          url: localUrl,
          fileName: req.file.filename,
          storage: "local-fallback",
          warning: "Cloudinary indisponível para este arquivo. Upload salvo localmente."
        });
      }
      return res.status(500).json({ message: error.message });
    }
  }

  // Upload de vídeo -> Cloudinary
  async handleVideoUpload(req: Request, res: Response): Promise<any> {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum vídeo enviado." });
      }

      const fileSizeMB = (req.file.size / (1024 * 1024)).toFixed(2);
      console.log(`[UploadController] Iniciando upload de vídeo para Cloudinary: ${req.file.filename} (${fileSizeMB}MB)`);

      const cloudinaryUrl = await cloudinaryUpload(req.file.path, "clube-video-lessons");

      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        console.log(`[UploadController] Vídeo temporário removido: ${req.file.path}`);
      }

      return res.json({ 
        url: cloudinaryUrl, 
        fileName: req.file.filename, 
        sizeMB: fileSizeMB 
      });
    } catch (error: any) {
      if (req.file) {
        const localUrl = this.getLocalFileUrl(req, req.file.filename);
        const fileSizeMB = (req.file.size / (1024 * 1024)).toFixed(2);
        console.warn(`[UploadController] Cloudinary indisponível para vídeo. Usando fallback local: ${req.file.filename}`);
        return res.json({
          url: localUrl,
          fileName: req.file.filename,
          sizeMB: fileSizeMB,
          storage: "local-fallback",
          warning: "Cloudinary indisponível para este arquivo. Upload salvo localmente."
        });
      }
      return res.status(500).json({ message: error.message });
    }
  }

  // Upload de Documentos -> Cloudinary
  async handleFileUpload(req: Request, res: Response): Promise<any> {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado." });
      }

      const fileSizeMB = (req.file.size / (1024 * 1024)).toFixed(2);
      console.log(`[UploadController] Iniciando upload de documento para Cloudinary: ${req.file.filename} (${fileSizeMB}MB)`);

      // Upload para Cloudinary com resource_type auto/raw
      const cloudinaryUrl = await cloudinaryUpload(req.file.path, "clube-documents");

      // Deletar arquivo local temporário
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        console.log(`[UploadController] Documento temporário removido: ${req.file.path}`);
      }

      return res.json({ 
        url: cloudinaryUrl, 
        fileName: req.file.originalname, 
        sizeMB: fileSizeMB 
      });
    } catch (error: any) {
      if (req.file) {
        const localUrl = this.getLocalFileUrl(req, req.file.filename);
        const fileSizeMB = (req.file.size / (1024 * 1024)).toFixed(2);
        console.warn(`[UploadController] Cloudinary indisponível para documento. Usando fallback local: ${req.file.filename}`);
        return res.json({
          url: localUrl,
          fileName: req.file.originalname,
          sizeMB: fileSizeMB,
          storage: "local-fallback",
          warning: "Cloudinary indisponível para este arquivo. Upload salvo localmente."
        });
      }
      return res.status(500).json({ message: error.message });
    }
  }
}
