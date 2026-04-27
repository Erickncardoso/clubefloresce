import { Router } from "express";
import { PostController } from "../controllers/post.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();
const postController = new PostController();

// Rotas da comunidade (abertas para todos os autenticados)
router.get("/", authenticate, postController.getAll);
router.post("/", authenticate, postController.create);
router.post("/:postId/comments", authenticate, postController.addComment);

export default router;
