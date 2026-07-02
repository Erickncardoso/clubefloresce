import { randomUUID } from "crypto";
import { UserPlan } from "@prisma/client";
import { AppSettingRepository } from "../repositories/app-setting.repository";
import type {
  BillingAccessPlan,
  BillingFrequencyType,
  BillingProduct,
  BillingProductCatalogItem,
} from "../types/billing-product.types";

export const BILLING_PRODUCTS_KEY = "billing.products";

/** Legado — migrado para billing.products na primeira leitura. */
export const BILLING_PLAN_KEYS = {
  PREMIUM: "billing.premium.monthly_amount",
  PLATINUM: "billing.platinum.monthly_amount",
} as const;

export type BillablePlanId = string;

const DEFAULT_PRODUCTS: BillingProduct[] = [
  {
    id: "PREMIUM",
    name: "Essencial",
    description: "Dieta personalizada, Bella IA e check-ins para o seu dia a dia.",
    amount: 19.9,
    currency: "BRL",
    isSubscription: true,
    frequency: 1,
    frequencyType: "months",
    accessPlan: "PREMIUM",
    active: true,
  },
  {
    id: "PLATINUM",
    name: "Completo",
    description: "Tudo do Essencial, com prioridade no suporte e conteúdos exclusivos.",
    amount: 19.9,
    currency: "BRL",
    isSubscription: true,
    frequency: 1,
    frequencyType: "months",
    accessPlan: "PLATINUM",
    active: true,
  },
];

function slugifyId(value: string): string {
  const slug = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || `prod-${randomUUID().slice(0, 8)}`;
}

function parseBillingAmount(raw: string | number | null | undefined, fallback: number): number {
  if (raw == null || raw === "") return fallback;
  const amount = Number(String(raw).replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0 || amount > 99999) {
    throw new Error("Valor do produto inválido.");
  }
  return Math.round(amount * 100) / 100;
}

function parseFrequencyType(raw: unknown): BillingFrequencyType {
  const value = String(raw || "").trim().toLowerCase();
  if (value === "days" || value === "day" || value === "dias" || value === "dia") return "days";
  return "months";
}

function parseAccessPlan(raw: unknown): BillingAccessPlan {
  const value = String(raw || "").trim().toUpperCase();
  if (value === "PLATINUM") return "PLATINUM";
  return "PREMIUM";
}

const LEGACY_PLAN_NAMES: Record<string, string> = {
  Premium: "Essencial",
  Platinum: "Completo",
  PREMIUM: "Essencial",
  PLATINUM: "Completo",
};

function friendlyPlanName(name: string, fallback: string): string {
  const trimmed = String(name || "").trim();
  if (!trimmed) return fallback;
  return LEGACY_PLAN_NAMES[trimmed] || trimmed;
}

function buildPriceSuffix(product: BillingProduct): string {
  if (!product.isSubscription) return "";
  if (product.frequencyType === "months") {
    return product.frequency === 1 ? "/mês" : `/${product.frequency} meses`;
  }
  return product.frequency === 1 ? "/dia" : `/${product.frequency} dias`;
}

function normalizeProduct(raw: unknown, index: number): BillingProduct {
  const item = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const fallback = DEFAULT_PRODUCTS[index] || DEFAULT_PRODUCTS[0];
  const rawName = String(item.name || fallback.name).trim() || fallback.name;
  const name = friendlyPlanName(rawName, fallback.name);
  const idRaw = String(item.id || slugifyId(name)).trim();
  const frequency = Math.max(1, Math.min(365, Math.round(Number(item.frequency) || fallback.frequency)));

  return {
    id: idRaw,
    name,
    description: String(item.description ?? fallback.description).trim() || fallback.description,
    amount: parseBillingAmount(item.amount as string | number, fallback.amount),
    currency: "BRL",
    isSubscription: item.isSubscription !== false,
    frequency,
    frequencyType: parseFrequencyType(item.frequencyType ?? fallback.frequencyType),
    accessPlan: parseAccessPlan(item.accessPlan ?? fallback.accessPlan),
    active: item.active !== false,
  };
}

function toCatalogItem(product: BillingProduct): BillingProductCatalogItem {
  return {
    ...product,
    label: product.name,
    monthlyAmount: product.amount,
    priceSuffix: buildPriceSuffix(product),
  };
}

export function parseBillablePlanId(raw: unknown): string {
  const value = String(raw || "").trim();
  if (!value) throw new Error("Plano inválido.");
  return value;
}

export function computeBillingPeriodDays(frequency: number, frequencyType: BillingFrequencyType): number {
  if (frequencyType === "months") return frequency * 30;
  return frequency;
}

export { parseBillingAmount };

export class BillingPlanConfigService {
  private readonly settings = new AppSettingRepository();

  private async loadLegacyAmount(planId: keyof typeof BILLING_PLAN_KEYS, fallback: number): Promise<number> {
    const stored = await this.settings.get(BILLING_PLAN_KEYS[planId]);
    return parseBillingAmount(stored, fallback);
  }

  private async migrateLegacyProducts(): Promise<BillingProduct[]> {
    const [premiumAmount, platinumAmount] = await Promise.all([
      this.loadLegacyAmount("PREMIUM", DEFAULT_PRODUCTS[0].amount),
      this.loadLegacyAmount("PLATINUM", DEFAULT_PRODUCTS[1].amount),
    ]);

    return [
      { ...DEFAULT_PRODUCTS[0], amount: premiumAmount },
      { ...DEFAULT_PRODUCTS[1], amount: platinumAmount },
    ];
  }

  async getProducts(): Promise<BillingProduct[]> {
    const stored = await this.settings.get(BILLING_PRODUCTS_KEY);
    if (!stored) {
      const migrated = await this.migrateLegacyProducts();
      await this.saveProducts(migrated);
      return migrated;
    }

    try {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed) || !parsed.length) {
        const migrated = await this.migrateLegacyProducts();
        await this.saveProducts(migrated);
        return migrated;
      }
      return parsed.map((item, index) => normalizeProduct(item, index));
    } catch {
      const migrated = await this.migrateLegacyProducts();
      await this.saveProducts(migrated);
      return migrated;
    }
  }

  async saveProducts(products: BillingProduct[]): Promise<BillingProduct[]> {
    if (!Array.isArray(products) || !products.length) {
      throw new Error("Cadastre ao menos um produto.");
    }

    const normalized = products.map((item, index) => normalizeProduct(item, index));
    const ids = new Set<string>();
    for (const product of normalized) {
      if (ids.has(product.id)) {
        throw new Error(`ID de produto duplicado: ${product.id}`);
      }
      ids.add(product.id);
    }

    await this.settings.set(BILLING_PRODUCTS_KEY, JSON.stringify(normalized));
    return normalized;
  }

  async getActiveProducts(): Promise<BillingProduct[]> {
    const products = await this.getProducts();
    return products.filter((product) => product.active);
  }

  async resolveProduct(productIdRaw: unknown): Promise<BillingProduct> {
    const productId = parseBillablePlanId(productIdRaw);
    const product = (await this.getActiveProducts()).find((item) => item.id === productId);
    if (!product) {
      throw new Error("Produto não encontrado ou inativo.");
    }
    return product;
  }

  async resolvePlanAmount(planIdRaw: unknown): Promise<{ planId: string; amount: number; product: BillingProduct }> {
    const product = await this.resolveProduct(planIdRaw);
    return { planId: product.id, amount: product.amount, product };
  }

  async getPlanCatalog(): Promise<BillingProductCatalogItem[]> {
    const products = await this.getActiveProducts();
    return products.map(toCatalogItem);
  }

  /** @deprecated use getProducts */
  async getAdminPlanSettings(): Promise<Record<string, number>> {
    const products = await this.getProducts();
    return products.reduce((acc, item) => {
      acc[item.id] = item.amount;
      return acc;
    }, {} as Record<string, number>);
  }

  /** @deprecated use saveProducts */
  async updateAdminPlanSettings(input: Partial<Record<string, unknown>>): Promise<Record<string, number>> {
    const products = await this.getProducts();
    const updated = products.map((product) => ({
      ...product,
      amount: input[product.id] !== undefined
        ? parseBillingAmount(input[product.id] as string | number, product.amount)
        : product.amount,
    }));
    await this.saveProducts(updated);
    return this.getAdminPlanSettings();
  }

  toUserPlan(productOrPlanId: BillingProduct | string): UserPlan {
    const accessPlan = typeof productOrPlanId === "string"
      ? productOrPlanId.toUpperCase()
      : productOrPlanId.accessPlan;
    return accessPlan === "PLATINUM" ? UserPlan.PLATINUM : UserPlan.PREMIUM;
  }

  getAccessPeriodDays(product: BillingProduct): number {
    if (!product.isSubscription) return 30;
    return computeBillingPeriodDays(product.frequency, product.frequencyType);
  }
}

export const billingPlanConfigService = new BillingPlanConfigService();
