import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import { cloudinaryUpload } from "../utils/cloudinary";

const MB = 1024 * 1024;
const VIDEO_UPLOAD_MAX_SIZE_MB = Number(process.env.VIDEO_UPLOAD_MAX_SIZE_MB || 2048);
const VIDEO_UPLOAD_MAX_SIZE_BYTES = VIDEO_UPLOAD_MAX_SIZE_MB * MB;

const storage = multer.memoryStorage();

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
  limits: { fileSize: VIDEO_UPLOAD_MAX_SIZE_BYTES },
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
  // Upload de imagem -> Cloudinary
  async handleUpload(req: Request, res: Response): Promise<any> {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado." });
      }

      console.log(`[UploadController] Iniciando upload de imagem para Cloudinary: ${req.file.originalname}`);
      
      // Upload para Cloudinary
      const cloudinaryUrl = await cloudinaryUpload(req.file.buffer, "clube-image-uploads", {
        resourceType: "image",
        fileSizeBytes: req.file.size,
      });

      return res.json({ 
        url: cloudinaryUrl, 
        fileName: req.file.originalname 
      });
    } catch (error: any) {
      console.error("[UploadController] Falha ao enviar imagem para Cloudinary:", error);
      return res.status(503).json({
        message: "Falha ao enviar imagem para o Cloudinary. Verifique as variáveis CLOUDINARY_* no ambiente.",
      });
    }
  }

  // Upload de vídeo -> Cloudinary
  async handleVideoUpload(req: Request, res: Response): Promise<any> {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum vídeo enviado." });
      }

      const fileSizeMB = (req.file.size / (1024 * 1024)).toFixed(2);
      console.log(`[UploadController] Iniciando upload de vídeo para Cloudinary: ${req.file.originalname} (${fileSizeMB}MB)`);

      const cloudinaryUrl = await cloudinaryUpload(req.file.buffer, "clube-video-lessons", {
        resourceType: "video",
        fileSizeBytes: req.file.size,
      });

      return res.json({ 
        url: cloudinaryUrl, 
        fileName: req.file.originalname, 
        sizeMB: fileSizeMB 
      });
    } catch (error: any) {
      console.error("[UploadController] Falha ao enviar vídeo para Cloudinary:", error);
      return res.status(503).json({
        message: "Falha ao enviar vídeo para o Cloudinary. Verifique as variáveis CLOUDINARY_* no ambiente.",
      });
    }
  }

  // Upload de Documentos -> Cloudinary
  async handleFileUpload(req: Request, res: Response): Promise<any> {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado." });
      }

      const fileSizeMB = (req.file.size / (1024 * 1024)).toFixed(2);
      console.log(`[UploadController] Iniciando upload de documento para Cloudinary: ${req.file.originalname} (${fileSizeMB}MB)`);

      // Upload para Cloudinary com resource_type auto/raw
      const cloudinaryUrl = await cloudinaryUpload(req.file.buffer, "clube-documents", {
        resourceType: "raw",
        fileSizeBytes: req.file.size,
      });

      return res.json({ 
        url: cloudinaryUrl, 
        fileName: req.file.originalname, 
        sizeMB: fileSizeMB 
      });
    } catch (error: any) {
      console.error("[UploadController] Falha ao enviar documento para Cloudinary:", error);
      return res.status(503).json({
        message: "Falha ao enviar arquivo para o Cloudinary. Verifique as variáveis CLOUDINARY_* no ambiente.",
      });
    }
  }
}
