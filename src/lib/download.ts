import { File, Paths } from 'expo-file-system';
import { Platform, Share } from 'react-native';

/**
 * Delivers a small text file to the user: a real download on web,
 * the native share sheet elsewhere.
 *
 * Icerik cihazda gecici bir dosyaya yazilip **dosya olarak** paylasilir. Once
 * duz metin olarak paylasiliyordu (`message`), bunun sonucu "Takvime Ekle"
 * dugmesinin ise yaramamasiydi: iOS elinde bir dosya olmadigi icin Takvim'i
 * onermiyor, ham "BEGIN:VCALENDAR ..." metnini mesaj olarak gonderiyordu.
 *
 * Dosya onbellek dizinine yaziliyor: sistem yer daralinca silebilir, paylasim
 * aninda okundugu icin kalici olmasi gerekmiyor.
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

  const file = new File(Paths.cache, filename);
  // Ayni mac icin ikinci kez paylasilirsa dosya duruyor olabilir.
  if (file.exists) file.delete();
  file.create();
  file.write(content);

  // Android metin/dosya paylasimini `url` ile yapmiyor; orada baslik ve dosya
  // birlikte gonderilir.
  await Share.share(
    Platform.OS === 'ios' ? { url: file.uri } : { title: filename, url: file.uri },
  );
}

/** Escapes one CSV field per RFC 4180. */
export function csvField(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
