
import type { DefineComponent, SlotsType } from 'vue'
type IslandComponent<T> = DefineComponent<{}, {refresh: () => Promise<void>}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, SlotsType<{ fallback: { error: unknown } }>> & T

type HydrationStrategies = {
  hydrateOnVisible?: IntersectionObserverInit | true
  hydrateOnIdle?: number | true
  hydrateOnInteraction?: keyof HTMLElementEventMap | Array<keyof HTMLElementEventMap> | true
  hydrateOnMediaQuery?: string
  hydrateAfter?: number
  hydrateWhen?: boolean
  hydrateNever?: true
}
type LazyComponent<T> = DefineComponent<HydrationStrategies, {}, {}, {}, {}, {}, {}, { hydrated: () => void }> & T


export const GoalMiniPie: typeof import("../components/GoalMiniPie.vue")['default']
export const PatientAvatar: typeof import("../components/PatientAvatar.vue")['default']
export const PatientHeader: typeof import("../components/PatientHeader.vue")['default']
export const PatientMenuDrawer: typeof import("../components/PatientMenuDrawer.vue")['default']
export const PatientPwaPrompt: typeof import("../components/PatientPwaPrompt.vue")['default']
export const PatientTabBar: typeof import("../components/PatientTabBar.vue")['default']
export const PlayerHeader: typeof import("../components/PlayerHeader.vue")['default']
export const PlayerNavigation: typeof import("../components/PlayerNavigation.vue")['default']
export const BellaActionSheet: typeof import("../components/bella/BellaActionSheet.vue")['default']
export const BellaDailyDiaryBar: typeof import("../components/bella/DailyDiaryBar.vue")['default']
export const BellaMealConfirmModal: typeof import("../components/bella/MealConfirmModal.vue")['default']
export const BibliotecaScrollRow: typeof import("../components/biblioteca/BibliotecaScrollRow.vue")['default']
export const CheckinTypeformFlow: typeof import("../components/checkin/CheckinTypeformFlow.vue")['default']
export const CheckinFoodMoodPicker: typeof import("../components/checkin/FoodMoodPicker.vue")['default']
export const CheckinNotoEmojiLottie: typeof import("../components/checkin/NotoEmojiLottie.client.vue")['default']
export const DietaMealPlanUploadCard: typeof import("../components/dieta/MealPlanUploadCard.vue")['default']
export const DietaMealSubstitutionsModal: typeof import("../components/dieta/MealSubstitutionsModal.vue")['default']
export const HomeCurrentMealCard: typeof import("../components/home/CurrentMealCard.vue")['default']
export const HomeJourneyMacroRing: typeof import("../components/home/JourneyMacroRing.vue")['default']
export const HomeMacroBar: typeof import("../components/home/MacroBar.vue")['default']
export const HomeMacroPizzaRing: typeof import("../components/home/MacroPizzaRing.vue")['default']
export const HomeNutritionPanel: typeof import("../components/home/NutritionPanel.vue")['default']
export const HomeNutritionStatCarousel: typeof import("../components/home/NutritionStatCarousel.vue")['default']
export const SharedCfTileCarousel: typeof import("../components/shared/CfTileCarousel.vue")['default']
export const WhatsappBusinessProfileModal: typeof import("../components/whatsapp/BusinessProfileModal.vue")['default']
export const WhatsappChatBody: typeof import("../components/whatsapp/ChatBody.vue")['default']
export const WhatsappChatFooter: typeof import("../components/whatsapp/ChatFooter.vue")['default']
export const WhatsappChatHeader: typeof import("../components/whatsapp/ChatHeader.vue")['default']
export const WhatsappChatMessageActionsPanel: typeof import("../components/whatsapp/ChatMessageActionsPanel.vue")['default']
export const WhatsappChatSidebar: typeof import("../components/whatsapp/ChatSidebar.vue")['default']
export const WhatsappCreateGroupModal: typeof import("../components/whatsapp/CreateGroupModal.vue")['default']
export const WhatsappDocumentViewerModal: typeof import("../components/whatsapp/DocumentViewerModal.vue")['default']
export const WhatsappGroupInfoModal: typeof import("../components/whatsapp/GroupInfoModal.vue")['default']
export const WhatsappGroupMediaDocsModal: typeof import("../components/whatsapp/GroupMediaDocsModal.vue")['default']
export const WhatsappGroupMessageList: typeof import("../components/whatsapp/GroupMessageList.vue")['default']
export const WhatsappGroupPickerModal: typeof import("../components/whatsapp/GroupPickerModal.vue")['default']
export const WhatsappInteractiveButtonsBuilder: typeof import("../components/whatsapp/InteractiveButtonsBuilder.vue")['default']
export const WhatsappInteractiveCarouselBuilder: typeof import("../components/whatsapp/InteractiveCarouselBuilder.vue")['default']
export const WhatsappInteractiveListBuilder: typeof import("../components/whatsapp/InteractiveListBuilder.vue")['default']
export const WhatsappInteractiveMessagePreview: typeof import("../components/whatsapp/InteractiveMessagePreview.vue")['default']
export const WhatsappInteractivePreviewSideModal: typeof import("../components/whatsapp/InteractivePreviewSideModal.vue")['default']
export const WhatsappMediaComposerModal: typeof import("../components/whatsapp/MediaComposerModal.vue")['default']
export const WhatsappPollComposerModal: typeof import("../components/whatsapp/PollComposerModal.vue")['default']
export const WhatsappPrivateMessageList: typeof import("../components/whatsapp/PrivateMessageList.vue")['default']
export const WhatsappSaveContactModal: typeof import("../components/whatsapp/SaveContactModal.vue")['default']
export const WhatsappSendContactsModal: typeof import("../components/whatsapp/SendContactsModal.vue")['default']
export const NuxtWelcome: typeof import("../node_modules/nuxt/dist/app/components/welcome.vue")['default']
export const NuxtLayout: typeof import("../node_modules/nuxt/dist/app/components/nuxt-layout")['default']
export const NuxtErrorBoundary: typeof import("../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']
export const ClientOnly: typeof import("../node_modules/nuxt/dist/app/components/client-only")['default']
export const DevOnly: typeof import("../node_modules/nuxt/dist/app/components/dev-only")['default']
export const ServerPlaceholder: typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']
export const NuxtLink: typeof import("../node_modules/nuxt/dist/app/components/nuxt-link")['default']
export const NuxtLoadingIndicator: typeof import("../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']
export const NuxtTime: typeof import("../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']
export const NuxtRouteAnnouncer: typeof import("../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']
export const NuxtImg: typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']
export const NuxtPicture: typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']
export const VitePwaManifest: typeof import("../node_modules/@vite-pwa/nuxt/dist/runtime/components/VitePwaManifest")['default']
export const NuxtPwaManifest: typeof import("../node_modules/@vite-pwa/nuxt/dist/runtime/components/VitePwaManifest")['default']
export const NuxtPwaAssets: typeof import("../node_modules/@vite-pwa/nuxt/dist/runtime/components/NuxtPwaAssets")['default']
export const PwaAppleImage: typeof import("../node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaAppleImage.vue")['default']
export const PwaAppleSplashScreenImage: typeof import("../node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaAppleSplashScreenImage.vue")['default']
export const PwaFaviconImage: typeof import("../node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaFaviconImage.vue")['default']
export const PwaMaskableImage: typeof import("../node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaMaskableImage.vue")['default']
export const PwaTransparentImage: typeof import("../node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaTransparentImage.vue")['default']
export const NuxtPage: typeof import("../node_modules/nuxt/dist/pages/runtime/page")['default']
export const NoScript: typeof import("../node_modules/nuxt/dist/head/runtime/components")['NoScript']
export const Link: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Link']
export const Base: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Base']
export const Title: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Title']
export const Meta: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Meta']
export const Style: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Style']
export const Head: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Head']
export const Html: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Html']
export const Body: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Body']
export const NuxtIsland: typeof import("../node_modules/nuxt/dist/app/components/nuxt-island")['default']
export const LazyGoalMiniPie: LazyComponent<typeof import("../components/GoalMiniPie.vue")['default']>
export const LazyPatientAvatar: LazyComponent<typeof import("../components/PatientAvatar.vue")['default']>
export const LazyPatientHeader: LazyComponent<typeof import("../components/PatientHeader.vue")['default']>
export const LazyPatientMenuDrawer: LazyComponent<typeof import("../components/PatientMenuDrawer.vue")['default']>
export const LazyPatientPwaPrompt: LazyComponent<typeof import("../components/PatientPwaPrompt.vue")['default']>
export const LazyPatientTabBar: LazyComponent<typeof import("../components/PatientTabBar.vue")['default']>
export const LazyPlayerHeader: LazyComponent<typeof import("../components/PlayerHeader.vue")['default']>
export const LazyPlayerNavigation: LazyComponent<typeof import("../components/PlayerNavigation.vue")['default']>
export const LazyBellaActionSheet: LazyComponent<typeof import("../components/bella/BellaActionSheet.vue")['default']>
export const LazyBellaDailyDiaryBar: LazyComponent<typeof import("../components/bella/DailyDiaryBar.vue")['default']>
export const LazyBellaMealConfirmModal: LazyComponent<typeof import("../components/bella/MealConfirmModal.vue")['default']>
export const LazyBibliotecaScrollRow: LazyComponent<typeof import("../components/biblioteca/BibliotecaScrollRow.vue")['default']>
export const LazyCheckinTypeformFlow: LazyComponent<typeof import("../components/checkin/CheckinTypeformFlow.vue")['default']>
export const LazyCheckinFoodMoodPicker: LazyComponent<typeof import("../components/checkin/FoodMoodPicker.vue")['default']>
export const LazyCheckinNotoEmojiLottie: LazyComponent<typeof import("../components/checkin/NotoEmojiLottie.client.vue")['default']>
export const LazyDietaMealPlanUploadCard: LazyComponent<typeof import("../components/dieta/MealPlanUploadCard.vue")['default']>
export const LazyDietaMealSubstitutionsModal: LazyComponent<typeof import("../components/dieta/MealSubstitutionsModal.vue")['default']>
export const LazyHomeCurrentMealCard: LazyComponent<typeof import("../components/home/CurrentMealCard.vue")['default']>
export const LazyHomeJourneyMacroRing: LazyComponent<typeof import("../components/home/JourneyMacroRing.vue")['default']>
export const LazyHomeMacroBar: LazyComponent<typeof import("../components/home/MacroBar.vue")['default']>
export const LazyHomeMacroPizzaRing: LazyComponent<typeof import("../components/home/MacroPizzaRing.vue")['default']>
export const LazyHomeNutritionPanel: LazyComponent<typeof import("../components/home/NutritionPanel.vue")['default']>
export const LazyHomeNutritionStatCarousel: LazyComponent<typeof import("../components/home/NutritionStatCarousel.vue")['default']>
export const LazySharedCfTileCarousel: LazyComponent<typeof import("../components/shared/CfTileCarousel.vue")['default']>
export const LazyWhatsappBusinessProfileModal: LazyComponent<typeof import("../components/whatsapp/BusinessProfileModal.vue")['default']>
export const LazyWhatsappChatBody: LazyComponent<typeof import("../components/whatsapp/ChatBody.vue")['default']>
export const LazyWhatsappChatFooter: LazyComponent<typeof import("../components/whatsapp/ChatFooter.vue")['default']>
export const LazyWhatsappChatHeader: LazyComponent<typeof import("../components/whatsapp/ChatHeader.vue")['default']>
export const LazyWhatsappChatMessageActionsPanel: LazyComponent<typeof import("../components/whatsapp/ChatMessageActionsPanel.vue")['default']>
export const LazyWhatsappChatSidebar: LazyComponent<typeof import("../components/whatsapp/ChatSidebar.vue")['default']>
export const LazyWhatsappCreateGroupModal: LazyComponent<typeof import("../components/whatsapp/CreateGroupModal.vue")['default']>
export const LazyWhatsappDocumentViewerModal: LazyComponent<typeof import("../components/whatsapp/DocumentViewerModal.vue")['default']>
export const LazyWhatsappGroupInfoModal: LazyComponent<typeof import("../components/whatsapp/GroupInfoModal.vue")['default']>
export const LazyWhatsappGroupMediaDocsModal: LazyComponent<typeof import("../components/whatsapp/GroupMediaDocsModal.vue")['default']>
export const LazyWhatsappGroupMessageList: LazyComponent<typeof import("../components/whatsapp/GroupMessageList.vue")['default']>
export const LazyWhatsappGroupPickerModal: LazyComponent<typeof import("../components/whatsapp/GroupPickerModal.vue")['default']>
export const LazyWhatsappInteractiveButtonsBuilder: LazyComponent<typeof import("../components/whatsapp/InteractiveButtonsBuilder.vue")['default']>
export const LazyWhatsappInteractiveCarouselBuilder: LazyComponent<typeof import("../components/whatsapp/InteractiveCarouselBuilder.vue")['default']>
export const LazyWhatsappInteractiveListBuilder: LazyComponent<typeof import("../components/whatsapp/InteractiveListBuilder.vue")['default']>
export const LazyWhatsappInteractiveMessagePreview: LazyComponent<typeof import("../components/whatsapp/InteractiveMessagePreview.vue")['default']>
export const LazyWhatsappInteractivePreviewSideModal: LazyComponent<typeof import("../components/whatsapp/InteractivePreviewSideModal.vue")['default']>
export const LazyWhatsappMediaComposerModal: LazyComponent<typeof import("../components/whatsapp/MediaComposerModal.vue")['default']>
export const LazyWhatsappPollComposerModal: LazyComponent<typeof import("../components/whatsapp/PollComposerModal.vue")['default']>
export const LazyWhatsappPrivateMessageList: LazyComponent<typeof import("../components/whatsapp/PrivateMessageList.vue")['default']>
export const LazyWhatsappSaveContactModal: LazyComponent<typeof import("../components/whatsapp/SaveContactModal.vue")['default']>
export const LazyWhatsappSendContactsModal: LazyComponent<typeof import("../components/whatsapp/SendContactsModal.vue")['default']>
export const LazyNuxtWelcome: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/welcome.vue")['default']>
export const LazyNuxtLayout: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-layout")['default']>
export const LazyNuxtErrorBoundary: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']>
export const LazyClientOnly: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/client-only")['default']>
export const LazyDevOnly: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/dev-only")['default']>
export const LazyServerPlaceholder: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']>
export const LazyNuxtLink: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-link")['default']>
export const LazyNuxtLoadingIndicator: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']>
export const LazyNuxtTime: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']>
export const LazyNuxtRouteAnnouncer: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']>
export const LazyNuxtImg: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']>
export const LazyNuxtPicture: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']>
export const LazyVitePwaManifest: LazyComponent<typeof import("../node_modules/@vite-pwa/nuxt/dist/runtime/components/VitePwaManifest")['default']>
export const LazyNuxtPwaManifest: LazyComponent<typeof import("../node_modules/@vite-pwa/nuxt/dist/runtime/components/VitePwaManifest")['default']>
export const LazyNuxtPwaAssets: LazyComponent<typeof import("../node_modules/@vite-pwa/nuxt/dist/runtime/components/NuxtPwaAssets")['default']>
export const LazyPwaAppleImage: LazyComponent<typeof import("../node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaAppleImage.vue")['default']>
export const LazyPwaAppleSplashScreenImage: LazyComponent<typeof import("../node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaAppleSplashScreenImage.vue")['default']>
export const LazyPwaFaviconImage: LazyComponent<typeof import("../node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaFaviconImage.vue")['default']>
export const LazyPwaMaskableImage: LazyComponent<typeof import("../node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaMaskableImage.vue")['default']>
export const LazyPwaTransparentImage: LazyComponent<typeof import("../node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaTransparentImage.vue")['default']>
export const LazyNuxtPage: LazyComponent<typeof import("../node_modules/nuxt/dist/pages/runtime/page")['default']>
export const LazyNoScript: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['NoScript']>
export const LazyLink: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Link']>
export const LazyBase: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Base']>
export const LazyTitle: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Title']>
export const LazyMeta: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Meta']>
export const LazyStyle: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Style']>
export const LazyHead: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Head']>
export const LazyHtml: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Html']>
export const LazyBody: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Body']>
export const LazyNuxtIsland: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-island")['default']>

export const componentNames: string[]
