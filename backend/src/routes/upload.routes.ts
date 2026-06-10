import { Router, Request, Response, NextFunction } from "express";
import { UploadController, upload, uploadVideo, uploadFile } from "../controllers/upload.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
const uploadController = new UploadController();

function handleMulterUpload(middleware: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    middleware(req, res, (err: any) => {
      if (!err) {
        next();
        return;
      }

      if (err.code === "LIMIT_FILE_SIZE") {
        const isVideo = String(req.originalUrl || "").includes("/video");
        const isDocument = String(req.originalUrl || "").includes("/file");
        const message = isVideo
          ? "Arquivo de vídeo muito grande."
          : isDocument
            ? "Documento muito grande. Limite de 50MB."
            : "Arquivo muito grande. Limite de 100MB para imagens.";
        res.status(413).json({ message });
        return;
      }

      res.status(400).json({ message: err.message || "Erro no upload do arquivo." });
    });
  };
}

// Upload de IMAGEM (thumbnail, capa, etc.)
router.post(
  "/",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  handleMulterUpload(upload.single("file")),
  (req, res) => uploadController.handleUpload(req, res)
);

// Upload de VÍDEO (aulas)
router.post(
  "/video",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  handleMulterUpload(uploadVideo.single("file")),
  (req, res) => uploadController.handleVideoUpload(req, res)
);

// Upload de DOCUMENTO (ebooks, materiais)
router.post(
  "/file",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  handleMulterUpload(uploadFile.single("file")),
  (req, res) => uploadController.handleFileUpload(req, res)
);

export default router;
