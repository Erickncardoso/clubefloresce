/** Suprime a tab bar do PWA (ex.: fluxo typeform em tela cheia). */
export function usePatientTabBar() {
  const suppressed = useState('patient-tab-bar-suppressed', () => false)

  function suppress() {
    suppressed.value = true
  }

  function release() {
    suppressed.value = false
  }

  return { suppressed, suppress, release }
}
