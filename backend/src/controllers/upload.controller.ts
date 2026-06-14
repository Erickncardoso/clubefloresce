import { Request, Response } from "express";
import fs from "fs";
import multer from "multer";
import os from "os";
import path from "path";
import {
  cloudinaryUpload,
  cloudinaryVideoUploadFromPath,
  createVideoUploadSignature,
  isCloudinaryConfigured,
} from "../utils/cloudinary";
import {
  compressVideoToMaxSize,
  isVideoCompressionAvailable,
  VIDEO_TARGET_MAX_BYTES,
} from "../utils/video-compress";

const MB = 1024 * 1024;
const VIDEO_UPLOAD_MAX_SIZE_MB = Number(process.env.VIDEO_UPLOAD_MAX_SIZE_MB || 2048);
const VIDEO_UPLOAD_MAX_SIZE_BYTES = VIDEO_UPLOAD_MAX_SIZE_MB * MB;

const storage = multer.memoryStorage();

const videoDiskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, os.tmpdir()),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^\w.\-]+/g, "_");
    cb(null, `clube-video-${Date.now()}-${safeName}`);
  },
});

const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|avi|mkv|m4v)$/i;
const VIDEO_MIMES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
  "video/x-matroska",
  "video/m4v",
]);

const DOC_EXTENSIONS = /\.(pdf|doc|docx|epub)$/i;
const DOC_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/epub+zip",
]);

import {
  acceptByExtensionOrMime,
  hasAllowedExtension,
} from "../utils/upload-file-filter";

// ── Multer para IMAGENS ──────────────────────────────────────────
export const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /\.(jpe?g|png|webp|gif|heic|heif)$/i;
    const extname = hasAllowedExtension(file.originalname, allowedTypes);
    const mimetype = /^(image\/(jpeg|png|webp|gif|heic|heif)|application\/octet-stream)$/i.test(file.mimetype || "");
    if (extname && (mimetype || !file.mimetype)) return cb(null, true);
    cb(new Error("Apenas imagens são permitidas (jpeg, jpg, png, webp, gif)"));
  },
});

// ── Multer para VÍDEOS ──────────────────────────────────────────
export const uploadVideo = multer({
  storage: videoDiskStorage,
  limits: { fileSize: VIDEO_UPLOAD_MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (acceptByExtensionOrMime(file, {
      extensionPattern: VIDEO_EXTENSIONS,
      allowedMimes: VIDEO_MIMES,
      allowMimePrefix: "video/",
    })) {
      return cb(null, true);
    }
    cb(new Error("Formato de vídeo não suportado. Use mp4, mov, webm, avi ou mkv."));
  },
});

// ── Multer para DOCUMENTOS (PDF, etc) ──────────────────────────────────────────
export const uploadFile = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (acceptByExtensionOrMime(file, {
      extensionPattern: DOC_EXTENSIONS,
      allowedMimes: DOC_MIMES,
    })) {
      return cb(null, true);
    }
    cb(new Error("Formato de documento não suportado. Use PDF, DOC, DOCX ou EPUB."));
  },
});

async function removeTempFile(filePath?: string | null): Promise<void> {
  if (!filePath) return;
  await fs.promises.unlink(filePath).catch(() => undefined);
}

export class UploadController {
  async getVideoUploadSignature(_req: Request, res: Response): Promise<any> {
    try {
      if (!isCloudinaryConfigured()) {
        return res.status(503).json({
          message: "Cloudinary não configurado no servidor. Verifique as variáveis CLOUDINARY_*.",
        });
      }

      return res.json(createVideoUploadSignature());
    } catch (error: any) {
      console.error("[UploadController] Falha ao gerar assinatura de vídeo:", error);
      return res.status(503).json({
        message: error?.message || "Não foi possível preparar o upload de vídeo.",
      });
    }
  }

  async handleUpload(req: Request, res: Response): Promise<any> {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado." });
      }

      console.log(`[UploadController] Iniciando upload de imagem para Cloudinary: ${req.file.originalname}`);

      const cloudinaryUrl = await cloudinaryUpload(req.file.buffer, "clube-image-uploads", {
        resourceType: "image",
        fileSizeBytes: req.file.size,
        errorKind: "image",
      });

      return res.json({
        url: cloudinaryUrl,
        fileName: req.file.originalname,
      });
    } catch (error: any) {
      console.error("[UploadController] Falha ao enviar imagem para Cloudinary:", error);
      return res.status(503).json({
        message: error?.message || "Falha ao enviar imagem para o Cloudinary. Verifique as variáveis CLOUDINARY_* no ambiente.",
      });
    }
  }

  async handleVideoUpload(req: Request, res: Response): Promise<any> {
    const tempFilePath = req.file?.path || null;
    let compressedFilePath: string | null = null;

    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum vídeo enviado." });
      }

      const originalSizeMB = (req.file.size / MB).toFixed(2);
      console.log(
        `[UploadController] Vídeo recebido: ${req.file.originalname} (${originalSizeMB}MB)`,
      );

      let uploadPath = tempFilePath as string;
      let compressed = false;
      let finalBytes = req.file.size;

      if (req.file.size > VIDEO_TARGET_MAX_BYTES) {
        if (!isVideoCompressionAvailable()) {
          return res.status(503).json({
            message:
              "Vídeo acima de 100 MB e o compressor não está disponível no servidor. Instale FFmpeg ou reduza o arquivo manualmente.",
          });
        }

        const targetMB = (VIDEO_TARGET_MAX_BYTES / MB).toFixed(0);
        console.log(
          `[UploadController] Comprimindo vídeo para ~${targetMB}MB antes do Cloudinary…`,
        );

        const compression = await compressVideoToMaxSize(uploadPath, VIDEO_TARGET_MAX_BYTES);
        if (compression.wasCompressed) {
          compressed = true;
          compressedFilePath = compression.outputPath;
          uploadPath = compression.outputPath;
          finalBytes = compression.compressedBytes;
          console.log(
            `[UploadController] Compressão concluída: ${originalSizeMB}MB → ${(finalBytes / MB).toFixed(2)}MB`,
          );
        }
      }

      const finalSizeMB = (finalBytes / MB).toFixed(2);
      console.log(
        `[UploadController] Enviando vídeo para Cloudinary (${finalSizeMB}MB)…`,
      );

      const uploadResult = await cloudinaryVideoUploadFromPath(uploadPath);

      console.log(`[UploadController] Vídeo enviado com sucesso (${finalSizeMB}MB).`);

      return res.json({
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        version: uploadResult.version,
        transcriptionStatus: uploadResult.transcriptionStatus,
        fileName: req.file.originalname,
        sizeMB: finalSizeMB,
        originalSizeMB,
        compressed,
        targetMaxSizeMB: (VIDEO_TARGET_MAX_BYTES / MB).toFixed(0),
      });
    } catch (error: any) {
      console.error("[UploadController] Falha ao enviar vídeo para Cloudinary:", error);
      return res.status(503).json({
        message: error?.message || "Falha ao enviar vídeo para o Cloudinary. Verifique as variáveis CLOUDINARY_* no ambiente.",
      });
    } finally {
      await removeTempFile(tempFilePath);
      if (compressedFilePath && compressedFilePath !== tempFilePath) {
        await removeTempFile(compressedFilePath);
      }
    }
  }

  async handleFileUpload(req: Request, res: Response): Promise<any> {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado." });
      }

      const fileSizeMB = (req.file.size / (1024 * 1024)).toFixed(2);
      console.log(`[UploadController] Iniciando upload de documento para Cloudinary: ${req.file.originalname} (${fileSizeMB}MB)`);

      const cloudinaryUrl = await cloudinaryUpload(req.file.buffer, "clube-documents", {
        resourceType: "raw",
        fileSizeBytes: req.file.size,
        originalFilename: req.file.originalname,
        errorKind: "document",
      });

      return res.json({
        url: cloudinaryUrl,
        fileName: req.file.originalname,
        sizeMB: fileSizeMB,
      });
    } catch (error: any) {
      console.error("[UploadController] Falha ao enviar documento para Cloudinary:", error);
      return res.status(503).json({
        message: error?.message || "Falha ao enviar arquivo para o Cloudinary. Verifique as variáveis CLOUDINARY_* no ambiente.",
      });
    }
  }
}
