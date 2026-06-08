import { Router } from "express";
import { FoodDiaryController } from "../controllers/food-diary.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
const controller = new FoodDiaryController();

router.get("/today", authenticate, authorize(["PACIENTE"]), controller.getToday.bind(controller));
router.post("/confirm", authenticate, authorize(["PACIENTE"]), controller.confirm.bind(controller));

export default router;
