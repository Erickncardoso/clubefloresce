import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Image as ImageIcon,
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import ChamadaAvatar, { chamadaInitials } from '@/components/chamada/ChamadaAvatar';
import ChamadaBackgroundSheet from '@/components/chamada/ChamadaBackgroundSheet';
import ChamadaQualitySheet, { type ChamadaVideoQuality } from '@/components/chamada/ChamadaQualitySheet';
import ChamadaMediaEngine, {
  type ChamadaMediaHandle,
  type ChamadaMediaState,
} from '@/components/chamada/ChamadaMediaEngine';
import { useAppToast } from '@/hooks/useAppToast';
import { toastError } from '@/lib/app-toast';
import { fonts, spacing } from '@/theme/tokens';

type Props = {
  domain: string;
  roomName: string;
  displayName: string;
  nutriName?: string;
  onReady?: () => void;
  onLeft?: () => void;
  onError?: (message: string) => void;
};

export default function ChamadaLiveNative({
  domain,
  roomName,
  displayName,
  nutriName,
  onReady,
  onLeft,
  onError,
}: Props) {
  const insets = useSafeAreaInsets();
  const { showToast } = useAppToast();
  const mediaRef = useRef<ChamadaMediaHandle>(null);
  const [media, setMedia] = useState<ChamadaMediaState>({
    status: 'connecting',
    remoteName: nutriName || '',
    remoteHasVideo: false,
    localHasVideo: false,
    audioMuted: false,
    videoMuted: false,
    speakerMuted: false,
    backgroundMode: 'none',
    videoQuality: '1080',
  });
  const [bgOpen, setBgOpen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);

  const sendCommand = useCallback((cmd: string, extra?: Record<string, unknown>) => {
    mediaRef.current?.sendCommand(cmd, extra);
  }, []);

  const remoteLabel = media.remoteName || nutriName || 'Participante';
  const remoteFirst = remoteLabel.split(' ')[0] || remoteLabel;
  const selfFirst = displayName.split(' ')[0] || displayName;
  const peopleLabel = `${remoteFirst}, ${selfFirst}`;
  const waiting = media.status === 'connecting' || media.status === 'waiting';
  const showRemoteAvatar = !media.remoteHasVideo;
  const showLocalAvatar = !media.localHasVideo;
  const qualityLabel = media.videoQuality === '1080' ? 'HD' : media.videoQuality === 'auto' ? 'Auto' : '720';

  const topInset = Math.max(insets.top, 8);
  const bottomInset = Math.max(insets.bottom, 12);
  const toolbarHeight = 52 + spacing[3] + bottomInset;
  const topBarHeight = topInset + 44;
  const videoTop = Math.max(topInset + 12, topBarHeight - 28);
  const videoBottom = toolbarHeight + 24;

  return (
    <View style={styles.root}>
      <ChamadaMediaEngine
        ref={mediaRef}
        domain={domain}
        roomName={roomName}
        displayName={displayName}
        onReady={onReady}
        onLeft={onLeft}
        onError={onError}
        onWarn={(message) => showToast(toastError('Chamada', message))}
        onState={setMedia}
        chromeInsets={{ top: videoTop, bottom: videoBottom }}
      />

      {waiting ? (
        <View
          pointerEvents="box-none"
          style={[styles.waitingOverlay, { top: videoTop, bottom: videoBottom }]}
        >
          <View style={styles.waitingCard}>
            <ActivityIndicator color="#8b967c" size="large" />
            <Text style={styles.waitingText}>
              {media.status === 'connecting' ? 'Conectando à consulta…' : 'Aguardando o outro participante…'}
            </Text>
          </View>
        </View>
      ) : null}

      {showRemoteAvatar && !waiting ? (
        <View
          pointerEvents="none"
          style={[styles.remoteAvatarOverlay, { top: videoTop, bottom: videoBottom }]}
        >
          <ChamadaAvatar name={remoteLabel} size="lg" />
        </View>
      ) : null}

      {!waiting && remoteLabel ? (
        <View pointerEvents="none" style={[styles.remoteNamePill, { bottom: toolbarHeight + 10 }]}>
          <Text style={styles.remoteNameText} numberOfLines={1}>{remoteFirst}</Text>
        </View>
      ) : null}

      {showLocalAvatar && !waiting ? (
        <View pointerEvents="none" style={[styles.selfPipFallback, { bottom: toolbarHeight + 8 }]}>
          <ChamadaAvatar name={displayName} size="sm" />
        </View>
      ) : null}

      <View pointerEvents="box-none" style={[styles.topBar, { paddingTop: topInset }]}>
        <View style={styles.peoplePill}>
          <View style={styles.avatarStack}>
            <View style={[styles.miniAvatar, styles.miniAvatarBack]}>
              <Text style={styles.miniAvatarText}>{chamadaInitials(remoteLabel)}</Text>
            </View>
            <View style={[styles.miniAvatar, styles.miniAvatarFront]}>
              <Text style={styles.miniAvatarText}>{chamadaInitials(displayName)}</Text>
            </View>
          </View>
          <Text style={styles.peopleLabel} numberOfLines={1}>{peopleLabel}</Text>
        </View>

        <Pressable
          style={[styles.iconBtn, media.speakerMuted && styles.iconBtnOff]}
          onPress={() => sendCommand('toggleSpeaker')}
          accessibilityLabel={media.speakerMuted ? 'Ouvir nutricionista' : 'Silenciar nutricionista'}
        >
          {media.speakerMuted ? (
            <VolumeX size={20} color="#f28b82" />
          ) : (
            <Volume2 size={20} color="#e8eaed" />
          )}
        </Pressable>
      </View>

      <View pointerEvents="box-none" style={[styles.toolbar, { paddingBottom: bottomInset }]}>
        <Pressable
          style={[styles.toolBtn, media.audioMuted && styles.toolBtnMuted]}
          onPress={() => sendCommand('toggleAudio')}
          accessibilityLabel={media.audioMuted ? 'Ativar microfone' : 'Silenciar microfone'}
        >
          {media.audioMuted ? <MicOff size={22} color="#f28b82" /> : <Mic size={22} color="#e8eaed" />}
        </Pressable>
        <Pressable
          style={[styles.toolBtn, media.videoMuted && styles.toolBtnMuted]}
          onPress={() => sendCommand('toggleVideo')}
        >
          {media.videoMuted ? <VideoOff size={22} color="#f28b82" /> : <Video size={22} color="#e8eaed" />}
        </Pressable>
        <Pressable
          style={[styles.toolBtn, media.backgroundMode && media.backgroundMode !== 'none' && styles.toolBtnOn]}
          onPress={() => setBgOpen(true)}
          accessibilityLabel="Fundos virtuais"
        >
          <ImageIcon size={22} color={media.backgroundMode && media.backgroundMode !== 'none' ? '#202124' : '#e8eaed'} />
        </Pressable>
        <Pressable
          style={[styles.toolBtn, media.videoQuality === '1080' && styles.toolBtnOn]}
          onPress={() => setQualityOpen(true)}
          accessibilityLabel="Qualidade do vídeo"
        >
          <Text style={[styles.qualityBadge, media.videoQuality === '1080' && styles.qualityBadgeOn]}>
            {qualityLabel}
          </Text>
        </Pressable>
        <Pressable style={[styles.toolBtn, styles.hangupBtn]} onPress={() => sendCommand('leave')}>
          <PhoneOff size={22} color="#fff" />
        </Pressable>
      </View>

      <ChamadaBackgroundSheet
        visible={bgOpen}
        mode={media.backgroundMode || 'none'}
        onClose={() => setBgOpen(false)}
        onSelect={(mode) => {
          sendCommand('setBackground', { mode });
          setBgOpen(false);
        }}
      />

      <ChamadaQualitySheet
        visible={qualityOpen}
        quality={(media.videoQuality as ChamadaVideoQuality) || '720'}
        onClose={() => setQualityOpen(false)}
        onSelect={(quality) => {
          sendCommand('setVideoQuality', { quality });
          setQualityOpen(false);
        }}
      />
    </View>
  );
}

const SELF_PIP_WIDTH = 118;
const SELF_PIP_HEIGHT = 157;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  waitingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 8,
  },
  waitingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[5],
    borderRadius: 18,
    backgroundColor: 'rgba(30, 31, 32, 0.92)',
  },
  waitingText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: '#b8c0b5',
    textAlign: 'center',
  },
  remoteAvatarOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
    backgroundColor: 'rgba(30, 31, 32, 0.55)',
  },
  remoteNamePill: {
    position: 'absolute',
    left: 16,
    maxWidth: '70%',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(32, 33, 36, 0.82)',
    zIndex: 6,
  },
  remoteNameText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: '#e8eaed',
  },
  selfPipFallback: {
    position: 'absolute',
    right: 12,
    width: SELF_PIP_WIDTH,
    height: SELF_PIP_HEIGHT,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 31, 32, 0.88)',
    zIndex: 6,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
  },
  peoplePill: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 36,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(32, 33, 36, 0.88)',
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8ab4f8',
    borderWidth: 1.5,
    borderColor: '#292a2d',
  },
  miniAvatarBack: { zIndex: 1 },
  miniAvatarFront: { marginLeft: -8, zIndex: 2 },
  miniAvatarText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: '#202124',
  },
  peopleLabel: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: '#e8eaed',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32, 33, 36, 0.82)',
  },
  iconBtnOff: {},
  toolbar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingTop: spacing[3],
  },
  toolBtn: {
    width: 48,
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(32, 33, 36, 0.88)',
  },
  toolBtnMuted: {
    backgroundColor: 'rgba(32, 33, 36, 0.88)',
  },
  toolBtnOn: {
    backgroundColor: '#8ab4f8',
  },
  qualityBadge: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#e8eaed',
    letterSpacing: 0.2,
  },
  qualityBadgeOn: {
    color: '#202124',
  },
  hangupBtn: {
    backgroundColor: '#b42318',
  },
});
