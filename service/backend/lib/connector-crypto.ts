const IV_BYTES = 12;
const DEK_BYTES = 32;

const toB64 = (buf: ArrayBuffer | Uint8Array): string => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

const fromB64 = (value: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const importKek = async (secret: string): Promise<CryptoKey> => {
  const raw = fromB64(secret);
  if (raw.length !== 32) {
    throw new Error(
      "CONNECTOR_ENC_KEY must be a base64 encoded 32 byte key",
    );
  }
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
};

export interface SealedKey {
  key_ciphertext: string;
  key_iv: string;
  wrapped_dek: string;
  dek_iv: string;
}

export const sealApiKey = async (
  secret: string,
  tenantId: string,
  plaintext: string,
): Promise<SealedKey> => {
  const kek = await importKek(secret);
  const aad = new TextEncoder().encode(tenantId);

  const dekRaw = crypto.getRandomValues(new Uint8Array(DEK_BYTES));
  const dek = await crypto.subtle.importKey(
    "raw",
    dekRaw,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"],
  );

  const keyIv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: keyIv, additionalData: aad },
    dek,
    new TextEncoder().encode(plaintext),
  );

  const dekIv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const wrapped = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: dekIv, additionalData: aad },
    kek,
    dekRaw,
  );

  return {
    key_ciphertext: toB64(cipher),
    key_iv: toB64(keyIv),
    wrapped_dek: toB64(wrapped),
    dek_iv: toB64(dekIv),
  };
};

export const openApiKey = async (
  secret: string,
  tenantId: string,
  sealed: SealedKey,
): Promise<string> => {
  const kek = await importKek(secret);
  const aad = new TextEncoder().encode(tenantId);

  const dekRaw = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(sealed.dek_iv), additionalData: aad },
    kek,
    fromB64(sealed.wrapped_dek),
  );
  const dek = await crypto.subtle.importKey(
    "raw",
    dekRaw,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(sealed.key_iv), additionalData: aad },
    dek,
    fromB64(sealed.key_ciphertext),
  );
  return new TextDecoder().decode(plaintext);
};

export const sha256Hex = async (input: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export const lastFour = (value: string): string => value.slice(-4);
