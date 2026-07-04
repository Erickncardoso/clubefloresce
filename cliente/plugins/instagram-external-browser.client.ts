import { redirectFromInstagramInAppBrowser } from '~/utils/instagram-external-browser'

export default defineNuxtPlugin({
  name: 'instagram-external-browser',
  enforce: 'pre',
  setup() {
    redirectFromInstagramInAppBrowser()
  },
})
