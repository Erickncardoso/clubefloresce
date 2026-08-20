import multer from "multer";
import path from "path";

const storage = multer.memoryStorage();

export const bellaUpload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isImage =
      /^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.mimetype) ||
      [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext);
    const isPdf = file.mimetype === "application/pdf" || ext === ".pdf";
    const isAudio =
      /^audio\//i.test(file.mimetype)
      || [".m4a", ".mp3", ".wav", ".aac", ".ogg", ".webm", ".mp4"].includes(ext);

    if (isImage || isPdf || isAudio) return cb(null, true);
    cb(new Error("Envie uma imagem (JPG, PNG, WEBP), PDF ou áudio (M4A, MP3, WAV)."));
  },
}).single("file");
