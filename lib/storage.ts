// @ts-nocheck
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
  if (status !== 'granted') {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: options?.allowsEditing ?? true,
    aspect: options?.aspect ?? [1, 1],
    quality: options?.quality ?? 0.8,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0].uri;
}

/**
 * Opens the device camera and returns the local URI of the captured image.
 * Returns null if the user cancels or denies permission.
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
    quality: options?.quality ?? 0.8,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0].uri;
}

/**
 * Uploads a local image URI to Supabase Storage bucket "photos".
 * Returns the public URL of the uploaded file.
 *
 * NOTE: You must create a public bucket named "photos" in your Supabase dashboard:
 * Storage → New Bucket → name: "photos" → Public: ON
 */
export async function uploadPhoto(
  localUri: string,
  path: string,
): Promise<string> {
  // Fetch the local file as a blob
  const response = await fetch(localUri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from('photos')
    .upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from('photos').getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Compress a local image to ≤1200px wide at 80% JPEG quality,
 * then upload to Supabase Storage.
 * Falls back to the original URI if expo-image-manipulator isn't installed.
 * Returns the public URL of the uploaded file.
 */
export async function compressAndUpload(
  localUri: string,
  path: string,
): Promise<string> {
  let finalUri = localUri;
  try {
    const result = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: 1200 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
    );
    finalUri = result.uri;
  } catch {
    // expo-image-manipulator not available — upload original
  }
  return uploadPhoto(finalUri, path);
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

  const ext = localUri.split('.').pop() ?? 'jpg';
  const filename = `${Date.now()}.${ext}`;
  const path = `${folder}/${filename}`;

  return uploadPhoto(localUri, path);
}
