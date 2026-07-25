import { Router } from "express";
import { MealPlanController } from "../controllers/meal-plan.controller";
import { MealPlanRecipesController } from "../controllers/meal-plan-recipes.controller";
import { MealPlanQualitativeTemplatesController } from "../controllers/meal-plan-qualitative-templates.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { createPdfUpload } from "../utils/pdf-upload";
import { createRecipeImportUpload } from "../utils/recipe-import-upload";

const router = Router();
const controller = new MealPlanController();
const recipesController = new MealPlanRecipesController();
const qualitativeTemplatesController = new MealPlanQualitativeTemplatesController();
const pdfUpload = createPdfUpload({ fileSizeMb: 20 });
const recipeImportUpload = createRecipeImportUpload({ fileSizeMb: 15 });

router.get("/recipes", authenticate, authorize(["NUTRICIONISTA"]), recipesController.list.bind(recipesController));
router.get("/recipes/me", authenticate, authorize(["PACIENTE"]), recipesController.listMine.bind(recipesController));
router.post("/recipes/import", authenticate, authorize(["NUTRICIONISTA"]), recipeImportUpload.single("file"), recipesController.importFromFile.bind(recipesController));
router.post("/recipes", authenticate, authorize(["NUTRICIONISTA"]), recipesController.upsert.bind(recipesController));
router.delete(
  "/recipes/:id",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  recipesController.remove.bind(recipesController),
);

router.get(
  "/qualitative-templates",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  qualitativeTemplatesController.list.bind(qualitativeTemplatesController),
);
router.post(
  "/qualitative-templates",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  qualitativeTemplatesController.upsert.bind(qualitativeTemplatesController),
);
router.delete(
  "/qualitative-templates/:id",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  qualitativeTemplatesController.remove.bind(qualitativeTemplatesController),
);

router.get("/me", authenticate, authorize(["PACIENTE"]), controller.getMine.bind(controller));
router.post(
  "/shopping-list/smart",
  authenticate,
  authorize(["NUTRICIONISTA"]),
  controller.smartShoppingList.bind(controller),
);
router.post(
  "/upload",
  authenticate,
  authorize(["PACIENTE"]),
  pdfUpload.single("file"),
  controller.upload.bind(controller),
);

export default router;
