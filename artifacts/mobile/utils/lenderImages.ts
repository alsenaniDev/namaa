import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import type { Lender } from '@/types';

function getMimeType(uri: string): string {
  const clean = uri.split('?')[0].toLowerCase();
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

async function blobUriToDataUri(uri: string, mimeType: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result || `data:${mimeType};base64,`);
    };
    reader.readAsDataURL(blob);
  });
}

export async function imageUriToPersistentDataUri(uri: string): Promise<string> {
  if (!uri || uri.startsWith('data:')) return uri;
  const mimeType = getMimeType(uri);

  try {
    if (Platform.OS === 'web' && (uri.startsWith('blob:') || uri.startsWith('http'))) {
      return await blobUriToDataUri(uri, mimeType);
    }

    const base64 = await new File(uri).base64();
    return `data:${mimeType};base64,${base64}`;
  } catch {
    return uri;
  }
}

export async function normalizeLenderImageUris(lenders: Lender[]): Promise<{ lenders: Lender[]; changed: boolean }> {
  let changed = false;
  const normalized = await Promise.all(
    lenders.map(async (lender) => {
      if (!lender.imageUri || lender.imageUri.startsWith('data:')) return lender;
      const nextUri = await imageUriToPersistentDataUri(lender.imageUri);
      if (nextUri === lender.imageUri) return lender;
      changed = true;
      return { ...lender, imageUri: nextUri };
    }),
  );

  return { lenders: normalized, changed };
}
