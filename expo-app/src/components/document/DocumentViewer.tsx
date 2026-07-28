import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import CfButton from '@/components/ui/CfButton';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { NATIVE_CLIENT_HEADER } from '@/config/env';
import { toAbsoluteDocumentUrl } from '@/lib/patient-document';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fonts, spacing } from '@/theme/tokens';

type Props = {
  documentSrc: string;
  title?: string;
};

type NativeViewMode = 'direct' | 'iframe';

function buildEmbedUrl(documentSrc: string) {
  const absolute = toAbsoluteDocumentUrl(documentSrc);
  return `${absolute}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`;
}

function buildNativeIframeHtml(src: string) {
  const safe = src
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <style>
    html, body { margin: 0; padding: 0; height: 100%; background: #fff; }
    iframe { width: 100%; height: 100%; border: 0; }
  </style>
</head>
<body>
  <iframe src="${safe}" title="PDF"></iframe>
</body>
</html>`;
}

type WebPdfFrameProps = {
  src: string;
  title: string;
  onLoad: () => void;
  onError: () => void;
};

function WebPdfFrame({ src, title, onLoad, onError }: WebPdfFrameProps) {
  return (
    <View style={styles.viewer}>
      {createElement('iframe', {
        src,
        title,
        onLoad,
        onError,
        style: {
          width: '100%',
          height: '100%',
          border: 'none',
          flex: 1,
          display: 'block',
        },
      })}
    </View>
  );
}

export default function DocumentViewer({ documentSrc, title = 'Material PDF' }: Props) {
  const { token } = useAuth();
  const embedUrl = useMemo(() => buildEmbedUrl(documentSrc), [documentSrc]);
  const [nativeMode, setNativeMode] = useState<NativeViewMode>('direct');
  const [webSrc, setWebSrc] = useState(() => embedUrl);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = {
      'X-CF-Client': NATIVE_CLIENT_HEADER,
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, [token]);

  useEffect(() => {
    setNativeMode('direct');
    setWebSrc(embedUrl);
    setLoading(true);
    setError('');
  }, [documentSrc, embedUrl, reloadKey]);

  const finishLoading = useCallback(() => {
    setLoading(false);
    setError('');
  }, []);

  const activateWebBlobFallback = useCallback(async () => {
    setLoading(true);
    try {
      const absolute = toAbsoluteDocumentUrl(documentSrc);
      const response = await fetch(absolute, {
        headers: {
          ...authHeaders,
          Accept: 'application/pdf,application/octet-stream,*/*',
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          (body as { message?: string }).message
            || `Não foi possível carregar o PDF (${response.status}).`,
        );
      }

      const buffer = await response.arrayBuffer();
      if (!buffer.byteLength) throw new Error('O PDF está vazio ou indisponível.');

      const header = new TextDecoder().decode(buffer.slice(0, 5));
      if (!header.startsWith('%PDF')) {
        throw new Error('O servidor não retornou um PDF válido.');
      }

      const blob = new Blob([buffer], { type: 'application/pdf' });
      setWebSrc(URL.createObjectURL(blob));
      setLoading(true);
    } catch (err) {
      setError((err as Error).message || 'Não foi possível abrir o PDF neste dispositivo.');
      setLoading(false);
    }
  }, [authHeaders, documentSrc]);

  useEffect(() => {
    if (!webSrc.startsWith('blob:')) return undefined;
    return () => {
      URL.revokeObjectURL(webSrc);
    };
  }, [webSrc]);

  const handleNativeError = useCallback(() => {
    if (nativeMode === 'direct') {
      setNativeMode('iframe');
      setLoading(true);
      return;
    }
    setError('Não foi possível exibir o PDF neste dispositivo.');
    setLoading(false);
  }, [nativeMode]);

  const nativeSource = useMemo(() => {
    if (nativeMode === 'iframe') {
      return { html: buildNativeIframeHtml(embedUrl) };
    }
    return { uri: embedUrl, headers: authHeaders };
  }, [authHeaders, embedUrl, nativeMode]);

  if (error) {
    return (
      <View style={styles.state}>
        <Text style={styles.stateText}>{error}</Text>
        <CfButton
          label="Tentar novamente"
          variant="ghost"
          onPress={() => setReloadKey((k) => k + 1)}
        />
      </View>
    );
  }

  return (
    <View style={styles.viewer}>
      {loading ? (
        <View style={styles.loadingOverlay}>
          <LoadingScreen />
        </View>
      ) : null}

      {Platform.OS === 'web' ? (
        <WebPdfFrame
          key={`web-${reloadKey}-${webSrc}`}
          src={webSrc}
          title={title}
          onLoad={finishLoading}
          onError={() => {
            if (webSrc.startsWith('blob:')) {
              setError('Não foi possível exibir o PDF neste dispositivo.');
              setLoading(false);
              return;
            }
            void activateWebBlobFallback();
          }}
        />
      ) : (
        <WebView
          key={`native-${reloadKey}-${nativeMode}`}
          source={nativeSource}
          style={styles.viewer}
          originWhitelist={['*']}
          javaScriptEnabled
          onLoadEnd={finishLoading}
          onHttpError={handleNativeError}
          onError={handleNativeError}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  viewer: { flex: 1, backgroundColor: '#fff' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    backgroundColor: colors.bg,
  },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[5],
    gap: spacing[4],
  },
  stateText: {
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
