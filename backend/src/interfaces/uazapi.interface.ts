export interface UazapiInstance {
  id: string;
  token?: string;
  status?: string;
  paircode?: string;
  qrcode?: string;
  name?: string;
  profileName?: string;
  profilePicUrl?: string;
  isBusiness?: boolean;
  plataform?: string;
  systemName?: string;
  owner?: string;
  current_presence?: string;
  lastDisconnect?: string;
  lastDisconnectReason?: string;
  adminField01?: string;
  adminField02?: string;
  openai_apikey?: string;
  chatbot_enabled?: boolean;
  chatbot_ignoreGroups?: boolean;
  chatbot_stopConversation?: string;
  chatbot_stopMinutes?: number;
  chatbot_stopWhenYouSendMsg?: number;
  fieldsMap?: Record<string, string>;
  currentTime?: string;
  created?: string;
  updated?: string;
}

export interface UazapiWebhook {
  id: string;
  enabled?: boolean;
  url: string;
  events: string[];
  addUrlTypesMessages?: boolean;
  addUrlEvents?: boolean;
  excludeMessages?: string[];
}

export interface UazapiChat {
  id: string;
  wa_fastid?: string;
  wa_chatid?: string;
  wa_chatlid?: string;
  wa_archived?: boolean;
  wa_contactName?: string;
  wa_name?: string;
  name?: string;
  image?: string;
  imagePreview?: string;
  wa_ephemeralExpiration?: number;
  wa_isBlocked?: boolean;
  wa_isGroup?: boolean;
  wa_isGroup_admin?: boolean;
  wa_isGroup_announce?: boolean;
  wa_isGroup_community?: boolean;
  wa_isGroup_member?: boolean;
  wa_isPinned?: boolean;
  wa_label?: string[];
  wa_notes?: string;
  wa_lastMessageTextVote?: string;
  wa_lastMessageType?: string;
  wa_lastMsgTimestamp?: number;
  wa_lastMessageSender?: string;
  wa_muteEndTime?: number;
  owner?: string;
  wa_unreadCount?: number;
  phone?: string;
  common_groups?: string;
  lead_name?: string;
  lead_fullName?: string;
  lead_email?: string;
  lead_personalid?: string;
  lead_status?: string;
  lead_tags?: string[];
  lead_notes?: string;
  lead_isTicketOpen?: boolean;
  lead_assignedAttendant_id?: string;
  lead_kanbanOrder?: number;
  lead_field01?: string;
  lead_field02?: string;
  lead_field03?: string;
  lead_field04?: string;
  lead_field05?: string;
  lead_field06?: string;
  lead_field07?: string;
  lead_field08?: string;
  lead_field09?: string;
  lead_field10?: string;
  lead_field11?: string;
  lead_field12?: string;
  lead_field13?: string;
  lead_field14?: string;
  lead_field15?: string;
  lead_field16?: string;
  lead_field17?: string;
  lead_field18?: string;
  lead_field19?: string;
  lead_field20?: string;
  chatbot_agentResetMemoryAt?: number;
  chatbot_lastTrigger_id?: string;
  chatbot_lastTriggerAt?: number;
  chatbot_disableUntil?: number;
}

export interface UazapiMessage {
  id: string;
  messageid?: string;
  chatid?: string;
  sender?: string;
  senderName?: string;
  isGroup?: boolean;
  fromMe?: boolean;
  messageType?: string;
  source?: string;
  messageTimestamp?: number;
  status?: string;
  text?: string;
  quoted?: string;
  edited?: string;
  reaction?: string;
  vote?: string;
  convertOptions?: string;
  buttonOrListid?: string;
  owner?: string;
  error?: string;
  content?: any;
  wasSentByApi?: boolean;
  sendFunction?: string;
  sendPayload?: any;
  fileURL?: string;
  send_folder_id?: string;
  track_source?: string;
  track_id?: string;
  ai_metadata?: any;
  sender_pn?: string;
  sender_lid?: string;
}

export interface UazapiLabel {
  id: string;
  name?: string;
  color?: number;
  colorHex?: string;
  labelid?: string;
  owner?: string;
  created?: string;
  updated?: string;
}

export interface UazapiAttendant {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  department?: string;
  customField01?: string;
  customField02?: string;
  owner?: string;
  created?: string;
  updated?: string;
}

export interface UazapiMessageQueueFolder {
  id: string;
  info?: string;
  status?: string;
  scheduled_for?: number;
  delayMax?: number;
  delayMin?: number;
  log_delivered?: number;
  log_failed?: number;
  log_played?: number;
  log_read?: number;
  log_sucess?: number;
  log_total?: number;
  owner?: string;
  created?: string;
  updated?: string;
}

export interface UazapiQuickReply {
  id: string;
  onWhatsApp?: boolean;
  docName?: string;
  file?: string;
  shortCut: string;
  text: string;
  type?: string;
  owner?: string;
  created?: string;
  updated?: string;
}

export interface UazapiGroupParticipant {
  JID?: string;
  LID?: string;
  PhoneNumber?: string;
  IsAdmin?: boolean;
  IsSuperAdmin?: boolean;
  DisplayName?: string;
  Error?: number;
  AddRequest?: any;
}

export interface UazapiGroup {
  JID?: string;
  OwnerJID?: string;
  OwnerPN?: string;
  Name?: string;
  NameSetAt?: string;
  NameSetBy?: string;
  NameSetByPN?: string;
  Topic?: string;
  TopicID?: string;
  TopicSetAt?: string;
  TopicSetBy?: string;
  TopicSetByPN?: string;
  TopicDeleted?: boolean;
  IsLocked?: boolean;
  IsAnnounce?: boolean;
  AnnounceVersionID?: string;
  IsEphemeral?: boolean;
  DisappearingTimer?: number;
  IsIncognito?: boolean;
  IsParent?: boolean;
  IsJoinApprovalRequired?: boolean;
  LinkedParentJID?: string;
  IsDefaultSubGroup?: boolean;
  DefaultMembershipApprovalMode?: string;
  GroupCreated?: string;
  CreatorCountryCode?: string;
  ParticipantVersionID?: string;
  Participants?: UazapiGroupParticipant[];
  MemberAddMode?: string;
  AddressingMode?: string;
  OwnerCanSendMessage?: boolean;
  OwnerIsAdmin?: boolean;
  DefaultSubGroupId?: string;
  invite_link?: string;
  request_participants?: string;
}

export interface UazapiWebhookEvent {
  event: string;
  instance: string;
  data: any;
}
