import { Router } from "express";
import { EbookController } from "../controllers/ebook.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
const ebookController = new EbookController();

// Rotas públicas (apenas autenticado)
router.get("/", authenticate, ebookController.getAll);

// Rotas administrativas (Nutricionista)
router.post("/", authenticate, authorize(["NUTRICIONISTA"]), ebookController.create);
router.delete("/:id", authenticate, authorize(["NUTRICIONISTA"]), ebookController.delete);

export default router;
