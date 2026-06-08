import { Request, Response } from "express";
import { PostService } from "../services/post.service";
import { cloudinaryUpload } from "../utils/cloudinary";

const postService = new PostService();

export class PostController {
  async getAll(req: Request, res: Response): Promise<any> {
    try {
      const posts = await postService.getAllPosts(req.user!.id);
      return res.json(posts);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  async create(req: Request, res: Response): Promise<any> {
    try {
      let imageUrl: string | undefined;

      if (req.file) {
        imageUrl = await cloudinaryUpload(req.file.buffer, "clube-community-posts", {
          resourceType: "image",
          fileSizeBytes: req.file.size,
        });
      }

      const post = await postService.createPost(
        {
          content: typeof req.body.content === "string" ? req.body.content : "",
          imageUrl,
          authorId: req.user!.id,
        },
        req.user!.role
      );
      return res.status(201).json(post);
    } catch (error: any) {
      const status = error.message.includes("Cloudinary") ? 503 : 400;
      return res.status(status).json({ message: error.message });
    }
  }

  async addComment(req: Request, res: Response): Promise<any> {
    try {
      const comment = await postService.addComment(
        {
          content: req.body.content,
          postId: req.params.postId,
          authorId: req.user!.id,
        },
        req.user!.role
      );
      return res.status(201).json(comment);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async delete(req: Request, res: Response): Promise<any> {
    try {
      await postService.deletePost(req.params.id, req.user!.id, req.user!.role);
      return res.status(204).send();
    } catch (error: any) {
      const status = error.message.includes("não encontrada") ? 404 : 403;
      return res.status(status).json({ message: error.message });
    }
  }

  async toggleLike(req: Request, res: Response): Promise<any> {
    try {
      const result = await postService.toggleLike(req.params.id, req.user!.id, req.user!.role);
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }
}
