/**
 * Cliente completo WuzAPI v3 — todos os endpoints da documentação oficial.
 * https://webhook.erickcardoso.com.br/api
 */
import { wuzapiHttp } from "./wuzapi-http.client";

export const WUZAPI_WEBHOOK_EVENTS = [
  "Message",
  "ReadReceipt",
  "Presence",
  "HistorySync",
  "ChatPresence",
  "All",
] as const;

/** Endpoints admin (Authorization header). */
export class WuzapiAdminApi {
  health() {
    return wuzapiHttp.fetchPublic("GET", "/health");
  }

  listUsers() {
    return wuzapiHttp.getAdmin("/admin/users");
  }

  createUser(body: {
    name: string;
    token: string;
    webhook?: string;
    events?: string | string[];
    history?: number;
    proxyConfig?: Record<string, unknown>;
    s3Config?: Record<string, unknown>;
  }) {
    return wuzapiHttp.postAdmin("/admin/users", body);
  }

  getUser(id: string) {
    return wuzapiHttp.getAdmin(`/admin/users/${encodeURIComponent(id)}`);
  }

  deleteUser(id: string) {
    return wuzapiHttp.deleteAdmin(`/admin/users/${encodeURIComponent(id)}`);
  }

  deleteUserFull(id: string) {
    return wuzapiHttp.deleteAdmin(`/admin/users/${encodeURIComponent(id)}/full`);
  }
}

/** Endpoints de sessão/usuário (token header). */
export class WuzapiApi {
  constructor(private readonly userId: string) {}

  // ─── System (user-scoped health via admin fallback in service) ─────────────

  // ─── Newsletter ────────────────────────────────────────────────────────────

  listNewsletters() {
    return wuzapiHttp.getUser(this.userId, "/newsletter/list");
  }

  // ─── Webhook ───────────────────────────────────────────────────────────────

  getWebhook() {
    return wuzapiHttp.getUser(this.userId, "/webhook");
  }

  setWebhook(body: { webhook: string; events?: string[] }) {
    return wuzapiHttp.postUser(this.userId, "/webhook", {
      webhookurl: body.webhook,
      events: body.events,
    });
  }

  updateWebhook(body: { webhook: string; events?: string[]; Active?: boolean }) {
    return wuzapiHttp.putUser(this.userId, "/webhook", {
      webhookurl: body.webhook,
      events: body.events,
      Active: body.Active,
    });
  }

  deleteWebhook() {
    return wuzapiHttp.deleteUser(this.userId, "/webhook");
  }

  // ─── Session ───────────────────────────────────────────────────────────────

  connect(body: { Subscribe?: string[]; Immediate?: boolean } = {}) {
    return wuzapiHttp.postUser(this.userId, "/session/connect", body, 20000);
  }

  disconnect(clear = false) {
    return wuzapiHttp.postUser(this.userId, "/session/disconnect", undefined, undefined, clear ? { clear: true } : undefined);
  }

  logout() {
    return wuzapiHttp.postUser(this.userId, "/session/logout");
  }

  status() {
    return wuzapiHttp.getUser(this.userId, "/session/status");
  }

  pairPhone(phone: string) {
    return wuzapiHttp.postUser(this.userId, "/session/pairphone", { Phone: phone });
  }

  qr() {
    return wuzapiHttp.getUser(this.userId, "/session/qr");
  }

  setSessionProxy(body: { proxy_url?: string; enable: boolean; webhook_use_proxy?: boolean }) {
    return wuzapiHttp.postUser(this.userId, "/session/proxy", body);
  }

  setS3Config(body: Record<string, unknown>) {
    return wuzapiHttp.postUser(this.userId, "/session/s3/config", body);
  }

  getS3Config() {
    return wuzapiHttp.getUser(this.userId, "/session/s3/config");
  }

  deleteS3Config() {
    return wuzapiHttp.deleteUser(this.userId, "/session/s3/config");
  }

  testS3Connection() {
    return wuzapiHttp.postUser(this.userId, "/session/s3/test");
  }

  requestSessionHistory(query: {
    count?: number;
    chat_jid?: string;
    oldest_msg_id?: string;
    oldest_msg_from_me?: boolean;
    oldest_msg_timestamp?: number;
  }) {
    return wuzapiHttp.getUser(this.userId, "/session/history", query);
  }

  setHmacConfig(hmac_key: string) {
    return wuzapiHttp.postUser(this.userId, "/session/hmac/config", { hmac_key });
  }

  getHmacConfig() {
    return wuzapiHttp.getUser(this.userId, "/session/hmac/config");
  }

  deleteHmacConfig() {
    return wuzapiHttp.deleteUser(this.userId, "/session/hmac/config");
  }

  // ─── User ──────────────────────────────────────────────────────────────────

  userInfo(phones: string[]) {
    return wuzapiHttp.postUser(this.userId, "/user/info", { Phone: phones });
  }

  userCheck(phones: string[]) {
    return wuzapiHttp.postUser(this.userId, "/user/check", { Phone: phones });
  }

  userPresence(type: "available" | "unavailable") {
    return wuzapiHttp.postUser(this.userId, "/user/presence", { type });
  }

  userAvatar(phone: string, preview = true) {
    return wuzapiHttp.postUser(this.userId, "/user/avatar", { Phone: phone, Preview: preview });
  }

  userContacts() {
    return wuzapiHttp.getUser(this.userId, "/user/contacts");
  }

  userBlock(phone: string, jid?: string) {
    return wuzapiHttp.postUser(this.userId, "/user/block", { Phone: phone, JID: jid || undefined });
  }

  userUnblock(phone: string, jid?: string) {
    return wuzapiHttp.postUser(this.userId, "/user/unblock", { Phone: phone, JID: jid || undefined });
  }

  userBlocklist() {
    return wuzapiHttp.getUser(this.userId, "/user/blocklist");
  }

  userLid(phone: string) {
    return wuzapiHttp.getUser(this.userId, `/user/lid/${encodeURIComponent(phone)}`);
  }

  getPrivacy() {
    return wuzapiHttp.getUser(this.userId, "/user/privacy");
  }

  setPrivacy(name: string, value: string) {
    return wuzapiHttp.postUser(this.userId, "/user/privacy", { Name: name, Value: value });
  }

  // ─── Chat ──────────────────────────────────────────────────────────────────

  chatDelete(id: string, phone: string) {
    return wuzapiHttp.postUser(this.userId, "/chat/delete", { Id: id, Phone: phone });
  }

  chatMarkRead(body: { Id: string[]; ChatPhone: string; SenderPhone?: string }) {
    return wuzapiHttp.postUser(this.userId, "/chat/markread", body);
  }

  chatReact(phone: string, body: string, id: string) {
    return wuzapiHttp.postUser(this.userId, "/chat/react", { Phone: phone, Body: body, Id: id });
  }

  chatSendText(body: Record<string, unknown>) {
    return wuzapiHttp.postUser(this.userId, "/chat/send/text", body, 20000);
  }

  chatSendEdit(body: { Id: string; Phone: string; Body: string }) {
    return wuzapiHttp.postUser(this.userId, "/chat/send/edit", body);
  }

  chatRequestUnavailableMessage(body: Record<string, unknown>) {
    return wuzapiHttp.postUser(this.userId, "/chat/request-unavailable-message", body);
  }

  chatSendImage(body: Record<string, unknown>) {
    return wuzapiHttp.postUser(this.userId, "/chat/send/image", body, 45000);
  }

  chatSendAudio(body: Record<string, unknown>) {
    return wuzapiHttp.postUser(this.userId, "/chat/send/audio", body, 45000);
  }

  chatSendDocument(body: Record<string, unknown>) {
    return wuzapiHttp.postUser(this.userId, "/chat/send/document", body, 45000);
  }

  chatSendTemplate(body: Record<string, unknown>) {
    return wuzapiHttp.postUser(this.userId, "/chat/send/template", body, 45000);
  }

  chatSendVideo(body: Record<string, unknown>) {
    return wuzapiHttp.postUser(this.userId, "/chat/send/video", body, 45000);
  }

  chatSendSticker(body: Record<string, unknown>) {
    return wuzapiHttp.postUser(this.userId, "/chat/send/sticker", body, 45000);
  }

  chatSendLocation(body: Record<string, unknown>) {
    return wuzapiHttp.postUser(this.userId, "/chat/send/location", body);
  }

  chatSendContact(body: Record<string, unknown>) {
    return wuzapiHttp.postUser(this.userId, "/chat/send/contact", body);
  }

  chatSendButtons(body: Record<string, unknown>) {
    return wuzapiHttp.postUser(this.userId, "/chat/send/buttons", body, 20000);
  }

  chatSendList(body: Record<string, unknown>) {
    return wuzapiHttp.postUser(this.userId, "/chat/send/list", body, 20000);
  }

  chatSendPoll(body: Record<string, unknown>) {
    return wuzapiHttp.postUser(this.userId, "/chat/send/poll", body, 20000);
  }

  chatDownloadImage(body: Record<string, unknown>) {
    return wuzapiHttp.postUser(this.userId, "/chat/downloadimage", body, 45000);
  }

  chatDownloadSticker(body: Record<string, unknown>) {
    return wuzapiHttp.postUser(this.userId, "/chat/downloadsticker", body, 45000);
  }

  chatDownloadVideo(body: Record<string, unknown>) {
    return wuzapiHttp.postUser(this.userId, "/chat/downloadvideo", body, 45000);
  }

  chatDownloadDocument(body: Record<string, unknown>) {
    return wuzapiHttp.postUser(this.userId, "/chat/downloaddocument", body, 45000);
  }

  chatDownloadAudio(body: Record<string, unknown>) {
    return wuzapiHttp.postUser(this.userId, "/chat/downloadaudio", body, 45000);
  }

  chatPresence(phone: string, state: string, media?: string) {
    return wuzapiHttp.postUser(this.userId, "/chat/presence", { Phone: phone, State: state, Media: media });
  }

  chatHistory(chat_jid: string, limit = 50) {
    return wuzapiHttp.getUser(this.userId, "/chat/history", { chat_jid, limit });
  }

  // ─── Status ────────────────────────────────────────────────────────────────

  statusSetText(body: string) {
    return wuzapiHttp.postUser(this.userId, "/status/set/text", { body });
  }

  // ─── Call ──────────────────────────────────────────────────────────────────

  callReject(call_from: string, call_id: string) {
    return wuzapiHttp.postUser(this.userId, "/call/reject", { call_from, call_id });
  }

  // ─── Group ─────────────────────────────────────────────────────────────────

  groupCreate(name: string, participants: string[]) {
    return wuzapiHttp.postUser(this.userId, "/group/create", { Name: name, Participants: participants });
  }

  groupLocked(groupJid: string, locked: boolean) {
    return wuzapiHttp.postUser(this.userId, "/group/locked", { GroupJID: groupJid, Locked: locked });
  }

  groupEphemeral(groupJid: string, duration: string) {
    return wuzapiHttp.postUser(this.userId, "/group/ephemeral", { GroupJID: groupJid, Duration: duration });
  }

  groupPhotoRemove(groupJid: string) {
    return wuzapiHttp.postUser(this.userId, "/group/photo/remove", { GroupJID: groupJid });
  }

  groupList() {
    return wuzapiHttp.getUser(this.userId, "/group/list");
  }

  groupInviteLink(groupJid: string, reset = false) {
    return wuzapiHttp.getUser(this.userId, "/group/invitelink", { groupJID: groupJid, reset });
  }

  groupInfo(groupJid: string) {
    return wuzapiHttp.getUser(this.userId, "/group/info", { groupJID: groupJid });
  }

  groupPhoto(groupJid: string, image: string) {
    return wuzapiHttp.postUser(this.userId, "/group/photo", { GroupJID: groupJid, Image: image });
  }

  groupLeave(groupJid: string) {
    return wuzapiHttp.postUser(this.userId, "/group/leave", { GroupJID: groupJid });
  }

  groupName(groupJid: string, name: string) {
    return wuzapiHttp.postUser(this.userId, "/group/name", { GroupJID: groupJid, Name: name });
  }

  groupTopic(groupJid: string, topic: string) {
    return wuzapiHttp.postUser(this.userId, "/group/topic", { GroupJID: groupJid, Topic: topic });
  }

  groupAnnounce(groupJid: string, announce: boolean) {
    return wuzapiHttp.postUser(this.userId, "/group/announce", { GroupJID: groupJid, Announce: announce });
  }

  groupJoin(code: string) {
    return wuzapiHttp.postUser(this.userId, "/group/join", { Code: code });
  }

  groupInviteInfo(code: string) {
    return wuzapiHttp.postUser(this.userId, "/group/inviteinfo", { Code: code });
  }

  groupUpdateParticipants(groupJid: string, action: string, phones: string[]) {
    return wuzapiHttp.postUser(this.userId, "/group/updateparticipants", {
      GroupJID: groupJid,
      Action: action,
      Phone: phones,
    });
  }

  groupRequestParticipants(groupJid: string) {
    return wuzapiHttp.getUser(this.userId, "/group/requestparticipants", { groupJID: groupJid });
  }

  groupUpdateRequestParticipants(groupJid: string, action: string, phones: string[]) {
    return wuzapiHttp.postUser(this.userId, "/group/updaterequestparticipants", {
      GroupJID: groupJid,
      Action: action,
      Phone: phones,
    });
  }

  groupJoinApprovalMode(groupJid: string, mode: boolean) {
    return wuzapiHttp.postUser(this.userId, "/group/joinapprovalmode", { groupjid: groupJid, mode });
  }
}

export const wuzapiAdmin = new WuzapiAdminApi();

export function wuzapiForUser(userId: string): WuzapiApi {
  return new WuzapiApi(userId);
}
