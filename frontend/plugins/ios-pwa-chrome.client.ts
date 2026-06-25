import { installIOSPwaChromeGuard } from '~/utils/ios-pwa-chrome'

export default defineNuxtPlugin(() => {
  if (import.meta.server) return

  const config = useRuntimeConfig()
  if (!config.public.mobileApp) return

  document.documentElement.classList.add('cf-mobile-app')
  installIOSPwaChromeGuard()
})
