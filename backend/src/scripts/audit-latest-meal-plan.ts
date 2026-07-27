import dotenv from "dotenv";
import { prisma } from "../lib/prisma";
import { calculateAtwaterCalories } from "../utils/atwater";

dotenv.config();

type Item = {
  name?: string;
  display?: string;
  grams?: number | null;
  ml?: number | null;
  foodId?: string | null;
  foodSource?: string | null;
  linkedFoodName?: string | null;
  per100g?: {
    caloriesKcal?: number | null;
    proteinG?: number | null;
    carbsG?: number | null;
    fatG?: number | null;
  } | null;
  substitutions?: Item[];
};

function walk(item: Item, depth: number, lines: string[]) {
  const pad = "  ".repeat(depth);
  const grams = item.grams ?? item.ml ?? null;
  const p = item.per100g;
  const linked = Boolean(item.foodId && p?.caloriesKcal != null);
  const atw =
    p && p.proteinG != null
      ? calculateAtwaterCalories({
          proteinG: Number(p.proteinG) || 0,
          carbsG: Number(p.carbsG) || 0,
          fatG: Number(p.fatG) || 0,
        })
      : null;
  const kcal100 = p?.caloriesKcal != null ? Math.round(Number(p.caloriesKcal)) : null;
  const portion =
    linked && grams != null && kcal100 != null ? Math.round((kcal100 * Number(grams)) / 100) : null;

  let flag = linked ? "OK" : "NO-LINK";
  if (linked && atw != null && kcal100 != null && Math.abs(atw - kcal100) > 80) flag = "KCAL?";
  if (
    linked &&
    /oleo, linhaca|caramel|doce em barra|macadamia|sweet potato|talento dark/i.test(
      String(item.linkedFoodName || ""),
    )
  ) {
    flag = "BAD-MATCH";
  }

  lines.push(
    `${flag} ${pad}${String(item.name || item.display || "?").slice(0, 55)}` +
      ` → ${linked ? `${item.foodSource} ${String(item.linkedFoodName || "").slice(0, 45)}` : "—"}` +
      (grams != null ? ` | ${grams}g` : "") +
      (kcal100 != null ? ` | ${kcal100}kcal/100g` : "") +
      (portion != null ? ` → ${portion}kcal` : ""),
  );

  for (const sub of item.substitutions || []) walk(sub, depth + 1, lines);
}

async function main() {
  const plan = await prisma.patientMealPlan.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  if (!plan) {
    console.log("Nenhum plano encontrado");
    return;
  }

  console.log(
    JSON.stringify(
      {
        userId: plan.userId,
        fileName: plan.fileName,
        title: plan.title,
        parserSource: plan.parserSource,
        updatedAt: plan.updatedAt,
      },
      null,
      2,
    ),
  );

  const data = plan.plan as any;
  let total = 0;
  let linked = 0;
  let bad = 0;
  const lines: string[] = [];

  for (const meal of data?.meals || []) {
    lines.push(`\n## ${meal.name || meal.type || "refeição"}`);
    for (const item of meal.items || []) {
      const before = lines.length;
      walk(item, 0, lines);
      // count from new lines roughly
    }
  }

  // recount properly
  const recount = (item: Item) => {
    total += 1;
    if (item.foodId && item.per100g?.caloriesKcal != null) linked += 1;
    const name = String(item.linkedFoodName || "");
    if (/oleo, linhaca|caramel|doce em barra|macadamia|sweet potato|talento dark/i.test(name)) {
      bad += 1;
    }
    for (const sub of item.substitutions || []) recount(sub);
  };
  for (const meal of data?.meals || []) {
    for (const item of meal.items || []) recount(item);
  }

  console.log(lines.join("\n"));
  console.log("\n---");
  console.log(JSON.stringify({ total, linked, pending: total - linked, badMatches: bad }, null, 2));

  // highlight screenshot items
  const interesting = [
    "peito de frango",
    "salada de folhas",
    "alcatra",
    "frango desfiado",
    "filé de peixe",
    "atum",
    "couve",
  ];
  console.log("\n### Itens da tela");
  const dump: string[] = [];
  const find = (item: Item) => {
    const blob = `${item.name || ""} ${item.display || ""} ${item.linkedFoodName || ""}`.toLowerCase();
    if (interesting.some((k) => blob.includes(k))) {
      dump.push(
        `${item.name} | link=${item.linkedFoodName || "—"} | ${item.foodSource || "?"} | ${item.per100g?.caloriesKcal ?? "?"}kcal/100g | subs=${(item.substitutions || []).length}`,
      );
      for (const sub of item.substitutions || []) {
        dump.push(
          `  ⇆ ${sub.name} | link=${sub.linkedFoodName || "—"} | ${sub.foodSource || "?"} | ${sub.per100g?.caloriesKcal ?? "?"}kcal/100g`,
        );
      }
    }
    for (const sub of item.substitutions || []) find(sub);
  };
  for (const meal of data?.meals || []) {
    for (const item of meal.items || []) find(item);
  }
  console.log(dump.join("\n") || "(não achei esses nomes — pode ser outro user/plano)");
}

main()
  .catch(console.error)
  .finally(async () => prisma.$disconnect());
