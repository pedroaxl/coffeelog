/**
 * Extract a CoffeeLog qrId from scanned text. Labels encode a full URL like
 * "http://192.168.0.12:8080/u/A4F2K7", but we also accept a bare code.
 */
export function extractQrId(text: string): string | null {
  const url = text.trim();
  const m = url.match(/\/u\/([A-Z0-9]+)/i);
  if (m) return m[1].toUpperCase();
  if (/^[A-Z0-9]{4,12}$/i.test(url)) return url.toUpperCase();
  return null;
}
