import type { ConfigContext, ExpoConfig } from 'expo/config';

const PROD_API_BASE = 'https://apiclube.nutrisabellajardim.com.br/api';
const PATIENT_WEB_URL = 'https://app.nutrisabellajardim.com.br';

export default ({ config }: ConfigContext): ExpoConfig => {
  const apiBase = process.env.EXPO_PUBLIC_API_BASE?.trim().replace(/\/$/, '') || PROD_API_BASE;

  return {
    ...(config as ExpoConfig),
    name: 'Clube Florescer',
    slug: 'clube-florescer',
    version: '1.0.0',
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
      config: {
        usesNonExemptEncryption: false,
      },
      associatedDomains: ['applinks:app.nutrisabellajardim.com.br'],
      infoPlist: {
        NSCameraUsageDescription:
          'A câmera é usada nas consultas por vídeo com sua nutricionista e para anexar fotos na comunidade.',
        NSMicrophoneUsageDescription:
          'O microfone é usado nas consultas por vídeo com sua nutricionista.',
        NSPhotoLibraryUsageDescription:
          'Permite escolher fotos da galeria para publicar na comunidade do Clube Florescer.',
        ITSAppUsesNonExemptEncryption: false,
        CFBundleAllowMixedLocalizations: true,
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
        'expo-image-picker',
        {
          photosPermission:
            'Permite escolher fotos da galeria para publicar na comunidade do Clube Florescer.',
          cameraPermission:
            'Permite tirar fotos para publicar na comunidade do Clube Florescer.',
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
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      ...(typeof config.extra === 'object' && config.extra ? config.extra : {}),
      apiBase,
      patientWebUrl: PATIENT_WEB_URL,
    },
  };
};
