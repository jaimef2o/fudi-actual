import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';

/**
 * Opens the device image library and returns the local URI of the selected image.
 * Returns null if the user cancels.
 */
export async function pickImage(options?: {
  aspect?: [number, number];
  quality?: number;
  allowsEditing?: boolean;
}): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: options?.allowsEditing ?? true,
    aspect: options?.aspect ?? [1, 1],
    quality: 1,                    // keep full quality — we compress in compressAndUpload
  });

  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0].uri;
}

/**
 * Opens the device camera and returns the local URI of the captured image.
 */
export async function takePhoto(options?: {
  aspect?: [number, number];
  quality?: number;
}): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: options?.aspect ?? [1, 1],
    quality: 1,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0].uri;
}

/**
 * Compress + upload a local image URI to Supabase Storage.
 * Uses fetch() to get a Blob — avoids base64/ArrayBuffer which can hang on RN.
 * Returns the public URL.
 */
export async function compressAndUpload(
  localUri: string,
  path: string,
): Promise<string> {
  // 1. Resize + compress with ImageManipulator (no base64 — just get the new URI)
  const result = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 1200 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
  );

  // 2. Read the compressed file as a Blob via fetch (reliable on React Native)
  const fetchResponse = await fetch(result.uri);
  const blob = await fetchResponse.blob();

  // 3. Upload to Supabase Storage
  const { error } = await supabase.storage
    .from('photos')
    .upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) {
    const msg = error.message ?? String(error);
    throw new Error(`Upload failed: ${msg}`);
  }

  const { data } = supabase.storage.from('photos').getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Legacy alias — upload without compression (uses compressAndUpload internally).
 */
export async function uploadPhoto(
  localUri: string,
  path: string,
): Promise<string> {
  return compressAndUpload(localUri, path);
}

/**
 * Full flow: pick an image and upload it to Supabase Storage.
 * Returns the public URL or null if cancelled.
 */
export async function pickAndUpload(
  folder: string,
  options?: { aspect?: [number, number]; quality?: number },
): Promise<string | null> {
  const localUri = await pickImage(options);
  if (!localUri) return null;

  const filename = `${Date.now()}.jpg`;
  const storagePath = `${folder}/${filename}`;

  return compressAndUpload(localUri, storagePath);
}
