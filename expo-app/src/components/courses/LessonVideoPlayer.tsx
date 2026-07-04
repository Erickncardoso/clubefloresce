import { useEffect, useMemo, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';
import {
  buildPlaybackUrlFromMetadata,
  extractYoutubeId,
  getYoutubeEmbedUri,
  resolveLessonPlaybackUrl,
} from '@/lib/course-video';
import { getBunnyStreamHlsUrl, isBunnyCdnHost } from '@/lib/bunny-video';
import { usePatientApi } from '@/hooks/usePatientApi';
import { colors, fonts } from '@/theme/tokens';

type BunnyMetadataResponse = {
  available?: boolean;
  metadata?: {
    cdnHost?: string;
    videoId?: string;
  };
};

type Props = {
  lesson?: Record<string, unknown> | null;
  rawVideoUrl?: string;
};

function NativeLessonVideo({ url }: { url: string }) {
  const [error, setError] = useState('');
  const player = useVideoPlayer(url, (instance) => {
    instance.loop = false;
  });

  useEventListener(player, 'statusChange', ({ status, error: playerError }) => {
    if (status === 'error') {
      setError(playerError?.message || 'Não foi possível reproduzir este vídeo.');
    } else if (status === 'readyToPlay') {
      setError('');
    }
  });

  if (error) {
    return <Text style={styles.placeholder}>{error}</Text>;
  }

  return (
    <VideoView
      player={player}
      style={styles.nativeVideo}
      nativeControls
      contentFit="contain"
      allowsFullscreen
    />
  );
}

export default function LessonVideoPlayer({ lesson, rawVideoUrl }: Props) {
  const { request } = usePatientApi();
  const [playbackUrl, setPlaybackUrl] = useState('');
  const [hlsFallbackUrl, setHlsFallbackUrl] = useState('');
  const [resolving, setResolving] = useState(true);
  const [resolveError, setResolveError] = useState('');

  const lessonId = String(lesson?.id || '');
  const sourceUrl = rawVideoUrl || String(lesson?.videoUrl || '');
  const playerHeight = Math.round((Dimensions.get('window').width * 9) / 16);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setResolving(true);
      setResolveError('');
      setPlaybackUrl('');
      setHlsFallbackUrl('');

      const initial = resolveLessonPlaybackUrl(sourceUrl);
      if (isBunnyCdnHost(initial)) {
        setHlsFallbackUrl(getBunnyStreamHlsUrl(initial));
      }

      if (initial && !/^[a-f0-9-]{36}$/i.test(initial)) {
        if (!cancelled) {
          setPlaybackUrl(initial);
          setResolving(false);
        }
        return;
      }

      if (!lessonId) {
        if (!cancelled) {
          setPlaybackUrl(initial);
          setResolving(false);
          if (!initial) setResolveError('Esta aula ainda não possui vídeo configurado.');
        }
        return;
      }

      try {
        const result = await request<BunnyMetadataResponse>(
          `/courses/lessons/${lessonId}/video-metadata`,
        );
        const fromMeta = buildPlaybackUrlFromMetadata(result?.metadata);
        if (!cancelled) {
          if (fromMeta) {
            setPlaybackUrl(fromMeta);
            setHlsFallbackUrl(getBunnyStreamHlsUrl(fromMeta));
          } else {
            setPlaybackUrl(initial);
            if (!initial) setResolveError('Esta aula ainda não possui vídeo configurado.');
          }
        }
      } catch {
        if (!cancelled) {
          setPlaybackUrl(initial);
          if (!initial) setResolveError('Esta aula ainda não possui vídeo configurado.');
        }
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lessonId, request, sourceUrl]);

  const youtubeId = useMemo(
    () => extractYoutubeId(playbackUrl || sourceUrl),
    [playbackUrl, sourceUrl],
  );

  const nativeUrl = playbackUrl || hlsFallbackUrl;

  return (
    <View style={[styles.wrap, { height: playerHeight }]}>
      {resolving ? (
        <Text style={styles.placeholder}>Carregando vídeo...</Text>
      ) : youtubeId ? (
        <WebView
          key={`yt-${youtubeId}`}
          source={{ uri: getYoutubeEmbedUri(youtubeId) }}
          style={styles.webview}
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
        />
      ) : nativeUrl ? (
        <NativeLessonVideo key={`${lessonId}-${nativeUrl}`} url={nativeUrl} />
      ) : (
        <Text style={styles.placeholder}>
          {resolveError || 'Esta aula ainda não possui vídeo configurado.'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  nativeVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  placeholder: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: '#fff',
    fontFamily: fonts.medium,
    paddingHorizontal: 16,
  },
});
