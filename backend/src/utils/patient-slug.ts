import { isUuid, slugify } from "./slug";

type PatientSlugItem = { id: string; name?: string | null };

export function assignPatientSlugs(patients: PatientSlugItem[]): Map<string, string> {
  const used = new Map<string, number>();
  const result = new Map<string, string>();

  for (const patient of patients) {
    const base = slugify(patient.name || "") || `paciente-${patient.id.slice(0, 8)}`;
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    result.set(patient.id, count === 1 ? base : `${base}-${count}`);
  }

  return result;
}

export function getPatientUrlSlug(
  patient: PatientSlugItem,
  patients?: PatientSlugItem[] | null,
): string {
  if (!patient?.id) return "";
  if (patients?.length) {
    return assignPatientSlugs(patients).get(patient.id) || slugify(patient.name || "") || patient.id;
  }
  return slugify(patient.name || "") || patient.id;
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

  const slugs = assignPatientSlugs(patients);
  const byAssignedSlug = patients.find((patient) => slugs.get(patient.id) === param);
  if (byAssignedSlug) return byAssignedSlug;

  return patients.find((patient) => slugify(patient.name || "") === param) ?? null;
}
