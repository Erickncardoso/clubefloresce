import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME
    && process.env.CLOUDINARY_API_KEY
    && process.env.CLOUDINARY_API_SECRET,
  );
}

function assertCloudinaryConfigured(): void {
  if (isCloudinaryConfigured()) return;
  throw new Error(
    "Cloudinary não configurado no servidor. Defina CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET no backend (Coolify/apiclube).",
  );
}

type CloudinaryResourceType = "image" | "video" | "raw" | "auto";
type CloudinaryUploadResult = { secure_url?: string | null };
type CloudinaryUploadOptions = {
  resourceType?: CloudinaryResourceType;
  fileSizeBytes?: number;
  originalFilename?: string;
};

export const cloudinaryUpload = async (
  fileBuffer: Buffer,
  folder: string = "clube-nutricional",
  options?: CloudinaryUploadOptions
): Promise<string> => {
  try {
    assertCloudinaryConfigured();
    const resourceType: CloudinaryResourceType = options?.resourceType || "auto";

    const fileSizeBytes = Number(options?.fileSizeBytes || fileBuffer?.length || 0);
    const isVideo = resourceType === "video";
    const shouldUseLargeUpload = isVideo && fileSizeBytes > 100 * 1024 * 1024; // >100MB

    if (shouldUseLargeUpload) {
      const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_chunked_stream(
          {
            folder,
            resource_type: "video",
            chunk_size: 20 * 1024 * 1024,
          } as any,
          (error: any, response: CloudinaryUploadResult | undefined) => {
            if (error) {
              reject(error);
              return;
            }
            resolve(response || {});
          }
        );

        stream.on("error", reject);
        stream.end(fileBuffer);
      });

      if (!result?.secure_url) {
        throw new Error("Cloudinary não retornou secure_url para o vídeo.");
      }

      return result.secure_url;
    }

    const uploadOptions: Record<string, unknown> = {
      folder,
      resource_type: resourceType, // image | video | raw | auto
    };

    // PDFs/docs precisam manter extensão na URL para download/visualização corretos.
    if (resourceType === "raw" && options?.originalFilename) {
      uploadOptions.use_filename = true;
      uploadOptions.unique_filename = true;
      uploadOptions.filename_override = options.originalFilename;
    }

    const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        uploadOptions as any,
        (error: any, response: CloudinaryUploadResult | undefined) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(response || {});
        }
      );

      stream.on("error", reject);
      stream.end(fileBuffer);
    });

    if (!result?.secure_url) {
      throw new Error("Cloudinary não retornou secure_url para o arquivo.");
    }

    return result.secure_url as string;
  } catch (error: any) {
    const detail = error?.message || error?.error?.message || String(error);
    console.error("Cloudinary upload error:", detail);
    if (!isCloudinaryConfigured()) {
      throw new Error(
        "Cloudinary não configurado no servidor. Atualize as variáveis CLOUDINARY_* no deploy do backend.",
      );
    }
    throw new Error(detail || "Erro ao enviar arquivo para o Cloudinary.");
  }
};
