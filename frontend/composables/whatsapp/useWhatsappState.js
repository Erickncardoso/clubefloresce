/**
 * useWhatsappState
 * Estado reativo compartilhado (singleton) para o módulo WhatsApp.
 * Todas as refs são definidas no nível do módulo — uma única instância por sessão.
 * Importado por todos os outros composables do módulo.
 */
import { ref, computed } from 'vue'

// ─── Chat list ────────────────────────────────────────────────────────────────
export const chats = ref([])
export const loadingChats = ref(false)
export const searchQuery = ref('')

// ─── Active chat ──────────────────────────────────────────────────────────────
export const selectedChat = ref(null)
export const messages = ref([])
export const loadingMessages = ref(false)
/** Incrementa a cada selectChat; evita resposta lenta de um chat sobrescrever o ativo. */
export const selectChatLoadSeq = ref(0)
export const chatBodyRef = ref(null)

// ─── Input / sending ─────────────────────────────────────────────────────────
export const newMessage = ref('')
export const messageInputRef = ref(null)
export const sending = ref(false)
export const mediaInputRef = ref(null)

// ─── Action menu / reactions ──────────────────────────────────────────────────
export const actionMenuMessageId = ref(null)
export const messageActionsCoords = ref(null)
export const replyingTo = ref(null)
export const reactionsDetailMessage = ref(null)
export const reactionsDetailTab = ref('all')
export const optimisticReactionsByNormalizedId = ref({})
export const chatActionFeedback = ref('')

// ─── Media loading ────────────────────────────────────────────────────────────
export const downloadingMediaById = ref({})
export const autoMediaLoadAttemptedById = ref({})

// ─── Polling timers ───────────────────────────────────────────────────────────
export const chatsPollingTimer = ref(null)
export const messagesPollingTimer = ref(null)
export const isRefreshingMessages = ref(false)
export const visibilitySyncHandler = ref(null)
export const windowFocusSyncHandler = ref(null)
export const windowOnlineSyncHandler = ref(null)

// ─── Contact directories ──────────────────────────────────────────────────────
export const contactsDirectory = ref({})
export const groupParticipantsDirectory = ref({})
export const groupParticipantsByJid = ref({})
export const groupParticipantsByLid = ref({})
export const unknownProfilesDirectory = ref({})
export const observedSenderDirectory = ref({})
export const savedContactsIndex = ref({})
export const lidToJidMap = ref({})
export const lastContactsSyncAt = ref(0)

// ─── Avatar directories ───────────────────────────────────────────────────────
export const sharedContactAvatars = ref({})
export const loadingSharedContactAvatars = ref({})
export const senderAvatarDirectory = ref({})
export const loadingSenderAvatarDirectory = ref({})

// ─── Business profile state ───────────────────────────────────────────────────
export const businessProfileModalOpen = ref(false)
export const businessProfileLoading = ref(false)
export const businessHoursExpanded = ref(false)
export const businessProfileModalData = ref(null)
export const businessProfileCatalog = ref([])
export const businessCategoriesDirectory = ref({})
export const businessCatalogJid = ref('')
export const businessProfilePayloadLogged = ref(false)

// ─── Shared contacts state ────────────────────────────────────────────────────
export const sharedContactBusinessProfiles = ref({})
export const sharedContactBusinessFlags = ref({})
export const loadingSharedContactBusiness = ref({})
export const sharedContactBusinessChecked = ref({})
export const persistedContactStates = ref({})
export const persistedContactStatesLoaded = ref({})

// ─── Save contact modal ───────────────────────────────────────────────────────
export const saveContactModalOpen = ref(false)
export const savingContact = ref(false)
export const saveContactFeedback = ref('')
export const saveContactForm = ref({
  name: '',
  lastName: '',
  countryCode: '55',
  localPhone: '',
  phone: ''
})

// ─── Add-to-group modal ───────────────────────────────────────────────────────
export const addToGroupModalOpen = ref(false)
export const addToGroupLoading = ref(false)
export const addToGroupSearch = ref('')
export const addToGroupFeedback = ref('')
export const addToGroupSelectedGroupJid = ref('')
export const addToGroupParticipant = ref('')

// ─── API cache ────────────────────────────────────────────────────────────────
export const chatDetailsCache = ref({})
export const chatDetailsInflight = ref({})
export const chatsBackendOfflineLogged = ref(false)
export const messagesBackendOfflineLogged = ref(false)

/**
 * Zera estado em memória do módulo WhatsApp (chats, mensagens, diretórios, modais).
 * Chame após desconectar na UAZAPI para não misturar sessão antiga com número novo.
 * Não para timers de polling — use `stopRealtimeSync` em useWhatsappChats antes/depois.
 */
export const clearWhatsappSessionState = () => {
  chats.value = []
  loadingChats.value = false
  searchQuery.value = ''
  selectedChat.value = null
  messages.value = []
  loadingMessages.value = false
  selectChatLoadSeq.value += 1
  newMessage.value = ''
  sending.value = false
  replyingTo.value = null
  actionMenuMessageId.value = null
  messageActionsCoords.value = null
  reactionsDetailMessage.value = null
  reactionsDetailTab.value = 'all'
  optimisticReactionsByNormalizedId.value = {}
  chatActionFeedback.value = ''
  downloadingMediaById.value = {}
  autoMediaLoadAttemptedById.value = {}
  isRefreshingMessages.value = false

  contactsDirectory.value = {}
  groupParticipantsDirectory.value = {}
  groupParticipantsByJid.value = {}
  groupParticipantsByLid.value = {}
  unknownProfilesDirectory.value = {}
  observedSenderDirectory.value = {}
  savedContactsIndex.value = {}
  lidToJidMap.value = {}
  lastContactsSyncAt.value = 0

  sharedContactAvatars.value = {}
  loadingSharedContactAvatars.value = {}
  senderAvatarDirectory.value = {}
  loadingSenderAvatarDirectory.value = {}

  businessProfileModalOpen.value = false
  businessProfileLoading.value = false
  businessHoursExpanded.value = false
  businessProfileModalData.value = null
  businessProfileCatalog.value = []
  businessCategoriesDirectory.value = {}
  businessCatalogJid.value = ''
  businessProfilePayloadLogged.value = false

  sharedContactBusinessProfiles.value = {}
  sharedContactBusinessFlags.value = {}
  loadingSharedContactBusiness.value = {}
  sharedContactBusinessChecked.value = {}
  persistedContactStates.value = {}
  persistedContactStatesLoaded.value = {}

  saveContactModalOpen.value = false
  savingContact.value = false
  saveContactFeedback.value = ''
  saveContactForm.value = {
    name: '',
    lastName: '',
    countryCode: '55',
    localPhone: '',
    phone: ''
  }

  addToGroupModalOpen.value = false
  addToGroupLoading.value = false
  addToGroupSearch.value = ''
  addToGroupFeedback.value = ''
  addToGroupSelectedGroupJid.value = ''
  addToGroupParticipant.value = ''

  chatDetailsCache.value = {}
  chatDetailsInflight.value = {}
  chatsBackendOfflineLogged.value = false
  messagesBackendOfflineLogged.value = false
}

// ─── Composable export ────────────────────────────────────────────────────────
export function useWhatsappState() {
  return {
    chats, loadingChats, searchQuery,
    selectedChat, messages, loadingMessages, selectChatLoadSeq, chatBodyRef,
    newMessage, messageInputRef, sending, mediaInputRef,
    actionMenuMessageId, messageActionsCoords, replyingTo,
    reactionsDetailMessage, reactionsDetailTab, optimisticReactionsByNormalizedId, chatActionFeedback,
    downloadingMediaById, autoMediaLoadAttemptedById,
    chatsPollingTimer, messagesPollingTimer, isRefreshingMessages,
    visibilitySyncHandler, windowFocusSyncHandler, windowOnlineSyncHandler,
    contactsDirectory, groupParticipantsDirectory, groupParticipantsByJid,
    groupParticipantsByLid, unknownProfilesDirectory, observedSenderDirectory,
    savedContactsIndex, lidToJidMap, lastContactsSyncAt,
    sharedContactAvatars, loadingSharedContactAvatars,
    senderAvatarDirectory, loadingSenderAvatarDirectory,
    businessProfileModalOpen, businessProfileLoading, businessHoursExpanded,
    businessProfileModalData, businessProfileCatalog, businessCategoriesDirectory,
    businessCatalogJid, businessProfilePayloadLogged,
    sharedContactBusinessProfiles, sharedContactBusinessFlags,
    loadingSharedContactBusiness, sharedContactBusinessChecked,
    persistedContactStates, persistedContactStatesLoaded,
    saveContactModalOpen, savingContact, saveContactFeedback, saveContactForm,
    addToGroupModalOpen, addToGroupLoading, addToGroupSearch,
    addToGroupFeedback, addToGroupSelectedGroupJid, addToGroupParticipant,
    chatDetailsCache, chatDetailsInflight,
    chatsBackendOfflineLogged, messagesBackendOfflineLogged,
    clearWhatsappSessionState
  }
}
