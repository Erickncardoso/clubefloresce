import { Router } from "express";
import { FoodDiaryController } from "../controllers/food-diary.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
const controller = new FoodDiaryController();

router.get("/today", authenticate, authorize(["PACIENTE"]), controller.getToday.bind(controller));
router.get("/month", authenticate, authorize(["PACIENTE"]), controller.getMonth.bind(controller));
router.get("/feed", authenticate, authorize(["PACIENTE"]), controller.getPatientFeed.bind(controller));
router.get(
  "/entries/:entryId/social",
  authenticate,
  authorize(["PACIENTE"]),
  controller.getOwnEntrySocial.bind(controller),
);
router.post(
  "/entries/:entryId/comments",
  authenticate,
  authorize(["PACIENTE"]),
  controller.addOwnEntryComment.bind(controller),
);
router.patch(
  "/comments/:commentId",
  authenticate,
  authorize(["PACIENTE"]),
  controller.updateEntryComment.bind(controller),
);
router.delete(
  "/comments/:commentId",
  authenticate,
  authorize(["PACIENTE"]),
  controller.deleteEntryComment.bind(controller),
);
router.get("/admin/feed", authenticate, authorize(["NUTRICIONISTA"]), controller.getAdminFeed.bind(controller));
router.get(
  "/admin/consumption",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.getAdminConsumption.bind(controller),
);
router.post(
  "/admin/entries/:entryId/like",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.toggleEntryLike.bind(controller),
);
router.get(
  "/admin/entries/:entryId/comments",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.listEntryComments.bind(controller),
);
router.post(
  "/admin/entries/:entryId/comments",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.addEntryComment.bind(controller),
);
router.patch(
  "/admin/comments/:commentId",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.updateEntryComment.bind(controller),
);
router.delete(
  "/admin/comments/:commentId",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.deleteEntryComment.bind(controller),
);
router.post("/confirm", authenticate, authorize(["PACIENTE"]), controller.confirm.bind(controller));
router.put("/entries/:id", authenticate, authorize(["PACIENTE"]), controller.updateEntry.bind(controller));
router.put("/plan-check", authenticate, authorize(["PACIENTE"]), controller.syncPlanCheck.bind(controller));
router.delete("/entries/:id", authenticate, authorize(["PACIENTE"]), controller.deleteEntry.bind(controller));

export default router;
