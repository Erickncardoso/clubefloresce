import { PostRepository } from "../repositories/post.repository";
import { Post, Comment } from "@prisma/client";

const postRepository = new PostRepository();

export class PostService {
  async getAllPosts(userId?: string) {
    return postRepository.findAllPatientCommunity(userId);
  }

  async createPost(
    data: { content: string; authorId: string; imageUrl?: string },
    authorRole: string
  ): Promise<Post> {
    if (authorRole !== "PACIENTE") {
      throw new Error("Apenas pacientes podem publicar na comunidade.");
    }
    const content = data.content?.trim() ?? "";
    const imageUrl = data.imageUrl?.trim() || undefined;
    if (!content && !imageUrl) {
      throw new Error("Adicione um texto ou uma imagem para publicar.");
    }
    return postRepository.create({ content, imageUrl, authorId: data.authorId });
  }

  async addComment(
    data: { content: string; postId: string; authorId: string },
    authorRole: string
  ): Promise<Comment> {
    if (authorRole !== "PACIENTE") {
      throw new Error("Apenas pacientes podem comentar na comunidade.");
    }
    const content = data.content?.trim();
    if (!content) throw new Error("Conteúdo obrigatório.");
    return postRepository.createComment({
      content,
      postId: data.postId,
      authorId: data.authorId,
    });
  }

  async deletePost(postId: string, userId: string, userRole: string): Promise<void> {
    const post = await postRepository.findById(postId);
    if (!post) throw new Error("Publicação não encontrada.");
    if (post.authorId !== userId && userRole !== "NUTRICIONISTA") {
      throw new Error("Sem permissão para excluir.");
    }
    await postRepository.delete(postId);
  }

  async toggleLike(postId: string, userId: string, userRole: string) {
    if (userRole !== "PACIENTE") {
      throw new Error("Apenas pacientes podem curtir publicações.");
    }
    return postRepository.togglePostLike(userId, postId);
  }
}
