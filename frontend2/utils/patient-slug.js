import { isUuid, slugify } from './course-slug.ts'

export { isUuid, slugify }

function patientNameBase(patient) {
  return slugify(patient?.name || '') || (patient?.id ? `paciente-${patient.id.slice(0, 8)}` : '')
}

function patientEmailSlugPart(patient) {
  const local = String(patient?.email || '').split('@')[0] || ''
  return slugify(local)
}

/** Slug legível (legado) — inclui parte do e-mail quando o nome se repete. */
export function buildPatientLegacySlug(patient, patients = []) {
  const base = patientNameBase(patient)
  const sameNameCount = (patients || []).filter(
    (item) => patientNameBase(item) === base,
  ).length

  if (sameNameCount <= 1) return base

  const emailPart = patientEmailSlugPart(patient)
  if (emailPart) return `${base}-${emailPart}`.slice(0, 120)

  return `${base}-${patient.id.slice(0, 8)}`
}

export function assignPatientSlugs(patients) {
  const sorted = [...(patients || [])].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
    if (aTime !== bTime) return aTime - bTime
    return String(a.id).localeCompare(String(b.id))
  })

  const result = new Map()
  for (const patient of sorted) {
    result.set(patient.id, buildPatientLegacySlug(patient, sorted))
  }
  return result
}

/** Identificador canônico de rota — sempre o UUID (nunca confunde homônimos). */
export function getPatientUrlSlug(patient, _patients = null) {
  if (!patient?.id) return ''
  return patient.id
}

export function buildPatientPath(patient, options = {}) {
  const slug = getPatientUrlSlug(patient, options.patients)
  const suffix = options.suffix ? (options.suffix.startsWith('/') ? options.suffix : `/${options.suffix}`) : ''
  const path = `/pacientes/${encodeURIComponent(slug)}${suffix}`
  const query = options.query
  if (query && Object.keys(query).length) {
    return { path, query }
  }
  return path
}

/** Link de aba/subaba na ficha (mesma rota, query tab/sub). */
export function buildPatientChartTabLink(currentPath, tabId, options = {}) {
  const query = { ...(options.query || {}), tab: tabId }
  if (tabId === 'evolucao') {
    query.sub = options.sub || query.sub || 'checkins'
  } else {
    delete query.sub
    delete query.doc
  }
  return { path: currentPath, query }
}

/** Link para evolução a partir do id do paciente. */
export function buildPatientEvolucaoLink(patient, sub = 'checkins') {
  return buildPatientPath(patient, { query: { tab: 'evolucao', sub } })
}

export function patientRouteSuffixFromPath(path, routeParam) {
  const escaped = String(routeParam || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = String(path || '').match(new RegExp(`^/pacientes/${escaped}(\\/.*)?$`))
  return match?.[1] || ''
}
