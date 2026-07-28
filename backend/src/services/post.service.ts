import { PostRepository } from "../repositories/post.repository";
import { Post, Comment } from "@prisma/client";
import { scheduleRagDelete, scheduleRagReindex } from "./rag/rag-hooks";

const postRepository = new PostRepository();

const COMMUNITY_ROLES = new Set(["PACIENTE", "NUTRICIONISTA"]);

function canParticipateInCommunity(role: string) {
  return COMMUNITY_ROLES.has(role);
}

export class PostService {
  async getAllPosts(userId?: string) {
    return postRepository.findAllPatientCommunity(userId);
  }

  async createPost(
    data: { content: string; authorId: string; imageUrl?: string },
    authorRole: string
  ): Promise<Post> {
    if (!canParticipateInCommunity(authorRole)) {
      throw new Error("Sem permissão para publicar na comunidade.");
    }
    const content = data.content?.trim() ?? "";
    const imageUrl = data.imageUrl?.trim() || undefined;
    if (!content && !imageUrl) {
      throw new Error("Adicione um texto ou uma imagem para publicar.");
    }
    const post = await postRepository.create({ content, imageUrl, authorId: data.authorId });
    scheduleRagReindex({ type: "post", id: post.id });
    return post;
  }

  async addComment(
    data: { content: string; postId: string; authorId: string },
    authorRole: string
  ): Promise<Comment> {
    if (!canParticipateInCommunity(authorRole)) {
      throw new Error("Sem permissão para comentar na comunidade.");
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
    scheduleRagDelete("post", postId);
  }

  async toggleLike(postId: string, userId: string, userRole: string) {
    if (!canParticipateInCommunity(userRole)) {
      throw new Error("Sem permissão para curtir publicações.");
    }
    return postRepository.togglePostLike(userId, postId);
  }

  async reportPost(
    postId: string,
    reporterId: string,
    reporterRole: string,
    reason: string,
    details?: string,
  ) {
    if (!canParticipateInCommunity(reporterRole)) {
      throw new Error("Sem permissão para denunciar publicações.");
    }

    const normalizedReason = String(reason || "").trim();
    if (!normalizedReason) throw new Error("Informe o motivo da denúncia.");

    const allowedReasons = new Set([
      "offensive",
      "spam",
      "unsafe_health",
      "privacy",
      "other",
    ]);
    if (!allowedReasons.has(normalizedReason)) {
      throw new Error("Motivo de denúncia inválido.");
    }

    const post = await postRepository.findById(postId);
    if (!post) throw new Error("Publicação não encontrada.");

    try {
      return await postRepository.createReport({
        postId,
        reporterId,
        reason: normalizedReason,
        details: details?.trim() || undefined,
      });
    } catch (error: any) {
      if (error?.code === "P2002") {
        throw new Error("Você já denunciou esta publicação.");
      }
      throw error;
    }
  }
}
