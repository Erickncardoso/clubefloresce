export default defineNuxtPlugin(() => {
  const router = useRouter()

  const cleanupLegacyShellClasses = () => {
    if (!import.meta.client) return
    document.documentElement.classList.remove('bella-chat-active')
    document.body.classList.remove('bella-chat-active')
  }

  cleanupLegacyShellClasses()

  router.afterEach((to) => {
    cleanupLegacyShellClasses()
    if (!import.meta.client) return
    if (to.path.startsWith('/bella/chat')) return
    const shell = document.querySelector('.patient-shell-body')
    if (shell instanceof HTMLElement) {
      shell.scrollTop = 0
    }
  })
})
