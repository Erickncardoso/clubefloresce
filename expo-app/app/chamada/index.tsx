import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { usePatientApi } from '@/hooks/usePatientApi';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

type VideoCallPayload = {
  call?: {
    id: string;
    roomName: string;
    embedUrl: string;
    nutriName?: string;
  } | null;
};

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

export default function ChamadaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ callId?: string | string[]; room?: string | string[] }>();
  const { request } = usePatientApi();

  const callIdParam = useMemo(() => firstParam(params.callId).trim(), [params.callId]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  const [callId, setCallId] = useState('');
  const [title, setTitle] = useState('Chamada de vídeo');

  const loadCall = useCallback(async () => {
    setLoading(true);
    setError('');
    setEmbedUrl('');

    try {
      const data = callIdParam
        ? await request<VideoCallPayload>(`/patients/me/video-call/${callIdParam}`)
        : await request<VideoCallPayload>('/patients/me/video-call');

      const call = data?.call;
      if (!call?.embedUrl || !call?.id) {
        throw new Error(
          'Nenhuma chamada ativa no momento. Peça para sua nutricionista ligar novamente.',
        );
      }

      setCallId(call.id);
      setEmbedUrl(call.embedUrl);
      setTitle(call.nutriName ? `Com ${call.nutriName}` : 'Chamada de vídeo');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível entrar na chamada.');
    } finally {
      setLoading(false);
    }
  }, [callIdParam, request]);

  useEffect(() => {
    void loadCall();
  }, [loadCall]);

  async function leaveCall() {
    if (callId) {
      try {
        await request(`/patients/me/video-call/${callId}/end`, { method: 'POST' });
      } catch {
        // segue mesmo assim
      }
    }
    router.replace('/inicio' as never);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>Consulta por vídeo</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
        {embedUrl ? (
          <Pressable style={styles.endBtn} onPress={() => void leaveCall()}>
            <Text style={styles.endText}>Encerrar</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.backBtn} onPress={() => router.replace('/inicio' as never)}>
            <Text style={styles.backText}>Voltar</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.body}>
        {loading ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.stateText}>Entrando na chamada…</Text>
          </View>
        ) : null}

        {!loading && error ? (
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

        {!loading && !error && embedUrl ? (
          <WebView
            source={{ uri: embedUrl }}
            style={styles.webview}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            mediaCapturePermissionGrantType="grant"
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
  endBtn: {
    backgroundColor: colors.error,
    borderRadius: radii.pill,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  endText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#fff',
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
  webview: {
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
});
