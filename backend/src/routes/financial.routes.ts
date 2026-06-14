import { Router } from "express";
import { FinancialController } from "../controllers/financial.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
const financialController = new FinancialController();

router.get(
  "/summary",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  financialController.getSummary,
);
router.post(
  "/transactions",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  financialController.createTransaction,
);

export default router;
