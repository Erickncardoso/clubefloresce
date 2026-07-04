export type PatientUser = {
  id: string;
  role: string;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
  plan?: string | null;
  accessExpiresAt?: string | null;
  approvalEmailSentAt?: string | null;
  createdAt?: string | null;
};

export type OnboardingStatus = {
  isComplete: boolean;
  missingFields?: string[];
};

export type LoginResult = {
  user: PatientUser;
  token?: string;
  mustChangePassword?: boolean;
};
