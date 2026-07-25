import { Router } from "express";
import { FoodController } from "../controllers/food.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();
const controller = new FoodController();

router.get("/stats", authenticate, controller.stats.bind(controller));
router.get("/catalog/meta", authenticate, controller.catalogMeta.bind(controller));
router.get("/catalog", authenticate, controller.catalog.bind(controller));
router.get("/search", authenticate, controller.search.bind(controller));
router.post("/substitute", authenticate, controller.substitute.bind(controller));
router.post("/match-batch", authenticate, controller.matchBatch.bind(controller));
router.get("/match", authenticate, controller.match.bind(controller));
router.get("/:id", authenticate, controller.getById.bind(controller));

export default router;
