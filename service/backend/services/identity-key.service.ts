import { DrizzleD1Database } from "drizzle-orm/d1";
import { IdentityKeyRepository } from "../repositories/identity-key.repository";
import { sealApiKey, sha256Hex, lastFour } from "../lib/connector-crypto";
import { clearIdentityMisses } from "../lib/clerk-identities";
import { IdentityKeyMessages } from "../messages/identity-key.messages";
import { CustomError, DuplicateError } from "../utils";
import { HTTP_STATUS_CODES } from "../constants";
import type { Env } from "../types";
import type {
  IdentityKeyCreateBody,
  IdentityKeyUpdateBody,
  PublicIdentityKey,
} from "../interfaces/identity-key.interface";

const SUPPORTED_PROVIDERS = ["clerk"];

const publicIdentityKey = (k: any): PublicIdentityKey => ({
  id: k.id,
  provider: k.provider,
  label: k.label,
  key_last4: k.key_last4,
  account_ref: k.account_ref ?? null,
  status: k.status,
  last_error: k.last_error ?? null,
  created_at: k.created_at,
  updated_at: k.updated_at,
});

const requireSecret = (env: Env): string => {
  if (!env.CONNECTOR_ENC_KEY) {
    throw new CustomError(
      IdentityKeyMessages.NOT_CONFIGURED,
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
    );
  }
  return env.CONNECTOR_ENC_KEY;
};

const accountRefFor = (apiKey: string): string => {
  const env = apiKey.startsWith("sk_live_")
    ? "live"
    : apiKey.startsWith("sk_test_")
      ? "test"
      : "unknown";
  return `clerk ${env} ····${lastFour(apiKey)}`;
};

const validateClerkKey = async (apiKey: string): Promise<void> => {
  let status = 0;
  try {
    const res = await fetch("https://api.clerk.com/v1/organizations?limit=1", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    status = res.status;
  } catch {
    throw new CustomError(
      IdentityKeyMessages.INVALID_KEY,
      HTTP_STATUS_CODES.BAD_REQUEST,
    );
  }
  if (status !== 200) {
    throw new CustomError(
      IdentityKeyMessages.INVALID_KEY,
      HTTP_STATUS_CODES.BAD_REQUEST,
    );
  }
};

class IdentityKeyService {
  static async listForTenant(db: DrizzleD1Database, tenantId: string) {
    const rows = await IdentityKeyRepository.fetchByTenant(db, tenantId);
    return {
      success: true,
      message: IdentityKeyMessages.LIST_SUCCESS,
      identityKeys: rows.map(publicIdentityKey),
    };
  }

  static async create(
    db: DrizzleD1Database,
    env: Env,
    tenantId: string,
    body: IdentityKeyCreateBody,
  ) {
    const secret = requireSecret(env);
    const provider = (body.provider ?? "clerk").trim().toLowerCase();
    const label = (body.label ?? "").trim();
    const apiKey = (body.apiKey ?? "").trim();

    if (!label || !apiKey) {
      throw new CustomError(
        IdentityKeyMessages.VALIDATION_ERROR,
        HTTP_STATUS_CODES.BAD_REQUEST,
      );
    }
    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      throw new CustomError(
        IdentityKeyMessages.UNSUPPORTED_PROVIDER,
        HTTP_STATUS_CODES.BAD_REQUEST,
      );
    }

    await validateClerkKey(apiKey);

    const dedupHash = await sha256Hex(`${provider}:${apiKey}`);
    const existing = await IdentityKeyRepository.fetchByDedup(
      db,
      tenantId,
      dedupHash,
    );
    if (existing) {
      throw new DuplicateError(
        IdentityKeyMessages.DUPLICATE,
        HTTP_STATUS_CODES.FORBIDDEN,
      );
    }

    const sealed = await sealApiKey(secret, tenantId, apiKey);
    const created = await IdentityKeyRepository.create(db, {
      tenant_id: tenantId,
      provider,
      label,
      key_ciphertext: sealed.key_ciphertext,
      key_iv: sealed.key_iv,
      wrapped_dek: sealed.wrapped_dek,
      dek_iv: sealed.dek_iv,
      key_last4: lastFour(apiKey),
      dedup_hash: dedupHash,
      account_ref: accountRefFor(apiKey),
      status: "active",
    });

    clearIdentityMisses(tenantId);

    return {
      success: true,
      message: IdentityKeyMessages.CREATE_SUCCESS,
      identityKey: publicIdentityKey(created),
    };
  }

  static async updateKey(
    db: DrizzleD1Database,
    env: Env,
    tenantId: string,
    id: string,
    body: IdentityKeyUpdateBody,
  ) {
    const secret = requireSecret(env);
    const row = await IdentityKeyRepository.fetchById(db, id);
    if (!row || row.tenant_id !== tenantId) {
      throw new CustomError(
        IdentityKeyMessages.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND,
      );
    }

    const label = (body.label ?? "").trim();
    const apiKey = (body.apiKey ?? "").trim();

    if (!apiKey) {
      if (!label) {
        throw new CustomError(
          IdentityKeyMessages.VALIDATION_ERROR,
          HTTP_STATUS_CODES.BAD_REQUEST,
        );
      }
      const relabeled = await IdentityKeyRepository.update(db, id, { label });
      return {
        success: true,
        message: IdentityKeyMessages.UPDATE_SUCCESS,
        identityKey: publicIdentityKey(relabeled),
      };
    }

    await validateClerkKey(apiKey);

    const dedupHash = await sha256Hex(`${row.provider}:${apiKey}`);
    const clash = await IdentityKeyRepository.fetchByDedup(
      db,
      tenantId,
      dedupHash,
    );
    if (clash && clash.id !== id) {
      throw new DuplicateError(
        IdentityKeyMessages.DUPLICATE,
        HTTP_STATUS_CODES.FORBIDDEN,
      );
    }

    const sealed = await sealApiKey(secret, tenantId, apiKey);
    const updated = await IdentityKeyRepository.update(db, id, {
      ...(label ? { label } : {}),
      key_ciphertext: sealed.key_ciphertext,
      key_iv: sealed.key_iv,
      wrapped_dek: sealed.wrapped_dek,
      dek_iv: sealed.dek_iv,
      key_last4: lastFour(apiKey),
      dedup_hash: dedupHash,
      account_ref: accountRefFor(apiKey),
      status: "active",
      last_error: null,
    });

    clearIdentityMisses(tenantId);

    return {
      success: true,
      message: IdentityKeyMessages.UPDATE_SUCCESS,
      identityKey: publicIdentityKey(updated),
    };
  }

  static async remove(db: DrizzleD1Database, tenantId: string, id: string) {
    const row = await IdentityKeyRepository.fetchById(db, id);
    if (!row || row.tenant_id !== tenantId) {
      throw new CustomError(
        IdentityKeyMessages.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND,
      );
    }
    await IdentityKeyRepository.remove(db, id);
    clearIdentityMisses(tenantId);
    return { success: true, message: IdentityKeyMessages.REMOVE_SUCCESS };
  }
}

export default IdentityKeyService;
