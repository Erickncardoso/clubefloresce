import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { PATIENT_WEB_BASE } from '@/config/legal';
import { resolveVbAssetsBase } from '@/config/resolve-vb-web-base';
import { buildChamadaMediaHtml } from '@/lib/chamada-media-html';

export type ChamadaMediaState = {
  status: 'connecting' | 'live' | 'waiting' | 'error' | 'left';
  remoteName: string;
  remoteHasVideo: boolean;
  localHasVideo: boolean;
  audioMuted: boolean;
  videoMuted: boolean;
  speakerMuted: boolean;
  backgroundMode?: string;
  videoQuality?: 'auto' | '720' | '1080';
};

type EngineMessage =
  | { type: 'state'; payload: ChamadaMediaState }
  | { type: 'ready' }
  | { type: 'left' }
  | { type: 'error'; message?: string }
  | { type: 'warn'; message?: string };

export type ChamadaMediaHandle = {
  sendCommand: (cmd: string, extra?: Record<string, unknown>) => void;
};

type Props = {
  domain: string;
  roomName: string;
  displayName: string;
  chromeInsets?: { top: number; bottom: number };
  onReady?: () => void;
  onLeft?: () => void;
  onError?: (message: string) => void;
  onWarn?: (message: string) => void;
  onState?: (state: ChamadaMediaState) => void;
};

const ChamadaMediaEngine = forwardRef<ChamadaMediaHandle, Props>(function ChamadaMediaEngine(
  {
    domain,
    roomName,
    displayName,
    chromeInsets,
    onReady,
    onLeft,
    onError,
    onWarn,
    onState,
  },
  ref,
) {
  const webRef = useRef<WebView>(null);
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const meetOrigin = `https://${cleanDomain}`;
  const vbAssetsBase = `${resolveVbAssetsBase()}/jitsi-vb`;
  const chromeTop = Math.max(0, Math.round(chromeInsets?.top ?? 92));
  const chromeBottom = Math.max(0, Math.round(chromeInsets?.bottom ?? 96));

  const html = useMemo(
    () =>
      buildChamadaMediaHtml({
        domain: cleanDomain,
        roomName,
        displayName,
        vbBase: vbAssetsBase,
        chromeTop,
        chromeBottom,
      }),
    [chromeBottom, chromeTop, cleanDomain, displayName, roomName, vbAssetsBase],
  );

  const bridgeBootstrap = `
    (function(){
      if (typeof navigator !== 'undefined' && !navigator.mediaDevices) {
        var legacy = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        if (legacy) {
          navigator.mediaDevices = {
            getUserMedia: function(constraints) {
              return new Promise(function(resolve, reject) {
                legacy.call(navigator, constraints, resolve, reject);
              });
            },
            enumerateDevices: function() {
              return Promise.resolve([]);
            }
          };
        }
      }
      window.__cfCommandQueue = window.__cfCommandQueue || [];
      window.__cfCallCommand = function(data) {
        if (window.__cfEngineDispatch) window.__cfEngineDispatch(data);
        else window.__cfCommandQueue.push(data);
      };
    })();
    true;
  `;

  const sendCommand = useCallback((cmd: string, extra?: Record<string, unknown>) => {
    const payload = JSON.stringify({ cmd, ...(extra || {}) });
    webRef.current?.injectJavaScript(
      `(function(){try{if(window.__cfCallCommand)window.__cfCallCommand(${payload});}catch(e){}})(); true;`,
    );
  }, []);

  useImperativeHandle(ref, () => ({ sendCommand }), [sendCommand]);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as EngineMessage;
      if (data.type === 'state') {
        onState?.(data.payload);
        return;
      }
      if (data.type === 'ready') {
        onReady?.();
        return;
      }
      if (data.type === 'left') {
        onLeft?.();
        return;
      }
      if (data.type === 'warn') {
        onWarn?.(data.message || 'Ação indisponível no momento.');
        return;
      }
      if (data.type === 'error') {
        onError?.(data.message || 'Falha na consulta por vídeo.');
      }
    } catch {
      /* ignore */
    }
  }, [onError, onLeft, onReady, onState, onWarn]);

  return (
    <View style={styles.root} pointerEvents="box-none">
      <WebView
        ref={webRef}
        source={{ html, baseUrl: `${meetOrigin}/` }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grant"
        injectedJavaScriptBeforeContentLoaded={bridgeBootstrap}
        setSupportMultipleWindows={false}
        allowsBackForwardNavigationGestures={false}
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={(request) => {
          const url = request.url || '';
          if (!url || url.startsWith('about:') || url.startsWith('blob:') || url.startsWith('data:')) return true;
          if (url.includes(cleanDomain)) return true;
          if (url.startsWith(resolveVbAssetsBase())) return true;
          try {
            return url.includes(new URL(PATIENT_WEB_BASE).host);
          } catch {
            return url.includes('app.nutrisabellajardim.com.br');
          }
        }}
      />
    </View>
  );
});

export default ChamadaMediaEngine;

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 0,
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
});
