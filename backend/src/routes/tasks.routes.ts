import { Router } from "express";
import { TasksController } from "../controllers/tasks.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
const controller = new TasksController();

router.get("/", authenticate, authorize(["NUTRICIONISTA"]), controller.list.bind(controller));
router.post("/", authenticate, authorize(["NUTRICIONISTA"]), controller.create.bind(controller));
router.patch("/:id", authenticate, authorize(["NUTRICIONISTA"]), controller.update.bind(controller));
router.delete("/:id", authenticate, authorize(["NUTRICIONISTA"]), controller.remove.bind(controller));

export default router;
