// @ts-nocheck
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
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
    copyToCacheDirectory: true,    // ensures file:// URI on iOS
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
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0].uri;
}

/**
 * Compress + upload a local image URI to Supabase Storage.
 * Gets base64 directly from ImageManipulator — no FileSystem.readAsStringAsync needed.
 * Returns the public URL.
 */
export async function compressAndUpload(
  localUri: string,
  path: string,
): Promise<string> {
  // Use ImageManipulator to resize AND get base64 in one step
  const result = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 1200 } }],
    {
      compress: 0.8,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,  // ← get base64 directly, avoids FileSystem read
    },
  );

  if (!result.base64) throw new Error('Image compression returned no data');

  const arrayBuffer = decode(result.base64);

  const { error } = await supabase.storage
    .from('photos')
    .upload(path, arrayBuffer, {
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
