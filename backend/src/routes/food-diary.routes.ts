import { Router } from "express";
import { FoodDiaryController } from "../controllers/food-diary.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
const controller = new FoodDiaryController();

router.get("/today", authenticate, authorize(["PACIENTE"]), controller.getToday.bind(controller));
router.get("/month", authenticate, authorize(["PACIENTE"]), controller.getMonth.bind(controller));
router.post("/confirm", authenticate, authorize(["PACIENTE"]), controller.confirm.bind(controller));
router.put("/entries/:id", authenticate, authorize(["PACIENTE"]), controller.updateEntry.bind(controller));
router.put("/plan-check", authenticate, authorize(["PACIENTE"]), controller.syncPlanCheck.bind(controller));
router.delete("/entries/:id", authenticate, authorize(["PACIENTE"]), controller.deleteEntry.bind(controller));

export default router;
