/**
 * Chamadas de auth sem sessão (login, esqueci senha, redefinir senha).
 * Evita o $fetch global do patient-session (credentials + redirect).
 */
export function createPublicAuthFetch(apiBase) {
  return $fetch.create({
    credentials: 'omit',
    baseURL: apiBase,
  })
}
