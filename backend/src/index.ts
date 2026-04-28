import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import multer from "multer";
import authRoutes from "./routes/auth.routes";
import courseRoutes from "./routes/course.routes";
import ebookRoutes from "./routes/ebook.routes";
import postRoutes from "./routes/post.routes";
import userRoutes from "./routes/user.routes";
import financialRoutes from "./routes/financial.routes";
import uploadRoutes from "./routes/upload.routes";
import whatsappRoutes from "./routes/whatsapp.routes";

dotenv.config();

// UTF-8 encoding para console no Windows, quando o stream suporta leitura.
if (typeof (process.stdout as any).setEncoding === "function") {
  (process.stdout as any).setEncoding("utf8");
}
if (typeof (process.stderr as any).setEncoding === "function") {
  (process.stderr as any).setEncoding("utf8");
}

const app = express();
const PORT = process.env.PORT || 3001;

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // CORS liberado para qualquer origem para evitar bloqueios entre frontend e backend em domínios distintos.
    callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Middlewares
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Middleware para diagnosticar requests (Logs)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Servir arquivos estáticos (imagens salvas no servidor Coolify)
app.use("/public", express.static(path.join(__dirname, "../public")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/ebooks", ebookRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);
app.use("/api/financial", financialRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/whatsapp", whatsappRoutes);

// Basic Route for testing
app.get("/", (req, res) => {
  res.json({ message: "Clube Nutricional API is running.", version: "1.0.0" });
});

// Tratamento centralizado para erros de upload (Multer).
app.use((err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      const uploadMaxVideoSizeMb = Number(process.env.VIDEO_UPLOAD_MAX_SIZE_MB || 2048);
      const isVideoUpload = String(req?.originalUrl || "").includes("/api/upload/video");
      const message = isVideoUpload
        ? `Arquivo de vídeo muito grande. Limite atual: ${uploadMaxVideoSizeMb}MB.`
        : "Arquivo muito grande. Limite de 100MB para imagens.";
      return res.status(413).json({ message });
    }
    return res.status(400).json({ message: err.message || "Erro no upload do arquivo." });
  }
  return next(err);
});

// App initialization
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
