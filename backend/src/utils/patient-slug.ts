import { isUuid, slugify } from "./slug";

export type PatientSlugItem = {
  id: string;
  name?: string | null;
  email?: string | null;
  createdAt?: Date | string | null;
};

function comparePatients(a: PatientSlugItem, b: PatientSlugItem): number {
  const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (aTime !== bTime) return aTime - bTime;
  return String(a.id).localeCompare(String(b.id));
}

function patientNameBase(patient: PatientSlugItem): string {
  return slugify(patient.name || "") || `paciente-${patient.id.slice(0, 8)}`;
}

function patientEmailSlugPart(patient: PatientSlugItem): string {
  const local = String(patient.email || "").split("@")[0] || "";
  return slugify(local);
}

/** Slug legível para URLs antigas — inclui e-mail quando o nome se repete. */
export function buildPatientLegacySlug(
  patient: PatientSlugItem,
  patients: PatientSlugItem[],
): string {
  const base = patientNameBase(patient);
  const sameNameCount = patients.filter(
    (item) => patientNameBase(item) === base,
  ).length;

  if (sameNameCount <= 1) return base;

  const emailPart = patientEmailSlugPart(patient);
  if (emailPart) return `${base}-${emailPart}`.slice(0, 120);

  return `${base}-${patient.id.slice(0, 8)}`;
}

export function assignPatientSlugs(patients: PatientSlugItem[]): Map<string, string> {
  const sorted = [...patients].sort(comparePatients);
  const result = new Map<string, string>();

  for (const patient of sorted) {
    result.set(patient.id, buildPatientLegacySlug(patient, sorted));
  }

  return result;
}

/** Identificador canônico de rota — sempre o UUID do paciente. */
export function getPatientUrlSlug(
  patient: PatientSlugItem,
  _patients?: PatientSlugItem[] | null,
): string {
  if (!patient?.id) return "";
  return patient.id;
}

export function findPatientBySlug<T extends PatientSlugItem>(
  patients: T[],
  slug: string,
): T | null {
  const param = String(slug || "").trim();
  if (!param || !patients.length) return null;

  if (isUuid(param)) {
    return patients.find((patient) => patient.id === param) ?? null;
  }

  const sorted = [...patients].sort(comparePatients);
  const legacySlugs = assignPatientSlugs(sorted);
  const byLegacySlug = sorted.find((patient) => legacySlugs.get(patient.id) === param);
  if (byLegacySlug) return byLegacySlug;

  const nameMatches = sorted.filter((patient) => patientNameBase(patient) === param);
  if (nameMatches.length === 1) return nameMatches[0];

  return null;
}
