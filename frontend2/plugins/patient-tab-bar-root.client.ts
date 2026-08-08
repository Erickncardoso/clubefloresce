import { installPatientTabBarDock } from '~/utils/patient-tab-bar-dock.mjs'

const ROOT_ID = 'cf-tab-bar-root'

export default defineNuxtPlugin(() => {
  if (import.meta.server) return

  const config = useRuntimeConfig()
  if (!config.public.mobileApp) return

  if (!document.getElementById(ROOT_ID)) {
    const root = document.createElement('div')
    root.id = ROOT_ID
    root.setAttribute('aria-hidden', 'true')
    document.documentElement.appendChild(root)
  }

  const cleanupDock = installPatientTabBarDock()

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      cleanupDock()
    })
  }
})
