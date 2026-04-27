import { Router } from "express";
import { FinancialController } from "../controllers/financial.controller";

const router = Router();
const financialController = new FinancialController();

// Adicionar middlewares de auth e role (apenas NUTRICIONISTA) se disponíveis
router.get("/summary", financialController.getSummary);
router.post("/transactions", financialController.createTransaction);

export default router;
