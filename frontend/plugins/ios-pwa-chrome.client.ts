import {
  installIOSPwaChromeGuard,
  installIOSPwaViewportSync,
  isIOSDevice,
} from '~/utils/ios-pwa-chrome'
import { isStandalonePwa } from '~/utils/pwa-standalone'

export default defineNuxtPlugin(() => {
  if (import.meta.server) return

  const config = useRuntimeConfig()
  if (!config.public.mobileApp) return

  document.documentElement.classList.add('cf-mobile-app')

  const ios = isIOSDevice()
  const standalone = isStandalonePwa()

  if (ios) {
    document.documentElement.classList.add('cf-ios')
  }

  if (standalone) {
    if (ios) {
      document.documentElement.classList.add('cf-ios-pwa')
      installIOSPwaViewportSync()
    }
    return
  }

  document.documentElement.classList.add('cf-safari-inline')

  if (ios) {
    installIOSPwaChromeGuard()
  }
})
