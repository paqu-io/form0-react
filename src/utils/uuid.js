const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));

function getCrypto() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    return globalThis.crypto;
  }
  return null;
}

const cryptoAPI = getCrypto();

function randomBytes(length) {
  if (!cryptoAPI?.getRandomValues) {
    throw new Error('form0-react: crypto.getRandomValues is unavailable in this environment');
  }
  const array = new Uint8Array(length);
  cryptoAPI.getRandomValues(array);
  return array;
}

function bytesToUuid(bytes) {
  return (
    HEX[bytes[0]] +
    HEX[bytes[1]] +
    HEX[bytes[2]] +
    HEX[bytes[3]] +
    '-' +
    HEX[bytes[4]] +
    HEX[bytes[5]] +
    '-' +
    HEX[bytes[6]] +
    HEX[bytes[7]] +
    '-' +
    HEX[bytes[8]] +
    HEX[bytes[9]] +
    '-' +
    HEX[bytes[10]] +
    HEX[bytes[11]] +
    HEX[bytes[12]] +
    HEX[bytes[13]] +
    HEX[bytes[14]] +
    HEX[bytes[15]]
  ).toLowerCase();
}

export function uuidv4() {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytesToUuid(bytes);
}

export function uuidv7() {
  const bytes = new Uint8Array(16);
  let timestamp = BigInt(Date.now());
  for (let i = 5; i >= 0; i -= 1) {
    bytes[i] = Number(timestamp & 0xffn);
    timestamp >>= 8n;
  }
  const rand = randomBytes(10);
  bytes.set(rand, 6);
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytesToUuid(bytes);
}
