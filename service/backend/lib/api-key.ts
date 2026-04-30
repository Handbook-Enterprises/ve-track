const KEY_PREFIX = "vt_live_";
const SECRET_LENGTH = 32;
const VISIBLE_PREFIX_LENGTH = 12;

const RANDOM_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

const randomString = (length: number): string => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += RANDOM_ALPHABET[bytes[i] % RANDOM_ALPHABET.length];
  }
  return out;
};

export const hashApiKey = async (input: string): Promise<string> => {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export const generateApiKey = async () => {
  const fullKey = `${KEY_PREFIX}${randomString(SECRET_LENGTH)}`;
  const prefix = fullKey.slice(0, VISIBLE_PREFIX_LENGTH);
  const hashed_key = await hashApiKey(fullKey);
  return { fullKey, prefix, hashed_key };
};
