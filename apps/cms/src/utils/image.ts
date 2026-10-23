import { open } from 'node:fs/promises';

export interface DetectedImage {
  mime: 'image/jpeg' | 'image/png' | 'image/webp';
  ext: 'jpg' | 'png' | 'webp';
}

/**
 * Identifies an image from its first bytes. The Content-Type and file name sent
 * by the client are not trusted: a renamed HTML file must never be stored.
 */
export function sniffImage(head: Uint8Array): DetectedImage | null {
  const at = (i: number, bytes: number[]) => bytes.every((b, k) => head[i + k] === b);
  if (at(0, [0xff, 0xd8, 0xff])) return { mime: 'image/jpeg', ext: 'jpg' };
  if (at(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: 'image/png', ext: 'png' };
  if (at(0, [0x52, 0x49, 0x46, 0x46]) && at(8, [0x57, 0x45, 0x42, 0x50])) return { mime: 'image/webp', ext: 'webp' };
  return null;
}

export async function sniffImageFile(path: string): Promise<DetectedImage | null> {
  const handle = await open(path, 'r');
  try {
    const head = new Uint8Array(12);
    await handle.read(head, 0, 12, 0);
    return sniffImage(head);
  } finally {
    await handle.close();
  }
}
