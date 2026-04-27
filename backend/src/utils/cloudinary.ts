import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const cloudinaryUpload = async (
  file: any,
  folder: string = "clube-nutricional"
): Promise<any> => {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder,
      resource_type: "auto", // Automatically detect if it's an image, video, or raw file (PDF)
    });
    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Erro ao enviar arquivo para o Cloudinary.");
  }
};
