import { Request, Response } from "express";
import { PostService } from "../services/post.service";

const postService = new PostService();

export class PostController {
  async getAll(req: Request, res: Response): Promise<any> {
    try {
      const posts = await postService.getAllPosts();
      return res.json(posts);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  async create(req: Request, res: Response): Promise<any> {
    try {
      const post = await postService.createPost({
        ...req.body,
        authorId: req.user?.id,
      });
      return res.status(201).json(post);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async addComment(req: Request, res: Response): Promise<any> {
    try {
      const comment = await postService.addComment({
        ...req.body,
        postId: req.params.postId,
        authorId: req.user?.id,
      });
      return res.status(201).json(comment);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }
}
