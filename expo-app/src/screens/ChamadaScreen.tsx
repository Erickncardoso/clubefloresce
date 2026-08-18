import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video } from 'lucide-react-native';
import ChamadaLiveNative from '@/components/chamada/ChamadaLiveNative';
import { usePatientApi } from '@/hooks/usePatientApi';
import { useAuth } from '@/providers/AuthProvider';
import {
  buildCallPath,
  type ActiveVideoCallResponse,
  type VideoCallPublic,
} from '@/lib/video-call';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type Phase = 'loading' | 'error' | 'gate' | 'live';

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

function patientDisplayName(name?: string | null) {
  const full = String(name || '').trim();
  if (full && full.toLowerCase() !== 'paciente') return full;
  return 'Paciente';
}

export default function ChamadaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ callId?: string | string[]; room?: string | string[] }>();
  const { user } = useAuth();
  const { request } = usePatientApi();

  const callIdParam = useMemo(() => firstParam(params.callId).trim(), [params.callId]);
  const roomParam = useMemo(() => firstParam(params.room).trim(), [params.room]);
  const displayName = useMemo(() => patientDisplayName(user?.name), [user?.name]);

  const loadedCallIdRef = useRef('');
  const phaseRef = useRef<Phase>('loading');
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState('');
  const [permissionHint, setPermissionHint] = useState('');
  const [requestingMedia, setRequestingMedia] = useState(false);
  const [callId, setCallId] = useState('');
  const [roomName, setRoomName] = useState('');
  const [jitsiDomain, setJitsiDomain] = useState('meet.nutrisabellajardim.com.br');
  const [nutriName, setNutriName] = useState('');
  const [title, setTitle] = useState('Chamada de vídeo');
  const [subtitle, setSubtitle] = useState('');

  const loadCall = useCallback(async () => {
    if (phaseRef.current === 'live') return;

    setPhase('loading');
    phaseRef.current = 'loading';
    setError('');
    setPermissionHint('');

    try {
      let call: VideoCallPublic | null | undefined;
      if (callIdParam) {
        const data = await request<ActiveVideoCallResponse>(
          `/patients/me/video-call/${callIdParam}`,
        );
        call = data?.call;
      } else {
        const active = await request<ActiveVideoCallResponse>('/patients/me/video-call');
        if (!active?.call?.id) {
          throw new Error(
            'Nenhuma chamada ativa no momento. Peça para sua nutricionista ligar novamente.',
          );
        }
        const data = await request<ActiveVideoCallResponse>(
          `/patients/me/video-call/${active.call.id}`,
        );
        call = data?.call;
      }

      if (!call?.roomUrl || !call?.id) {
        throw new Error(
          'Nenhuma chamada ativa no momento. Peça para sua nutricionista ligar novamente.',
        );
      }

      loadedCallIdRef.current = call.id;
      setCallId(call.id);
      setRoomName(call.roomName || roomParam);
      setJitsiDomain(call.jitsiDomain || 'meet.nutrisabellajardim.com.br');
      setNutriName(call.nutriName || '');
      setTitle(call.nutriName ? `Com ${call.nutriName}` : 'Chamada de vídeo');
      setSubtitle(`Entrando como ${displayName}`);
      setPhase('gate');
      phaseRef.current = 'gate';

      if (!callIdParam || callIdParam !== call.id) {
        router.replace(buildCallPath(call) as never);
      }
    } catch (err: unknown) {
      loadedCallIdRef.current = '';
      setError((err as Error)?.message || 'Não foi possível entrar na chamada.');
      setPhase('error');
      phaseRef.current = 'error';
    }
  }, [callIdParam, displayName, request, roomParam, router]);

  useEffect(() => {
    void loadCall();
  }, [loadCall]);

  async function enterCall() {
    setRequestingMedia(true);
    setPermissionHint('');
    try {
      const camera = await ImagePicker.requestCameraPermissionsAsync();
      if (!camera.granted) {
        setPermissionHint('Permita o acesso à câmera para entrar na consulta.');
        return;
      }
      setPhase('live');
      phaseRef.current = 'live';
      setSubtitle('Conectando…');
    } catch (err: unknown) {
      const msg = String((err as Error)?.message || err || '').trim();
      setPermissionHint(msg && msg !== 'undefined'
        ? msg
        : 'Não foi possível ativar câmera/microfone.');
    } finally {
      setRequestingMedia(false);
    }
  }

  async function leaveCall() {
    if (callId) {
      try {
        await request(`/patients/me/video-call/${callId}/end`, { method: 'POST' });
      } catch {
        /* segue mesmo assim */
      }
    }
    router.replace('/inicio' as never);
  }

  return (
    <SafeAreaView style={[styles.safe, phase === 'live' && styles.safeLive]} edges={phase === 'live' ? [] : ['top', 'left', 'right', 'bottom']}>
      {phase !== 'live' ? (
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>Consulta por vídeo</Text>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          <Pressable style={styles.backBtn} onPress={() => router.replace('/inicio' as never)}>
            <Text style={styles.backText}>Voltar</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.body}>
        {phase === 'loading' ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.stateText}>Preparando a chamada…</Text>
          </View>
        ) : null}

        {phase === 'error' ? (
          <View style={styles.state}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.primaryBtn} onPress={() => void loadCall()}>
              <Text style={styles.primaryText}>Tentar de novo</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={() => router.replace('/inicio' as never)}>
              <Text style={styles.secondaryText}>Ir para o início</Text>
            </Pressable>
          </View>
        ) : null}

        {phase === 'gate' ? (
          <View style={styles.gate}>
            <View style={styles.gateCard}>
              <View style={styles.gateIcon}>
                <Video size={26} color="#c5d0b8" strokeWidth={2} />
              </View>
              <Text style={styles.gateTitle}>Entrar na consulta</Text>
              <Text style={styles.gateCopy}>
                Você vai entrar como <Text style={styles.gateStrong}>{displayName}</Text>.
                {' '}Permita <Text style={styles.gateStrong}>câmera</Text> e{' '}
                <Text style={styles.gateStrong}>microfone</Text> quando o celular pedir.
              </Text>
              {permissionHint ? (
                <Text style={styles.gateHint}>{permissionHint}</Text>
              ) : null}
              <Pressable
                style={[styles.gatePrimary, requestingMedia && styles.gatePrimaryDisabled]}
                disabled={requestingMedia}
                onPress={() => void enterCall()}
              >
                <Text style={styles.gatePrimaryText}>
                  {requestingMedia ? 'Abrindo…' : 'Permitir câmera e entrar'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {phase === 'live' && callId ? (
          <ChamadaLiveNative
            domain={jitsiDomain}
            roomName={roomName}
            displayName={displayName}
            nutriName={nutriName}
            onLeft={() => void leaveCall()}
            onError={(message) => {
              setError(message);
              setPhase('error');
            }}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0f1210',
  },
  safeLive: {
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#171b17',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  title: {
    marginTop: 2,
    fontFamily: fonts.extrabold,
    fontSize: 17,
    color: '#f4f6f3',
  },
  subtitle: {
    marginTop: 4,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#a8b0a6',
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  backText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#f4f6f3',
  },
  body: {
    flex: 1,
    backgroundColor: '#000',
  },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    padding: spacing[6],
  },
  stateText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: '#d7ddd4',
  },
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: '#fecaca',
    textAlign: 'center',
  },
  primaryBtn: {
    marginTop: spacing[2],
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    minWidth: 160,
    alignItems: 'center',
  },
  primaryText: {
    fontFamily: fonts.bold,
    color: '#fff',
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    minWidth: 160,
    alignItems: 'center',
  },
  secondaryText: {
    fontFamily: fonts.bold,
    color: '#f4f6f3',
  },
  gate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[5],
    backgroundColor: '#0f1210',
  },
  gateCard: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[5],
    borderRadius: 20,
    backgroundColor: '#1a1f1a',
  },
  gateIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 150, 124, 0.2)',
  },
  gateTitle: {
    fontFamily: fonts.extrabold,
    fontSize: 20,
    color: '#f4f6f3',
    textAlign: 'center',
  },
  gateCopy: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: '#b8c0b5',
    textAlign: 'center',
  },
  gateStrong: {
    fontFamily: fonts.semibold,
    color: '#eef1ea',
  },
  gateHint: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: '#fbbf24',
    textAlign: 'center',
  },
  gatePrimary: {
    width: '100%',
    minHeight: 48,
    marginTop: spacing[1],
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  gatePrimaryDisabled: {
    opacity: 0.65,
  },
  gatePrimaryText: {
    fontFamily: fonts.extrabold,
    fontSize: 15,
    color: '#fff',
  },
});
