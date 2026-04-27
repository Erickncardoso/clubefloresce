import { Router } from "express";
import { UploadController, upload, uploadVideo, uploadFile } from "../controllers/upload.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
const uploadController = new UploadController();

// Upload de IMAGEM (thumbnail, capa, etc.)
router.post(
  "/",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  upload.single("file"),
  (req, res) => uploadController.handleUpload(req, res)
);

// Upload de VÍDEO (aulas)
router.post(
  "/video",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  uploadVideo.single("file"),
  (req, res) => uploadController.handleVideoUpload(req, res)
);

// Upload de DOCUMENTO (ebooks, materiais)
router.post(
  "/file",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  uploadFile.single("file"),
  (req, res) => uploadController.handleFileUpload(req, res)
);

export default router;
