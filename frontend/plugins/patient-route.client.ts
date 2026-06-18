export default defineNuxtPlugin(() => {
  const router = useRouter()

  function syncBellaChatShell(path: string) {
    if (!import.meta.client) return
    const onChat = path.startsWith('/bella/chat')
    document.documentElement.classList.toggle('bella-chat-active', onChat)
    document.body.classList.toggle('bella-chat-active', onChat)
  }

  syncBellaChatShell(router.currentRoute.value.path)

  router.afterEach((to) => {
    syncBellaChatShell(to.path)
    if (!import.meta.client) return
    if (to.path.startsWith('/bella/chat')) return
    const shell = document.querySelector('.patient-shell-body')
    if (shell instanceof HTMLElement) {
      shell.scrollTop = 0
    }
  })
})
