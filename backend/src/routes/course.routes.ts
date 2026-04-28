import { Router } from "express";
import { CourseController } from "../controllers/course.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
const courseController = new CourseController();

// Rotas públicas (apenas autenticado)
router.get("/", authenticate, courseController.getAll);
router.get("/modules/:moduleId", authenticate, courseController.getModuleById);
router.get("/:id", authenticate, courseController.getById);

// Rotas de progresso e interações
router.post("/lessons/:lessonId/progress", authenticate, courseController.updateLessonProgress);
router.get("/lessons/:lessonId/comments", authenticate, courseController.getLessonComments);
router.post("/lessons/:lessonId/comments", authenticate, courseController.addLessonComment);
router.put("/comments/:id", authenticate, courseController.updateComment);
router.delete("/comments/:id", authenticate, courseController.deleteComment);
router.post("/comments/:id/toggle-like", authenticate, courseController.toggleCommentLike);

// Rotas de módulos
router.delete("/:courseId/modules/:moduleId", authenticate, authorize(["NUTRICIONISTA"]), courseController.deleteModule);

// Rotas administrativas (Nutricionista)
router.post("/", authenticate, authorize(["NUTRICIONISTA"]), courseController.create);
router.put("/:id", authenticate, authorize(["NUTRICIONISTA"]), courseController.update);
router.delete("/:id", authenticate, authorize(["NUTRICIONISTA"]), courseController.delete);
router.post("/:id/modules", authenticate, authorize(["NUTRICIONISTA"]), courseController.addModule);
router.post("/:id/modules/ensure-first", authenticate, authorize(["NUTRICIONISTA"]), courseController.ensureFirstModule);
router.post("/lessons", authenticate, authorize(["NUTRICIONISTA"]), courseController.addLesson);
router.put("/lessons/:lessonId", authenticate, authorize(["NUTRICIONISTA"]), courseController.updateLesson);
router.delete("/lessons/:lessonId", authenticate, authorize(["NUTRICIONISTA"]), courseController.deleteLesson);


export default router;
