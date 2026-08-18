import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';
import { getApiBase, NATIVE_CLIENT_HEADER } from '@/config/env';
import { patientTimeHeaders } from '@/lib/patient-local-time';
import { useAuth } from '@/providers/AuthProvider';

const MAX_BYTES = 8 * 1024 * 1024;
const CAMERA_SIMULATOR_MESSAGE =
  'A câmera não está disponível no simulador. Use a galeria ou teste em um iPhone físico.';

function isCameraUnavailableError(err: unknown): boolean {
  const message = String((err as Error)?.message || err || '').toLowerCase();
  return message.includes('simulator') || message.includes('not available');
}

function canReadMediaLibrary(permission: ImagePicker.MediaLibraryPermissionResponse): boolean {
  return permission.granted || permission.accessPrivileges === 'limited';
}

function imagePickerPresentationStyle(): ImagePicker.UIImagePickerPresentationStyle | undefined {
  if (Platform.OS !== 'ios') return undefined;
  return ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN;
}

export function useProfileAvatar() {
  const { token, refreshUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);

  const uploadAvatarUri = useCallback(async (uri: string, mimeType = 'image/jpeg') => {
    if (!token) throw new Error('Sessão expirada.');
    const form = new FormData();
    form.append('file', {
      uri,
      name: 'avatar.jpg',
      type: mimeType,
    } as unknown as Blob);

    const response = await fetch(`${getApiBase()}/auth/me/avatar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'X-CF-Client': NATIVE_CLIENT_HEADER,
        ...patientTimeHeaders(),
      },
      body: form,
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body?.message || 'Não foi possível atualizar a foto.');
    }

    await refreshUser();
    return body;
  }, [refreshUser, token]);

  const pickAndUploadFromSource = useCallback(async (fromCamera: boolean) => {
    setMessage('');
    setError(false);

    const useCamera = fromCamera && Device.isDevice;

    try {
      const permission = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      const hasPermission = useCamera
        ? permission.granted
        : canReadMediaLibrary(permission as ImagePicker.MediaLibraryPermissionResponse);

      if (!hasPermission) {
        setError(true);
        setMessage(
          useCamera
            ? 'Permita acesso à câmera para tirar uma foto.'
            : 'Permita acesso à galeria para alterar a foto.',
        );
        return false;
      }

      const pickerOptions = {
        mediaTypes: ['images'] as ImagePicker.MediaType[],
        allowsEditing: true,
        aspect: [1, 1] as [number, number],
        quality: 0.85,
        presentationStyle: imagePickerPresentationStyle(),
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (result.canceled || !result.assets?.[0]?.uri) return false;

      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_BYTES) {
        setError(true);
        setMessage('A imagem deve ter no máximo 8 MB.');
        return false;
      }

      setUploading(true);
      try {
        await uploadAvatarUri(asset.uri, asset.mimeType || 'image/jpeg');
        if (fromCamera && !Device.isDevice) {
          setMessage('Foto atualizada. (No simulador usamos a galeria.)');
        } else {
          setMessage('Foto atualizada.');
        }
        return true;
      } catch (err) {
        setError(true);
        setMessage((err as Error).message || 'Não foi possível atualizar a foto.');
        return false;
      } finally {
        setUploading(false);
      }
    } catch (err) {
      setError(true);
      if (useCamera && isCameraUnavailableError(err)) {
        setMessage(CAMERA_SIMULATOR_MESSAGE);
      } else {
        setMessage(
          useCamera
            ? 'Não foi possível abrir a câmera.'
            : 'Não foi possível abrir a galeria.',
        );
      }
      return false;
    }
  }, [uploadAvatarUri]);

  const pickFromGallery = useCallback(
    () => pickAndUploadFromSource(false),
    [pickAndUploadFromSource],
  );

  const takePhoto = useCallback(
    () => pickAndUploadFromSource(true),
    [pickAndUploadFromSource],
  );

  const pickAndUpload = pickFromGallery;

  return {
    uploading,
    message,
    error,
    pickFromGallery,
    takePhoto,
    pickAndUpload,
    clearMessage: () => {
      setMessage('');
      setError(false);
    },
  };
}
