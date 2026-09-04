import * as crypto from 'crypto';

/**
 * Generates an RFC 9562 compliant UUID version 7.
 * UUIDv7 embeds a 48-bit timestamp (ms since epoch) followed by random bits,
 * ensuring monotonic sortability for high-performance B-tree indexing in databases.
 */
export function uuidv7(): string {
  const bytes = crypto.randomBytes(16);
  const timestamp = Date.now();

  // 48-bit millisecond timestamp
  bytes[0] = (timestamp / 0x10000000000) & 0xff;
  bytes[1] = (timestamp / 0x100000000) & 0xff;
  bytes[2] = (timestamp / 0x1000000) & 0xff;
  bytes[3] = (timestamp / 0x10000) & 0xff;
  bytes[4] = (timestamp / 0x100) & 0xff;
  bytes[5] = timestamp & 0xff;

  // 4-bit version (0b0111 = 7)
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  // 2-bit variant (0b10 = RFC 4122/9562)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return [
    bytes.subarray(0, 4).toString('hex'),
    bytes.subarray(4, 6).toString('hex'),
    bytes.subarray(6, 8).toString('hex'),
    bytes.subarray(8, 10).toString('hex'),
    bytes.subarray(10, 16).toString('hex'),
  ].join('-');
}
