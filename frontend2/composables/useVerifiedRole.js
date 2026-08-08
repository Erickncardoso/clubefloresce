/** Role verificada no backend — nunca ler localStorage.user_role. */

export function useVerifiedRole() {
  const { verifiedUser, verifiedRole } = useAuthSession()

  const isNutricionista = computed(() => verifiedRole.value === 'NUTRICIONISTA')
  const isPaciente = computed(() => verifiedRole.value === 'PACIENTE')

  return {
    verifiedUser,
    verifiedRole,
    isNutricionista,
    isPaciente,
  }
}
