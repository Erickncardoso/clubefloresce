import { Router } from "express";
import { AgendaController } from "../controllers/agenda.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
const controller = new AgendaController();

router.get(
  "/appointments",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.list.bind(controller),
);

router.get(
  "/search",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.search.bind(controller),
);

router.post(
  "/appointments",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.create.bind(controller),
);

router.patch(
  "/appointments/:id",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.update.bind(controller),
);

router.delete(
  "/appointments/:id",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.remove.bind(controller),
);

export default router;
