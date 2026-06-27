import express from "express";
import cors from "cors";
import helmet from "helmet";
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
import checkinRoutes from "./routes/checkin.routes";
import bellaRoutes from "./routes/bella.routes";
import foodDiaryRoutes from "./routes/food-diary.routes";
import foodRoutes from "./routes/food.routes";
import mealPlanRoutes from "./routes/meal-plan.routes";
import patientRoutes from "./routes/patient.routes";
import notificationRoutes from "./routes/notification.routes";
import pushRoutes from "./routes/push.routes";
import pusherRoutes from "./routes/pusher.routes";
import patientGoalsRoutes from "./routes/patient-goals.routes";
import patientProfileRoutes from "./routes/patient-profile.routes";
import registrationRequestRoutes from "./routes/registration-request.routes";
import { prisma } from "./lib/prisma";
import { readEnv, maskSecret } from "./utils/env";
import { getAllowedCorsOrigins, isOriginAllowed } from "./utils/cors-origins";
import { isCloudinaryConfigured } from "./utils/cloudinary";
import {
  getDocumentUploadProvider,
  getVideoUploadProvider,
} from "./utils/media/media-config";
import { isBunnyStorageConfigured, isBunnyStreamConfigured } from "./utils/media/bunny-config";
import { startCheckInDispatchScheduler } from "./jobs/checkin-weekly-dispatch.job";
import { startMealReminderDispatchScheduler } from "./jobs/meal-reminder-dispatch.job";
import { startWhatsappMobilePresenceScheduler } from "./jobs/whatsapp-mobile-presence.job";
import { startWhatsappDevMessageLog } from "./jobs/whatsapp-dev-message-log.job";
import { assertJwtSecretOnBoot } from "./utils/jwt";
import { isVapidConfigured } from "./utils/vapid-config";
import { isPusherConfigured } from "./utils/pusher-config";
import { getDevTunnelWebhookUrl } from "./utils/dev-tunnel-url";
import { isBackblazeB2Configured } from "./utils/media/backblaze-config";
import {
  getEmailFromContact,
  getEmailFromNoreply,
  isResendConfigured,
} from "./utils/email-config";

dotenv.config();
assertJwtSecretOnBoot();

// UTF-8 encoding para console no Windows, quando o stream suporta leitura.
if (typeof (process.stdout as any).setEncoding === "function") {
  (process.stdout as any).setEncoding("utf8");
}
if (typeof (process.stderr as any).setEncoding === "function") {
  (process.stderr as any).setEncoding("utf8");
}

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3001;
const allowedOrigins = getAllowedCorsOrigins();

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin, allowedOrigins)) {
      callback(null, true);
      return;
    }
    console.warn("[CORS] Origem bloqueada:", origin);
    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Patient-Date",
    "X-Patient-Timezone",
  ],
  optionsSuccessStatus: 204,
};

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use((req, res, next) => {
  const safePath = req.path;
  console.log(`[${new Date().toISOString()}] ${req.method} ${safePath}`);
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
app.use("/api/checkin", checkinRoutes);
app.use("/api/bella", bellaRoutes);
app.use("/api/food-diary", foodDiaryRoutes);
app.use("/api/foods", foodRoutes);
app.use("/api/meal-plan", mealPlanRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/patient-goals", patientGoalsRoutes);
app.use("/api/patient-profile", patientProfileRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/push", pushRoutes);
app.use("/api/pusher", pusherRoutes);
app.use("/api/registration-requests", registrationRequestRoutes);

// Basic Route for testing
app.get("/", (req, res) => {
  res.json({ message: "Clube Nutricional API is running.", version: "1.0.0" });
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
  });
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

const UPLOAD_SERVER_TIMEOUT_MS = Number(process.env.UPLOAD_SERVER_TIMEOUT_MS || 30 * 60 * 1000);

// App initialization
const server = app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT} (0.0.0.0)`);
  console.log(`[CORS] Origens permitidas: ${allowedOrigins.join(", ")}`);
  const openaiKey = readEnv("OPENAI_API_KEY");
  if (openaiKey) {
    console.log(`[Bella] OpenAI configurada (${maskSecret(openaiKey)}) — chat, imagem e PDF ativos.`);
  } else {
    console.warn("[Bella] OPENAI_API_KEY ausente — Bella usará respostas locais limitadas.");
    console.warn("[Bella] Coolify: adicione OPENAI_API_KEY no serviço do BACKEND (apiclube), não no app cliente.");
  }
  if (isVapidConfigured()) {
    console.log("[Push] Web Push (VAPID) configurado — notificações push ativas.");
  } else {
    console.warn("[Push] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY ausentes — push desativado.");
  }
  if (isPusherConfigured()) {
    console.log("[Pusher] Channels configurado — WhatsApp tempo real ativo.");
  } else {
    console.warn("[Pusher] PUSHER_* ausente — WhatsApp usará apenas polling.");
  }
  const tunnelWebhook = getDevTunnelWebhookUrl();
  if (tunnelWebhook) {
    console.log(`[Tunnel] Cloudflare ativo — webhook: ${tunnelWebhook}`);
  }
  if (isBackblazeB2Configured()) {
    console.log("[WhatsApp Media] Backblaze B2 ativo — mídias do chat serão arquivadas.");
  }
  if (isResendConfigured()) {
    console.log(
      `[Email] Resend configurado — contato: ${getEmailFromContact()} | noreply: ${getEmailFromNoreply()}`
    );
  } else {
    console.warn("[Email] RESEND_API_KEY ausente — envios de e-mail desativados.");
  }
  const videoProvider = getVideoUploadProvider();
  const documentProvider = getDocumentUploadProvider();

  if (videoProvider === "bunny") {
    if (isBunnyStreamConfigured()) {
      console.log(`[Upload] Vídeo via Bunny Stream (CDN: ${process.env.BUNNY_STREAM_CDN_HOSTNAME}).`);
    } else {
      console.warn("[Upload] MEDIA_VIDEO_PROVIDER=bunny, mas BUNNY_STREAM_* está incompleto.");
    }
  } else if (isCloudinaryConfigured()) {
    console.log(`[Upload] Vídeo via Cloudinary (cloud: ${process.env.CLOUDINARY_CLOUD_NAME}).`);
  } else {
    console.warn("[Upload] Vídeo indisponível — configure Cloudinary ou Bunny Stream.");
  }

  if (documentProvider === "bunny") {
    if (isBunnyStorageConfigured()) {
      const deliveryMode = process.env.BUNNY_STORAGE_USE_CDN === "true" ? "CDN" : "proxy assinado via API";
      console.log(`[Upload] Documentos via Bunny Storage (${deliveryMode}).`);
    } else {
      console.warn("[Upload] MEDIA_DOCUMENT_PROVIDER=bunny, mas BUNNY_STORAGE_* está incompleto.");
    }
  } else if (isCloudinaryConfigured()) {
    console.log(`[Upload] Documentos via Cloudinary (cloud: ${process.env.CLOUDINARY_CLOUD_NAME}).`);
  } else {
    console.warn("[Upload] Documentos indisponíveis — configure Cloudinary ou Bunny Storage.");
  }

  if (!isCloudinaryConfigured()) {
    console.warn("[Upload] CLOUDINARY_* ausente — uploads de imagem (capas/thumbs) falharão.");
  }

  if (process.env.REDIS_URL) {
    const ttlHours = (Number(process.env.BUNNY_METADATA_CACHE_TTL_SECONDS || 6 * 60 * 60) / 3600).toFixed(1);
    console.log(`[Cache] Redis configurado — metadados Bunny Stream em cache (~${ttlHours}h).`);
  } else if (getVideoUploadProvider() === "bunny") {
    console.log("[Cache] REDIS_URL ausente — metadados Bunny Stream buscados na API a cada requisição.");
  }

  startCheckInDispatchScheduler();
  console.log("[CheckIn] Agendador ativo — disparo automático às sextas 11h (Brasília).");
  startMealReminderDispatchScheduler();
  console.log("[MealReminder] Agendador ativo — lembretes nos horários do plano alimentar.");
  startWhatsappMobilePresenceScheduler();
  console.log("[WhatsApp] Presença unavailable ativa — celular continua recebendo notificações.");
  startWhatsappDevMessageLog();
});

server.requestTimeout = UPLOAD_SERVER_TIMEOUT_MS;
server.headersTimeout = UPLOAD_SERVER_TIMEOUT_MS + 60_000;
server.timeout = UPLOAD_SERVER_TIMEOUT_MS;

async function shutdown(signal: string) {
  console.log(`[Server] Encerrando (${signal})...`);
  await prisma.$disconnect();
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
