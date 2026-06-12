
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

interface _GlobalComponents {
  CfConfirmModal: typeof import("../../components/CfConfirmModal.vue")['default']
  GoalMiniPie: typeof import("../../components/GoalMiniPie.vue")['default']
  PatientAvatar: typeof import("../../components/PatientAvatar.vue")['default']
  PatientHeader: typeof import("../../components/PatientHeader.vue")['default']
  PatientMenuDrawer: typeof import("../../components/PatientMenuDrawer.vue")['default']
  PatientPwaPrompt: typeof import("../../components/PatientPwaPrompt.vue")['default']
  PatientTabBar: typeof import("../../components/PatientTabBar.vue")['default']
  PlayerHeader: typeof import("../../components/PlayerHeader.vue")['default']
  PlayerNavigation: typeof import("../../components/PlayerNavigation.vue")['default']
  BellaActionSheet: typeof import("../../components/bella/BellaActionSheet.vue")['default']
  BellaDailyDiaryBar: typeof import("../../components/bella/DailyDiaryBar.vue")['default']
  BellaFoodSearchPicker: typeof import("../../components/bella/FoodSearchPicker.vue")['default']
  BellaMealConfirmModal: typeof import("../../components/bella/MealConfirmModal.vue")['default']
  BibliotecaScrollRow: typeof import("../../components/biblioteca/BibliotecaScrollRow.vue")['default']
  CheckinTypeformFlow: typeof import("../../components/checkin/CheckinTypeformFlow.vue")['default']
  CheckinFoodMoodPicker: typeof import("../../components/checkin/FoodMoodPicker.vue")['default']
  CheckinNotoEmojiLottie: typeof import("../../components/checkin/NotoEmojiLottie.client.vue")['default']
  CommunityFeed: typeof import("../../components/community/CommunityFeed.vue")['default']
  DietaMealPlanUploadCard: typeof import("../../components/dieta/MealPlanUploadCard.vue")['default']
  DietaMealSubstitutionsModal: typeof import("../../components/dieta/MealSubstitutionsModal.vue")['default']
  HomeCurrentMealCard: typeof import("../../components/home/CurrentMealCard.vue")['default']
  HomeJourneyMacroRing: typeof import("../../components/home/JourneyMacroRing.vue")['default']
  HomeMacroBar: typeof import("../../components/home/MacroBar.vue")['default']
  HomeMacroPizzaRing: typeof import("../../components/home/MacroPizzaRing.vue")['default']
  HomeNutritionPanel: typeof import("../../components/home/NutritionPanel.vue")['default']
  HomeNutritionStatCarousel: typeof import("../../components/home/NutritionStatCarousel.vue")['default']
  SharedCfTileActionsMenu: typeof import("../../components/shared/CfTileActionsMenu.vue")['default']
  SharedCfTileCarousel: typeof import("../../components/shared/CfTileCarousel.vue")['default']
  WhatsappBusinessProfileModal: typeof import("../../components/whatsapp/BusinessProfileModal.vue")['default']
  WhatsappChatBody: typeof import("../../components/whatsapp/ChatBody.vue")['default']
  WhatsappChatFooter: typeof import("../../components/whatsapp/ChatFooter.vue")['default']
  WhatsappChatHeader: typeof import("../../components/whatsapp/ChatHeader.vue")['default']
  WhatsappChatMessageActionsPanel: typeof import("../../components/whatsapp/ChatMessageActionsPanel.vue")['default']
  WhatsappChatSidebar: typeof import("../../components/whatsapp/ChatSidebar.vue")['default']
  WhatsappCreateGroupModal: typeof import("../../components/whatsapp/CreateGroupModal.vue")['default']
  WhatsappDocumentViewerModal: typeof import("../../components/whatsapp/DocumentViewerModal.vue")['default']
  WhatsappGroupInfoModal: typeof import("../../components/whatsapp/GroupInfoModal.vue")['default']
  WhatsappGroupMediaDocsModal: typeof import("../../components/whatsapp/GroupMediaDocsModal.vue")['default']
  WhatsappGroupMessageList: typeof import("../../components/whatsapp/GroupMessageList.vue")['default']
  WhatsappGroupPickerModal: typeof import("../../components/whatsapp/GroupPickerModal.vue")['default']
  WhatsappInteractiveButtonsBuilder: typeof import("../../components/whatsapp/InteractiveButtonsBuilder.vue")['default']
  WhatsappInteractiveCarouselBuilder: typeof import("../../components/whatsapp/InteractiveCarouselBuilder.vue")['default']
  WhatsappInteractiveListBuilder: typeof import("../../components/whatsapp/InteractiveListBuilder.vue")['default']
  WhatsappInteractiveMessagePreview: typeof import("../../components/whatsapp/InteractiveMessagePreview.vue")['default']
  WhatsappInteractivePreviewSideModal: typeof import("../../components/whatsapp/InteractivePreviewSideModal.vue")['default']
  WhatsappMediaComposerModal: typeof import("../../components/whatsapp/MediaComposerModal.vue")['default']
  WhatsappPollComposerModal: typeof import("../../components/whatsapp/PollComposerModal.vue")['default']
  WhatsappPrivateMessageList: typeof import("../../components/whatsapp/PrivateMessageList.vue")['default']
  WhatsappSaveContactModal: typeof import("../../components/whatsapp/SaveContactModal.vue")['default']
  WhatsappSendContactsModal: typeof import("../../components/whatsapp/SendContactsModal.vue")['default']
  NuxtWelcome: typeof import("../../node_modules/nuxt/dist/app/components/welcome.vue")['default']
  NuxtLayout: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-layout")['default']
  NuxtErrorBoundary: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']
  ClientOnly: typeof import("../../node_modules/nuxt/dist/app/components/client-only")['default']
  DevOnly: typeof import("../../node_modules/nuxt/dist/app/components/dev-only")['default']
  ServerPlaceholder: typeof import("../../node_modules/nuxt/dist/app/components/server-placeholder")['default']
  NuxtLink: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-link")['default']
  NuxtLoadingIndicator: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']
  NuxtTime: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']
  NuxtRouteAnnouncer: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']
  NuxtImg: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']
  NuxtPicture: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']
  VitePwaManifest: typeof import("../../node_modules/@vite-pwa/nuxt/dist/runtime/components/VitePwaManifest")['default']
  NuxtPwaManifest: typeof import("../../node_modules/@vite-pwa/nuxt/dist/runtime/components/VitePwaManifest")['default']
  NuxtPwaAssets: typeof import("../../node_modules/@vite-pwa/nuxt/dist/runtime/components/NuxtPwaAssets")['default']
  PwaAppleImage: typeof import("../../node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaAppleImage.vue")['default']
  PwaAppleSplashScreenImage: typeof import("../../node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaAppleSplashScreenImage.vue")['default']
  PwaFaviconImage: typeof import("../../node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaFaviconImage.vue")['default']
  PwaMaskableImage: typeof import("../../node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaMaskableImage.vue")['default']
  PwaTransparentImage: typeof import("../../node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaTransparentImage.vue")['default']
  NuxtPage: typeof import("../../node_modules/nuxt/dist/pages/runtime/page")['default']
  NoScript: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['NoScript']
  Link: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Link']
  Base: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Base']
  Title: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Title']
  Meta: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Meta']
  Style: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Style']
  Head: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Head']
  Html: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Html']
  Body: typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Body']
  NuxtIsland: typeof import("../../node_modules/nuxt/dist/app/components/nuxt-island")['default']
  LazyCfConfirmModal: LazyComponent<typeof import("../../components/CfConfirmModal.vue")['default']>
  LazyGoalMiniPie: LazyComponent<typeof import("../../components/GoalMiniPie.vue")['default']>
  LazyPatientAvatar: LazyComponent<typeof import("../../components/PatientAvatar.vue")['default']>
  LazyPatientHeader: LazyComponent<typeof import("../../components/PatientHeader.vue")['default']>
  LazyPatientMenuDrawer: LazyComponent<typeof import("../../components/PatientMenuDrawer.vue")['default']>
  LazyPatientPwaPrompt: LazyComponent<typeof import("../../components/PatientPwaPrompt.vue")['default']>
  LazyPatientTabBar: LazyComponent<typeof import("../../components/PatientTabBar.vue")['default']>
  LazyPlayerHeader: LazyComponent<typeof import("../../components/PlayerHeader.vue")['default']>
  LazyPlayerNavigation: LazyComponent<typeof import("../../components/PlayerNavigation.vue")['default']>
  LazyBellaActionSheet: LazyComponent<typeof import("../../components/bella/BellaActionSheet.vue")['default']>
  LazyBellaDailyDiaryBar: LazyComponent<typeof import("../../components/bella/DailyDiaryBar.vue")['default']>
  LazyBellaFoodSearchPicker: LazyComponent<typeof import("../../components/bella/FoodSearchPicker.vue")['default']>
  LazyBellaMealConfirmModal: LazyComponent<typeof import("../../components/bella/MealConfirmModal.vue")['default']>
  LazyBibliotecaScrollRow: LazyComponent<typeof import("../../components/biblioteca/BibliotecaScrollRow.vue")['default']>
  LazyCheckinTypeformFlow: LazyComponent<typeof import("../../components/checkin/CheckinTypeformFlow.vue")['default']>
  LazyCheckinFoodMoodPicker: LazyComponent<typeof import("../../components/checkin/FoodMoodPicker.vue")['default']>
  LazyCheckinNotoEmojiLottie: LazyComponent<typeof import("../../components/checkin/NotoEmojiLottie.client.vue")['default']>
  LazyCommunityFeed: LazyComponent<typeof import("../../components/community/CommunityFeed.vue")['default']>
  LazyDietaMealPlanUploadCard: LazyComponent<typeof import("../../components/dieta/MealPlanUploadCard.vue")['default']>
  LazyDietaMealSubstitutionsModal: LazyComponent<typeof import("../../components/dieta/MealSubstitutionsModal.vue")['default']>
  LazyHomeCurrentMealCard: LazyComponent<typeof import("../../components/home/CurrentMealCard.vue")['default']>
  LazyHomeJourneyMacroRing: LazyComponent<typeof import("../../components/home/JourneyMacroRing.vue")['default']>
  LazyHomeMacroBar: LazyComponent<typeof import("../../components/home/MacroBar.vue")['default']>
  LazyHomeMacroPizzaRing: LazyComponent<typeof import("../../components/home/MacroPizzaRing.vue")['default']>
  LazyHomeNutritionPanel: LazyComponent<typeof import("../../components/home/NutritionPanel.vue")['default']>
  LazyHomeNutritionStatCarousel: LazyComponent<typeof import("../../components/home/NutritionStatCarousel.vue")['default']>
  LazySharedCfTileActionsMenu: LazyComponent<typeof import("../../components/shared/CfTileActionsMenu.vue")['default']>
  LazySharedCfTileCarousel: LazyComponent<typeof import("../../components/shared/CfTileCarousel.vue")['default']>
  LazyWhatsappBusinessProfileModal: LazyComponent<typeof import("../../components/whatsapp/BusinessProfileModal.vue")['default']>
  LazyWhatsappChatBody: LazyComponent<typeof import("../../components/whatsapp/ChatBody.vue")['default']>
  LazyWhatsappChatFooter: LazyComponent<typeof import("../../components/whatsapp/ChatFooter.vue")['default']>
  LazyWhatsappChatHeader: LazyComponent<typeof import("../../components/whatsapp/ChatHeader.vue")['default']>
  LazyWhatsappChatMessageActionsPanel: LazyComponent<typeof import("../../components/whatsapp/ChatMessageActionsPanel.vue")['default']>
  LazyWhatsappChatSidebar: LazyComponent<typeof import("../../components/whatsapp/ChatSidebar.vue")['default']>
  LazyWhatsappCreateGroupModal: LazyComponent<typeof import("../../components/whatsapp/CreateGroupModal.vue")['default']>
  LazyWhatsappDocumentViewerModal: LazyComponent<typeof import("../../components/whatsapp/DocumentViewerModal.vue")['default']>
  LazyWhatsappGroupInfoModal: LazyComponent<typeof import("../../components/whatsapp/GroupInfoModal.vue")['default']>
  LazyWhatsappGroupMediaDocsModal: LazyComponent<typeof import("../../components/whatsapp/GroupMediaDocsModal.vue")['default']>
  LazyWhatsappGroupMessageList: LazyComponent<typeof import("../../components/whatsapp/GroupMessageList.vue")['default']>
  LazyWhatsappGroupPickerModal: LazyComponent<typeof import("../../components/whatsapp/GroupPickerModal.vue")['default']>
  LazyWhatsappInteractiveButtonsBuilder: LazyComponent<typeof import("../../components/whatsapp/InteractiveButtonsBuilder.vue")['default']>
  LazyWhatsappInteractiveCarouselBuilder: LazyComponent<typeof import("../../components/whatsapp/InteractiveCarouselBuilder.vue")['default']>
  LazyWhatsappInteractiveListBuilder: LazyComponent<typeof import("../../components/whatsapp/InteractiveListBuilder.vue")['default']>
  LazyWhatsappInteractiveMessagePreview: LazyComponent<typeof import("../../components/whatsapp/InteractiveMessagePreview.vue")['default']>
  LazyWhatsappInteractivePreviewSideModal: LazyComponent<typeof import("../../components/whatsapp/InteractivePreviewSideModal.vue")['default']>
  LazyWhatsappMediaComposerModal: LazyComponent<typeof import("../../components/whatsapp/MediaComposerModal.vue")['default']>
  LazyWhatsappPollComposerModal: LazyComponent<typeof import("../../components/whatsapp/PollComposerModal.vue")['default']>
  LazyWhatsappPrivateMessageList: LazyComponent<typeof import("../../components/whatsapp/PrivateMessageList.vue")['default']>
  LazyWhatsappSaveContactModal: LazyComponent<typeof import("../../components/whatsapp/SaveContactModal.vue")['default']>
  LazyWhatsappSendContactsModal: LazyComponent<typeof import("../../components/whatsapp/SendContactsModal.vue")['default']>
  LazyNuxtWelcome: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/welcome.vue")['default']>
  LazyNuxtLayout: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-layout")['default']>
  LazyNuxtErrorBoundary: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']>
  LazyClientOnly: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/client-only")['default']>
  LazyDevOnly: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/dev-only")['default']>
  LazyServerPlaceholder: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/server-placeholder")['default']>
  LazyNuxtLink: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-link")['default']>
  LazyNuxtLoadingIndicator: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']>
  LazyNuxtTime: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']>
  LazyNuxtRouteAnnouncer: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']>
  LazyNuxtImg: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']>
  LazyNuxtPicture: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']>
  LazyVitePwaManifest: LazyComponent<typeof import("../../node_modules/@vite-pwa/nuxt/dist/runtime/components/VitePwaManifest")['default']>
  LazyNuxtPwaManifest: LazyComponent<typeof import("../../node_modules/@vite-pwa/nuxt/dist/runtime/components/VitePwaManifest")['default']>
  LazyNuxtPwaAssets: LazyComponent<typeof import("../../node_modules/@vite-pwa/nuxt/dist/runtime/components/NuxtPwaAssets")['default']>
  LazyPwaAppleImage: LazyComponent<typeof import("../../node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaAppleImage.vue")['default']>
  LazyPwaAppleSplashScreenImage: LazyComponent<typeof import("../../node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaAppleSplashScreenImage.vue")['default']>
  LazyPwaFaviconImage: LazyComponent<typeof import("../../node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaFaviconImage.vue")['default']>
  LazyPwaMaskableImage: LazyComponent<typeof import("../../node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaMaskableImage.vue")['default']>
  LazyPwaTransparentImage: LazyComponent<typeof import("../../node_modules/@vite-pwa/nuxt/dist/runtime/components/PwaTransparentImage.vue")['default']>
  LazyNuxtPage: LazyComponent<typeof import("../../node_modules/nuxt/dist/pages/runtime/page")['default']>
  LazyNoScript: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['NoScript']>
  LazyLink: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Link']>
  LazyBase: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Base']>
  LazyTitle: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Title']>
  LazyMeta: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Meta']>
  LazyStyle: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Style']>
  LazyHead: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Head']>
  LazyHtml: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Html']>
  LazyBody: LazyComponent<typeof import("../../node_modules/nuxt/dist/head/runtime/components")['Body']>
  LazyNuxtIsland: LazyComponent<typeof import("../../node_modules/nuxt/dist/app/components/nuxt-island")['default']>
}

declare module 'vue' {
  export interface GlobalComponents extends _GlobalComponents { }
}

export {}
