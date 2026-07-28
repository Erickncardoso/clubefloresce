import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';

import { Platform, StyleSheet, Text, View } from 'react-native';

import { WebView } from 'react-native-webview';

import {
  buildPlaybackUrlFromMetadata,
  getBunnyEmbedPlayerHtml,
  getDirectVideoHtml,
  getHlsVideoHtml,
  getYoutubeEmbedUri,
  resolveLessonPlayerSource,
} from '@/lib/course-video';

import { isBunnyStreamVideoUrl } from '@/lib/bunny-video';

import { usePatientApi } from '@/hooks/usePatientApi';

import { fonts } from '@/theme/tokens';

type BunnyMetadataResponse = {
  available?: boolean;
  metadata?: {
    cdnHost?: string;
    videoId?: string;
    libraryId?: string;
    embedUrl?: string;
  };
};

type Props = {
  lesson?: Record<string, unknown> | null;
  rawVideoUrl?: string;
  fillContainer?: boolean;
  onTimeUpdate?: (seconds: number) => void;
  seekRef?: MutableRefObject<((seconds: number) => void) | null>;
};

type BridgeFrameProps = {
  html: string;
  onTimeUpdate?: (seconds: number) => void;
  seekRef?: MutableRefObject<((seconds: number) => void) | null>;
};

function parseBridgeMessage(raw: unknown): number | null {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (
      data
      && typeof data === 'object'
      && (data as { type?: string }).type === 'cf-video-time'
      && typeof (data as { seconds?: number }).seconds === 'number'
    ) {
      return (data as { seconds: number }).seconds;
    }
  } catch {
    return null;
  }
  return null;
}

function BridgeVideoFrame({ html, onTimeUpdate, seekRef }: BridgeFrameProps) {
  const webViewRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const handleBridgeMessage = useCallback((raw: unknown) => {
    const seconds = parseBridgeMessage(raw);
    if (seconds !== null) onTimeUpdate?.(seconds);
  }, [onTimeUpdate]);

  useEffect(() => {
    if (!seekRef) return;

    seekRef.current = (seconds: number) => {
      const safeSeconds = Number(seconds) || 0;
      if (Platform.OS === 'web') {
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'cf-video-seek', seconds: safeSeconds },
          '*',
        );
        const frameWindow = iframeRef.current?.contentWindow as (Window & { __cfSeek?: (s: number) => void }) | null;
        frameWindow?.__cfSeek?.(safeSeconds);
        return;
      }
      webViewRef.current?.injectJavaScript(
        `window.__cfSeek(${safeSeconds}); true;`,
      );
    };

    return () => {
      seekRef.current = null;
    };
  }, [html, seekRef]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      handleBridgeMessage(event.data);
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [handleBridgeMessage]);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.fill}>
        {createElement('iframe', {
          ref: iframeRef,
          srcDoc: html,
          title: 'Vídeo',
          style: {
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
            backgroundColor: '#000',
          },
          allow: 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen',
          allowFullScreen: true,
        })}
      </View>
    );
  }

  return (
    <WebView
      ref={webViewRef}
      source={{ html }}
      style={styles.fill}
      originWhitelist={['*']}
      javaScriptEnabled
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      allowsFullscreenVideo
      onMessage={(event) => handleBridgeMessage(event.nativeEvent.data)}
    />
  );
}

function WebYoutubeFrame({ src, title }: { src: string; title?: string }) {
  return (
    <View style={styles.fill}>
      {createElement('iframe', {
        src,
        title: title || 'YouTube',
        style: {
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
          backgroundColor: '#000',
        },
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen',
        allowFullScreen: true,
      })}
    </View>
  );
}

function NativeYoutubeVideo({ uri }: { uri: string }) {
  return (
    <WebView
      source={{ uri }}
      style={styles.fill}
      allowsFullscreenVideo
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      javaScriptEnabled
      domStorageEnabled
    />
  );
}

export default function LessonVideoPlayer({
  lesson,
  rawVideoUrl,
  fillContainer = false,
  onTimeUpdate,
  seekRef,
}: Props) {
  const { request } = usePatientApi();
  const [playbackUrl, setPlaybackUrl] = useState('');
  const [bunnyMetadata, setBunnyMetadata] = useState<BunnyMetadataResponse['metadata'] | null>(null);
  const [resolving, setResolving] = useState(true);
  const [resolveError, setResolveError] = useState('');

  const lessonId = String(lesson?.id || '');
  const sourceUrl = rawVideoUrl || String(lesson?.videoUrl || '');
  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;

  useEffect(() => {
    onTimeUpdateRef.current?.(0);
  }, [lessonId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setResolving(true);
      setResolveError('');
      setPlaybackUrl('');
      setBunnyMetadata(null);

      const initial = sourceUrl.trim();
      const isBareGuid = /^[a-f0-9-]{36}$/i.test(initial);
      const hasDirectUrl = Boolean(initial && !isBareGuid);

      if (hasDirectUrl && !cancelled) {
        setPlaybackUrl(initial);
        setResolving(false);
      }

      if (!lessonId) {
        if (!cancelled) {
          if (!initial) setResolveError('Esta aula ainda não possui vídeo configurado.');
          setResolving(false);
        }
        return;
      }

      const shouldFetchMetadata = isBareGuid || isBunnyStreamVideoUrl(initial);

      if (!shouldFetchMetadata) {
        if (!cancelled && !hasDirectUrl) {
          if (!initial) setResolveError('Esta aula ainda não possui vídeo configurado.');
          setResolving(false);
        }
        return;
      }

      try {
        const result = await request<BunnyMetadataResponse>(
          `/courses/lessons/${lessonId}/video-metadata`,
        );

        if (cancelled) return;

        if (result?.metadata) {
          setBunnyMetadata(result.metadata);
        }

        const fromMeta = buildPlaybackUrlFromMetadata(result?.metadata);
        if (fromMeta) {
          setPlaybackUrl(fromMeta);
        } else if (!hasDirectUrl) {
          setPlaybackUrl(initial);
        }

        if (!fromMeta && !initial) {
          setResolveError('Esta aula ainda não possui vídeo configurado.');
        }
      } catch {
        if (cancelled) return;
        if (!hasDirectUrl) {
          setPlaybackUrl(initial);
          if (!initial) setResolveError('Esta aula ainda não possui vídeo configurado.');
        }
      } finally {
        if (!cancelled && !hasDirectUrl) {
          setResolving(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lessonId, request, sourceUrl]);

  const playerSource = useMemo(
    () => resolveLessonPlayerSource(sourceUrl, playbackUrl, bunnyMetadata),
    [bunnyMetadata, playbackUrl, sourceUrl],
  );

  const bridgeProps = { onTimeUpdate, seekRef };
  const wrapStyle = fillContainer ? styles.fill : styles.wrap;

  return (
    <View style={wrapStyle}>
      {resolving ? (
        <Text style={styles.placeholder}>Carregando vídeo...</Text>
      ) : playerSource.kind === 'youtube' ? (
        Platform.OS === 'web' ? (
          <WebYoutubeFrame src={getYoutubeEmbedUri(playerSource.youtubeId)} title="YouTube" />
        ) : (
          <NativeYoutubeVideo uri={getYoutubeEmbedUri(playerSource.youtubeId)} />
        )
      ) : playerSource.kind === 'bunny-embed' ? (
        <BridgeVideoFrame
          html={getBunnyEmbedPlayerHtml(playerSource.url)}
          {...bridgeProps}
        />
      ) : playerSource.kind === 'hls' ? (
        <BridgeVideoFrame html={getHlsVideoHtml(playerSource.url)} {...bridgeProps} />
      ) : playerSource.kind === 'mp4' ? (
        <BridgeVideoFrame html={getDirectVideoHtml(playerSource.url)} {...bridgeProps} />
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
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  fill: {
    flex: 1,
    width: '100%',
    minHeight: 180,
    backgroundColor: '#000',
    overflow: 'hidden',
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
