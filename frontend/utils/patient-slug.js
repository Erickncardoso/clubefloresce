import { isUuid, slugify, assignSlugs } from './course-slug.ts'

export { isUuid, slugify }

export function assignPatientSlugs(patients) {
  return assignSlugs(
    (patients || []).map((patient) => ({
      id: patient.id,
      title: patient.name || '',
    })),
  )
}

export function getPatientUrlSlug(patient, patients = null) {
  if (!patient?.id) return ''
  if (patient.urlSlug) return patient.urlSlug
  if (patients?.length) {
    return assignPatientSlugs(patients).get(patient.id) || slugify(patient.name || '') || patient.id
  }
  return slugify(patient.name || '') || patient.id
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

/** Link para evolução a partir do id/slug do paciente. */
export function buildPatientEvolucaoLink(patient, sub = 'checkins') {
  return buildPatientPath(patient, { query: { tab: 'evolucao', sub } })
}

export function patientRouteSuffixFromPath(path, routeParam) {
  const escaped = String(routeParam || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = String(path || '').match(new RegExp(`^/pacientes/${escaped}(\\/.*)?$`))
  return match?.[1] || ''
}
