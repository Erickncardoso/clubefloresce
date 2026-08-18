export type VideoCallPublic = {
  id: string;
  roomName: string;
  roomUrl: string;
  embedUrl?: string;
  nutriName?: string;
  nutriAvatar?: string | null;
  jitsiDomain?: string;
  status?: 'ringing' | 'active' | 'declined' | 'ended' | string;
  displayName?: string;
  createdAt?: string;
};

export type ActiveVideoCallResponse = {
  call?: VideoCallPublic | null;
};

export function buildCallPath(call: Pick<VideoCallPublic, 'id' | 'roomName'>) {
  let path = `/chamada?callId=${encodeURIComponent(call.id)}`;
  if (call.roomName) {
    path += `&room=${encodeURIComponent(call.roomName)}`;
  }
  return path;
}

export function buildJitsiPatientUrl(input: {
  roomUrl: string;
  roomName: string;
  jitsiDomain?: string | null;
  displayName: string;
}) {
  const domain = String(input.jitsiDomain || 'meet.nutrisabellajardim.com.br')
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');
  const room = String(input.roomName || '').trim();
  if (!domain || !room) return input.roomUrl;

  const name = encodeURIComponent(input.displayName || 'Paciente');
  const hash = [
    `userInfo.displayName="${name}"`,
    'config.prejoinConfig.enabled=false',
    'config.prejoinPageEnabled=false',
    'config.disableDeepLinking=true',
    'config.deeplinking.disabled=true',
    'interfaceConfig.MOBILE_APP_PROMO=false',
  ].join('&');

  return `https://${domain}/${encodeURIComponent(room)}#${hash}`;
}

export function isVideoCallRoute(route?: string | null) {
  const value = String(route || '').trim();
  return value.includes('/chamada');
}

export function parseNutriNameFromPushBody(body?: string | null) {
  const text = String(body || '').trim();
  if (!text) return 'Sua nutricionista';
  return text.replace(/\s+está te ligando.*$/i, '').trim() || 'Sua nutricionista';
}

export function parseCallFromActionPath(actionPath?: string | null) {
  const path = String(actionPath || '');
  const callIdMatch = path.match(/[?&]callId=([^&]+)/);
  if (!callIdMatch?.[1]) return null;
  const roomMatch = path.match(/[?&]room=([^&]+)/);
  return {
    callId: decodeURIComponent(callIdMatch[1]),
    roomName: roomMatch?.[1] ? decodeURIComponent(roomMatch[1]) : '',
  };
}

export function isRecentIsoTimestamp(iso?: string | null, maxMs = 5 * 60 * 1000) {
  const time = new Date(String(iso || '')).getTime();
  if (!Number.isFinite(time)) return false;
  return Date.now() - time <= maxMs;
}

export type PatientNotificationRow = {
  type?: string;
  body?: string;
  read?: boolean;
  createdAt?: string;
  actionPath?: string | null;
};

export function resolveIncomingCallFromNotifications(
  items: PatientNotificationRow[] | undefined,
): VideoCallPublic | null {
  const candidates = (items || [])
    .filter(
      (entry) =>
        entry.type === 'video_call'
        && entry.read === false
        && isRecentIsoTimestamp(entry.createdAt),
    )
    .sort((a, b) => {
      const ta = new Date(String(a.createdAt || '')).getTime();
      const tb = new Date(String(b.createdAt || '')).getTime();
      return tb - ta;
    });

  for (const item of candidates) {
    const parsed = parseCallFromActionPath(item.actionPath);
    if (!parsed) continue;
    return {
      id: parsed.callId,
      roomName: parsed.roomName,
      roomUrl: '',
      nutriName: parseNutriNameFromPushBody(item.body),
      status: 'ringing',
      createdAt: item.createdAt,
    };
  }

  return null;
}

export function extractNotificationRoute(data: Record<string, unknown>) {
  return String(data.route || data.url || data.actionPath || '').trim();
}

export function isVideoCallNotificationData(data: unknown) {
  if (!data || typeof data !== 'object') return false;
  const payload = data as Record<string, unknown>;
  if (isVideoCallRoute(extractNotificationRoute(payload))) return true;
  const tag = String(payload.tag || '');
  if (tag.startsWith('video-call:')) return true;
  const type = String(payload.type || '');
  return type === 'video_call';
}
