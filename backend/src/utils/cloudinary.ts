import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

type CloudinaryResourceType = "image" | "video" | "raw" | "auto";
type CloudinaryUploadResult = { secure_url?: string | null };
type CloudinaryUploadOptions = {
  resourceType?: CloudinaryResourceType;
  fileSizeBytes?: number;
};

export const cloudinaryUpload = async (
  fileBuffer: Buffer,
  folder: string = "clube-nutricional",
  options?: CloudinaryUploadOptions
): Promise<string> => {
  try {
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

    const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType, // image | video | raw | auto
        },
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
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Erro ao enviar arquivo para o Cloudinary.");
  }
};
