import type { ConfigContext, ExpoConfig } from 'expo/config';

const PROD_API_BASE = 'https://apiclube.nutrisabellajardim.com.br/api';
const PATIENT_WEB_URL = 'https://app.nutrisabellajardim.com.br';

export default ({ config }: ConfigContext): ExpoConfig => {
  const rawApiBase = process.env.EXPO_PUBLIC_API_BASE?.trim();
  const isProdBuild = process.env.NODE_ENV === 'production';
  const apiBase =
    rawApiBase && rawApiBase !== 'auto'
      ? rawApiBase.replace(/\/$/, '')
      : isProdBuild
        ? PROD_API_BASE
        : 'auto';

  return {
    ...(config as ExpoConfig),
    name: 'Florescer',
    slug: 'clube-florescer',
    version: '1.0.1',
    orientation: 'portrait',
    scheme: 'clubeflorescer',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#F7F6F2',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.clubeflorescer.app',
      buildNumber: '1',
      appleTeamId: '3UUG4F577B',
      config: {
        usesNonExemptEncryption: false,
      },
      associatedDomains: ['applinks:app.nutrisabellajardim.com.br'],
      infoPlist: {
        NSCameraUsageDescription:
          'A câmera é usada nas consultas por vídeo, para registrar refeições com a Bella e para anexar fotos na comunidade.',
        NSMicrophoneUsageDescription:
          'O microfone é usado nas consultas por vídeo com sua nutricionista.',
        NSPhotoLibraryUsageDescription:
          'Permite escolher fotos da galeria para publicar na comunidade do Clube Florescer.',
        NSUserNotificationsUsageDescription:
          'Enviamos lembretes de check-in, metas diárias e avisos do seu acompanhamento nutricional.',
        ITSAppUsesNonExemptEncryption: false,
        CFBundleAllowMixedLocalizations: true,
        NSSupportsLiveActivities: true,
      },
    },
    android: {
      package: 'com.clubeflorescer.app',
      versionCode: 1,
      permissions: [
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
        'android.permission.MODIFY_AUDIO_SETTINGS',
        'android.permission.READ_MEDIA_IMAGES',
        'android.permission.POST_NOTIFICATIONS',
      ],
      adaptiveIcon: {
        backgroundColor: '#F7F6F2',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-font',
      'expo-video',
      [
        'expo-notifications',
        {
          color: '#8B967C',
          icon: './assets/notification-icon.png',
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission:
            'A câmera é usada nas consultas por vídeo, para registrar refeições com a Bella e para anexar fotos na comunidade.',
          recordAudioAndroid: false,
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission:
            'Permite escolher fotos da galeria para registrar refeições e publicar na comunidade.',
          cameraPermission:
            'Permite tirar fotos para registrar refeições e publicar na comunidade.',
        },
      ],
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          imageWidth: 220,
          resizeMode: 'contain',
          backgroundColor: '#F7F6F2',
        },
      ],
      ...(process.env.EAS_BUILD_PLATFORM === 'android' ? [] : ['@bacons/apple-targets']),
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      ...(typeof config.extra === 'object' && config.extra ? config.extra : {}),
      apiBase,
      patientWebUrl: PATIENT_WEB_URL,
      bunnyStreamLibraryId: process.env.EXPO_PUBLIC_BUNNY_STREAM_LIBRARY_ID?.trim() || '683348',
    },
  };
};
