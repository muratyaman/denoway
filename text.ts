const decoder = new TextDecoder();
const encoder = new TextEncoder();

export function decode(bin?: BufferSource): string {
  return decoder.decode(bin);
}

export function encode(s?: string): Uint8Array {
  return encoder.encode(s);
}
