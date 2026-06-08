import { Router } from "express";
import { PostController } from "../controllers/post.controller";
import { authenticate } from "../middleware/auth.middleware";
import { postImageUpload } from "../middleware/post-upload.middleware";

const router = Router();
const postController = new PostController();

const handlePostImageUpload = (req: any, res: any, next: any) => {
  postImageUpload(req, res, (err: any) => {
    if (err) {
      const message = err instanceof Error ? err.message : "Erro no upload da imagem.";
      return res.status(400).json({ message });
    }
    next();
  });
};

// Rotas da comunidade (abertas para todos os autenticados)
router.get("/", authenticate, postController.getAll);
router.post("/", authenticate, handlePostImageUpload, postController.create);
router.post("/:postId/comments", authenticate, postController.addComment);
router.post("/:id/toggle-like", authenticate, postController.toggleLike.bind(postController));
router.delete("/:id", authenticate, postController.delete.bind(postController));

export default router;
