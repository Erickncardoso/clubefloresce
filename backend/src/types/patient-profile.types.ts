export type PatientGender = "female" | "male" | "other" | "prefer_not_say";

export type PatientPrimaryGoal =
  | "lose_weight"
  | "maintain"
  | "gain_weight"
  | "muscle"
  | "health";

export type PatientWorkoutsPerWeek = "0-2" | "3-5" | "6+";

export interface PatientProfileData {
  gender?: PatientGender | null;
  birthDate?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  targetWeightKg?: number | null;
  primaryGoal?: PatientPrimaryGoal | null;
  workoutsPerWeek?: PatientWorkoutsPerWeek | null;
}

export interface PatientProfileResponse {
  profile: PatientProfileData;
  onboardingCompletedAt: string | null;
  isComplete: boolean;
  missingFields: string[];
}
