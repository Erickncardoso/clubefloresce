import { installIOSPwaChromeGuard } from '~/utils/ios-pwa-chrome'
import { isStandalonePwa } from '~/utils/pwa-standalone'

export default defineNuxtPlugin(() => {
  if (import.meta.server) return

  const config = useRuntimeConfig()
  if (!config.public.mobileApp) return

  document.documentElement.classList.add('cf-mobile-app')

  if (isStandalonePwa()) {
    // PWA instalado: não aplicar --cf-vvh nem bloquear scroll do documento
    return
  }

  document.documentElement.classList.add('cf-safari-inline')

  installIOSPwaChromeGuard()
})
