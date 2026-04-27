import { PostRepository } from "../repositories/post.repository";
import { Post, Comment } from "@prisma/client";

const postRepository = new PostRepository();

export class PostService {
  async getAllPosts(): Promise<Post[]> {
    return postRepository.findAll();
  }

  async createPost(data: any): Promise<Post> {
    return postRepository.create(data);
  }

  async addComment(data: any): Promise<Comment> {
    return postRepository.createComment(data);
  }
}
