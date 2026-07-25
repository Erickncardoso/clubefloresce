/** Estado global da anamnese flutuante — persiste ao trocar abas do prontuário. */
export function useFloatingAnamnese() {
  const patientId = useState('floating-anamnese-patient-id', () => '')
  const open = useState('floating-anamnese-open', () => false)
  const collapsed = useState('floating-anamnese-collapsed', () => false)
  const seed = useState('floating-anamnese-seed', () => null)

  function openEditor(pid, seedData = { type: 'new' }) {
    const id = String(pid || '').trim()
    if (!id) return
    patientId.value = id
    seed.value = seedData
    collapsed.value = false
    open.value = true
  }

  function closeEditor() {
    open.value = false
    collapsed.value = false
    seed.value = null
    patientId.value = ''
  }

  function toggleCollapsed() {
    collapsed.value = !collapsed.value
  }

  function setCollapsed(value) {
    collapsed.value = Boolean(value)
  }

  function isOpenForPatient(pid) {
    return open.value && patientId.value === String(pid || '').trim()
  }

  return {
    patientId,
    open,
    collapsed,
    seed,
    openEditor,
    closeEditor,
    toggleCollapsed,
    setCollapsed,
    isOpenForPatient,
  }
}
