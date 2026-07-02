export type BillingFrequencyType = "days" | "months";

export type BillingAccessPlan = "PREMIUM" | "PLATINUM";

export type BillingProduct = {
  id: string;
  name: string;
  description: string;
  amount: number;
  currency: "BRL";
  isSubscription: boolean;
  frequency: number;
  frequencyType: BillingFrequencyType;
  accessPlan: BillingAccessPlan;
  active: boolean;
};

export type BillingProductCatalogItem = BillingProduct & {
  label: string;
  monthlyAmount: number;
  priceSuffix: string;
};
