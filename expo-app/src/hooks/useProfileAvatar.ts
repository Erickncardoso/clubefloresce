import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { getApiBase, NATIVE_CLIENT_HEADER } from '@/config/env';
import { patientTimeHeaders } from '@/lib/patient-local-time';
import { useAuth } from '@/providers/AuthProvider';

const MAX_BYTES = 8 * 1024 * 1024;

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

  const pickAndUpload = useCallback(async () => {
    setMessage('');
    setError(false);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(true);
      setMessage('Permita acesso à galeria para alterar a foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_BYTES) {
      setError(true);
      setMessage('A imagem deve ter no máximo 8 MB.');
      return;
    }

    setUploading(true);
    try {
      await uploadAvatarUri(asset.uri, asset.mimeType || 'image/jpeg');
      setMessage('Foto atualizada.');
    } catch (err) {
      setError(true);
      setMessage((err as Error).message || 'Não foi possível atualizar a foto.');
    } finally {
      setUploading(false);
    }
  }, [uploadAvatarUri]);

  return { uploading, message, error, pickAndUpload, clearMessage: () => { setMessage(''); setError(false); } };
}
