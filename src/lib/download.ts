import { Platform, Share } from 'react-native';

/**
 * Delivers a small text file to the user: a real download on web,
 * the native share sheet elsewhere.
 */
export async function downloadTextFile(filename: string, mimeType: string, content: string) {
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return;
  }
  await Share.share({ title: filename, message: content });
}

/** Escapes one CSV field per RFC 4180. */
export function csvField(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
