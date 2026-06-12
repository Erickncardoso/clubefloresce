import { Router } from "express";
import { FoodController } from "../controllers/food.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();
const controller = new FoodController();

router.get("/stats", authenticate, controller.stats.bind(controller));
router.get("/search", authenticate, controller.search.bind(controller));
router.get("/match", authenticate, controller.match.bind(controller));
router.get("/:id", authenticate, controller.getById.bind(controller));

export default router;
