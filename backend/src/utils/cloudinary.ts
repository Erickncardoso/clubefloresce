import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

type CloudinaryResourceType = "image" | "video" | "raw" | "auto";

const getFileSizeBytesSafe = (filePath: string): number => {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
};

export const cloudinaryUpload = async (
  filePath: string,
  folder: string = "clube-nutricional",
  options?: { resourceType?: CloudinaryResourceType }
): Promise<string> => {
  try {
    const resourceType: CloudinaryResourceType = options?.resourceType || "auto";

    // Cloudinary tende a falhar com vídeos grandes via upload simples.
    // Para vídeos (especialmente > ~100MB), usamos upload_large (chunked).
    const fileSizeBytes = getFileSizeBytesSafe(filePath);
    const isVideo = resourceType === "video";
    const shouldUseLargeUpload = isVideo && fileSizeBytes > 100 * 1024 * 1024; // >100MB

    if (shouldUseLargeUpload) {
      const result = await cloudinary.uploader.upload_large(filePath, {
        folder,
        resource_type: "video",
        chunk_size: 20 * 1024 * 1024, // 20MB por chunk
      } as any);
      return result.secure_url as string;
    }

    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: resourceType, // image | video | raw | auto
    });
    return result.secure_url as string;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Erro ao enviar arquivo para o Cloudinary.");
  }
};
