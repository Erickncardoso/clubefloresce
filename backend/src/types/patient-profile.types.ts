export type PatientGender = "female" | "male" | "other" | "prefer_not_say";

export type PatientPrimaryGoal =
  | "lose_weight"
  | "maintain"
  | "gain_weight"
  | "muscle"
  | "health";

export type PatientWorkoutsPerWeek = "0-2" | "3-5" | "6+";

export type PatientModality = "online" | "presencial";

export type PatientMaritalStatus =
  | "single"
  | "married"
  | "divorced"
  | "widowed"
  | "stable_union"
  | "other";

export interface PatientProfileData {
  gender?: PatientGender | null;
  birthDate?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  targetWeightKg?: number | null;
  primaryGoal?: PatientPrimaryGoal | null;
  workoutsPerWeek?: PatientWorkoutsPerWeek | null;
  /** IANA timezone (ex.: America/Sao_Paulo) — usada nos lembretes de refeição. */
  timezone?: string | null;
  /** Lembretes push nos horários do plano alimentar (padrão: true). */
  mealRemindersEnabled?: boolean | null;

  /** Cadastro rápido / ficha admin */
  nickname?: string | null;
  cpf?: string | null;
  rg?: string | null;
  referralSource?: string | null;
  /** Nomes das tags selecionadas (compatível com catálogo colorido). */
  tags?: string[] | null;
  /** Tags com cor (preferencial no cadastro admin). */
  tagItems?: Array<{ id?: string; name: string; color?: string }> | null;
  city?: string | null;
  state?: string | null;
  occupation?: string | null;
  maritalStatus?: PatientMaritalStatus | null;
  modality?: PatientModality | null;
  athlete?: boolean | null;
  pregnant?: boolean | null;
  lactating?: boolean | null;

  /** Informações avançadas (cadastro admin) */
  objective?: string | null;
  notes?: string | null;
  zipCode?: string | null;
  neighborhood?: string | null;
  street?: string | null;
  streetNumber?: string | null;
  country?: string | null;
  addressComplement?: string | null;

  /** Contatos extras (cadastro admin). */
  additionalContacts?: Array<{ id: string; type: string; number: string }> | null;
  emergencyContacts?: Array<{
    id: string;
    relationship: string;
    contactUserId?: string | null;
    contactName?: string | null;
  }> | null;
  guardianEnabled?: boolean | null;
  guardians?: Array<{
    id: string;
    relationship: string;
    contactUserId?: string | null;
    contactName?: string | null;
  }> | null;
  identityDocuments?: Array<{ id: string; type: string; number: string }> | null;
  notifyEmail?: boolean | null;
  notifySms?: boolean | null;
  notifyWhatsapp?: boolean | null;
  profileAttachments?: Array<{
    id: string;
    name: string;
    url: string;
    size?: number | null;
    mimeType?: string | null;
    uploadedAt: string;
  }> | null;

  /** Consultas registradas pela nutricionista (ficha admin). */
  consultations?: Array<{
    id: string;
    date: string;
    notes?: string | null;
    createPlannerTask?: boolean;
    createdAt: string;
  }> | null;

  /** Anamneses clínicas (texto + interpretação). */
  anamneses?: Array<{
    id: string;
    title: string;
    content: string;
    interpretation?: string | null;
    foodRestrictions?: string | null;
    formData?: Record<string, unknown> | null;
    status?: "draft" | "completed" | null;
    authorName?: string | null;
    createdAt: string;
    updatedAt: string;
  }> | null;

  /** Orientações nutricionais para o paciente (documento editável). */
  orientacoes?: Array<{
    id: string;
    title: string;
    content: string;
    templateId?: string | null;
    previewModelId?: string | null;
    status?: "draft" | "published" | null;
    authorName?: string | null;
    createdAt: string;
    updatedAt: string;
  }> | null;

  /** Documentos clínicos (atestados, declarações, encaminhamentos). */
  documentos?: Array<{
    id: string;
    category?: string | null;
    title: string;
    content: string;
    templateId?: string | null;
    previewModelId?: string | null;
    status?: "draft" | "published" | null;
    authorName?: string | null;
    createdAt: string;
    updatedAt: string;
  }> | null;

  /** Avaliações antropométricas do paciente. */
  antropometrias?: Array<{
    id: string;
    title?: string | null;
    measuredAt: string;
    heightCm?: number | null;
    weightKg?: number | null;
    bilateralCircumferences?: boolean | null;
    dominantSide?: "left" | "right" | null;
    circumferences?: Record<string, number | null> | null;
    boneDiameters?: Record<string, number | null> | null;
    skinfoldMethod?: string | null;
    skinfolds?: Record<string, number | null> | null;
    bioimpedance?: Record<string, number | string | null> | null;
    patientAppView?: "skinfolds" | "bioimpedance" | "both" | "none" | null;
    photos?: Record<string, string | null> | null;
    notes?: string | null;
    status?: "draft" | "completed" | null;
    authorName?: string | null;
    createdAt: string;
    updatedAt: string;
  }> | null;

  /** Prescrições / planos alimentares criados no admin (histórico). */
  mealPlans?: Array<{
    id: string;
    title: string;
    methodology: "foods" | "equivalents" | "qualitative";
    status?: "draft" | "active" | "archived" | null;
    objective?: string | null;
    dietType?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    indefinite?: boolean | null;
    editorText?: string | null;
    editorHtml?: string | null;
    finalNotes?: string | null;
    meals?: Array<{
      id: string;
      time: string;
      label: string;
      items: Array<{
        id: string;
        foodId?: string | null;
        name: string;
        amount: string;
        unit: string;
        groupId?: string | null;
        options?: string | null;
        display?: string | null;
        grams?: number | null;
        ml?: number | null;
        portionAmount?: number | null;
        portionMeasure?: string | null;
        per100g?: {
          caloriesKcal?: number | null;
          proteinG?: number | null;
          carbsG?: number | null;
          fatG?: number | null;
        } | null;
      }>;
      notes?: string | null;
      macros?: {
        proteinG?: number | null;
        fatG?: number | null;
        carbsG?: number | null;
        caloriesKcal?: number | null;
      } | null;
      pdfMacros?: {
        proteinG?: number | null;
        fatG?: number | null;
        carbsG?: number | null;
        caloriesKcal?: number | null;
      } | null;
    }> | null;
    nutritionTotals?: {
      proteinG?: number | null;
      fatG?: number | null;
      carbsG?: number | null;
      caloriesKcal?: number | null;
    } | null;
    pdfNutritionTotals?: {
      proteinG?: number | null;
      fatG?: number | null;
      carbsG?: number | null;
      caloriesKcal?: number | null;
    } | null;
    /** Prescrição hídrica vinculada ao plano (meta, intervalo, lembretes). */
    hydrationPrescription?: Record<string, unknown> | null;
    /** Lista de compras gerada a partir do plano. */
    shoppingList?: Record<string, unknown> | null;
    authorName?: string | null;
    createdAt: string;
    updatedAt: string;
  }> | null;

  /** Registros diários de consumo hídrico (app paciente). */
  hydrationLogs?: Array<{
    id: string;
    date: string;
    consumedMl: number;
    goalMl?: number | null;
    source?: "app" | "manual" | null;
    createdAt: string;
  }> | null;

  /** Feedback da paciente sobre hidratação (app). */
  hydrationFeedback?: Array<{
    id: string;
    message: string;
    createdAt: string;
    readAt?: string | null;
  }> | null;

  /** Registros de exames laboratoriais com biomarcadores. */
  exames?: Array<{
    id: string;
    title: string;
    collectedAt: string;
    labName?: string | null;
    notes?: string | null;
    status?: "draft" | "completed" | null;
    authorName?: string | null;
    biomarkers: Array<{
      id: string;
      markerId?: string | null;
      name: string;
      value: number;
      unit: string;
      refMin?: number | null;
      refMax?: number | null;
      category?: string | null;
    }>;
    createdAt: string;
    updatedAt: string;
  }> | null;
}

export interface PatientProfileResponse {
  profile: PatientProfileData;
  onboardingCompletedAt: string | null;
  isComplete: boolean;
  missingFields: string[];
}
