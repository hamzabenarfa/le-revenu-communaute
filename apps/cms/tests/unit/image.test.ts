import { sniffImage } from '../../src/utils/image';

const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(12).fill(0)].slice(0, 12));

describe('sniffImage', () => {
  it('recognises JPEG, PNG and WebP from their first bytes', () => {
    expect(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0))?.mime).toBe('image/jpeg');
    expect(sniffImage(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))?.ext).toBe('png');
    expect(sniffImage(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))?.mime).toBe('image/webp');
  });

  it('rejects anything else, whatever the declared type (e.g. HTML renamed .png)', () => {
    expect(sniffImage(new TextEncoder().encode('<html><script>'))).toBeNull();
    expect(sniffImage(bytes(0x47, 0x49, 0x46, 0x38))).toBeNull(); // GIF is not accepted
  });
});
