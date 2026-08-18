import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';

export type PickedMealPhoto = {
  uri: string;
  name: string;
  mimeType: string;
};

const MAX_BYTES = 12 * 1024 * 1024;

function canReadMediaLibrary(permission: ImagePicker.MediaLibraryPermissionResponse) {
  return permission.granted || permission.accessPrivileges === 'limited';
}

function presentationStyle(): ImagePicker.UIImagePickerPresentationStyle | undefined {
  if (Platform.OS !== 'ios') return undefined;
  return ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN;
}

function isHeicLike(mimeType?: string | null, fileName?: string | null) {
  const mime = String(mimeType || '').toLowerCase();
  const name = String(fileName || '').toLowerCase();
  return mime.includes('heic') || mime.includes('heif') || /\.hei[cf]$/.test(name);
}

function toUploadMeta(asset: ImagePicker.ImagePickerAsset): PickedMealPhoto {
  const mime = String(asset.mimeType || '').toLowerCase();
  const heic = isHeicLike(mime, asset.fileName);

  if (mime.includes('png')) {
    return { uri: asset.uri, name: 'prato.png', mimeType: 'image/png' };
  }
  if (mime.includes('webp')) {
    return { uri: asset.uri, name: 'prato.webp', mimeType: 'image/webp' };
  }

  return {
    uri: asset.uri,
    name: 'prato.jpg',
    mimeType: heic ? 'image/jpeg' : mime || 'image/jpeg',
  };
}

function pickerOptions(): ImagePicker.ImagePickerOptions {
  return {
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.85,
    presentationStyle: presentationStyle(),
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  };
}

export async function pickMealPhoto(fromCamera: boolean): Promise<PickedMealPhoto | null> {
  const useCamera = fromCamera && Device.isDevice;

  const permission = useCamera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();

  const allowed = useCamera
    ? permission.granted
    : canReadMediaLibrary(permission as ImagePicker.MediaLibraryPermissionResponse);

  if (!allowed) {
    throw new Error(
      useCamera
        ? 'Permita acesso à câmera para fotografar o prato.'
        : 'Permita acesso à galeria para escolher a foto.',
    );
  }

  const options = pickerOptions();
  const result = useCamera
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  if (asset.fileSize && asset.fileSize > MAX_BYTES) {
    throw new Error('Arquivo muito grande. O limite é 12 MB.');
  }

  return toUploadMeta(asset);
}
