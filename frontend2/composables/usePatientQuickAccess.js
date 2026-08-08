export function usePatientQuickAccess() {
  const open = useState('patient-quick-access-open', () => false)

  function setOpen(value) {
    open.value = Boolean(value)
  }

  function toggle() {
    open.value = !open.value
  }

  function close() {
    open.value = false
  }

  return { open, setOpen, toggle, close }
}
