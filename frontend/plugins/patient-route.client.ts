export default defineNuxtPlugin(() => {
  const router = useRouter()

  router.afterEach((to) => {
    if (!import.meta.client) return
    if (to.path.startsWith('/bella/chat')) return
    const shell = document.querySelector('.patient-shell-body')
    if (shell instanceof HTMLElement) {
      shell.scrollTop = 0
    }
  })
})
