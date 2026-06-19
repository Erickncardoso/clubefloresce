import multer from "multer";
import path from "path";

const storage = multer.memoryStorage();

export const profileAvatarUpload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isImage =
      /^image\/(jpeg|jpg|png|webp|gif|heic|heif)$/i.test(file.mimetype) ||
      [".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif"].includes(ext);

    if (isImage) return cb(null, true);
    cb(new Error("Envie uma imagem (JPG, PNG ou WEBP)."));
  },
}).single("file");
