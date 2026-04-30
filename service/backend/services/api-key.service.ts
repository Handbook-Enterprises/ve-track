import { DrizzleD1Database } from "drizzle-orm/d1";
import { ApiKeyRepository } from "../repositories/api-key.repository";
import { TenantRepository } from "../repositories/tenant.repository";
import { ApiKeyMessages } from "../messages/api-key.messages";
import { TenantMessages } from "../messages/tenant.messages";
import { CustomError } from "../utils";
import { HTTP_STATUS_CODES } from "../constants";
import { generateApiKey, hashApiKey } from "../lib/api-key";
import type { ApiKeyCreateBody } from "../interfaces/api-key.interface";

class ApiKeyService {
  static async create(
    db: DrizzleD1Database,
    tenantId: string,
    body: ApiKeyCreateBody,
  ) {
    const tenant = await TenantRepository.fetchById(db, tenantId);
    if (!tenant) {
      throw new CustomError(TenantMessages.NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }

    const { fullKey, prefix, hashed_key } = await generateApiKey();
    const created = await ApiKeyRepository.create(db, {
      tenant_id: tenantId,
      name: body.name,
      prefix,
      hashed_key,
    });

    if (!created) {
      return { success: false, message: ApiKeyMessages.CREATE_ERROR };
    }

    return {
      success: true,
      message: ApiKeyMessages.CREATE_SUCCESS,
      apiKey: {
        id: created.id,
        tenant_id: created.tenant_id,
        name: created.name,
        prefix: created.prefix,
        revoked_at: created.revoked_at,
        created_at: created.created_at,
        updated_at: created.updated_at,
        fullKey,
      },
    };
  }

  static async listForTenant(db: DrizzleD1Database, tenantId: string) {
    const keys = await ApiKeyRepository.fetchByTenant(db, tenantId);
    return {
      success: true,
      message: ApiKeyMessages.LIST_SUCCESS,
      apiKeys: keys,
    };
  }

  static async revoke(db: DrizzleD1Database, id: string) {
    const existing = await ApiKeyRepository.fetchById(db, id);
    if (!existing) {
      throw new CustomError(
        ApiKeyMessages.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND,
      );
    }
    const revoked = await ApiKeyRepository.revoke(db, id);
    return {
      success: true,
      message: ApiKeyMessages.REVOKE_SUCCESS,
      apiKey: revoked,
    };
  }

  static async resolve(db: DrizzleD1Database, rawKey: string) {
    const hashed = await hashApiKey(rawKey);
    const row = await ApiKeyRepository.fetchActiveByHash(db, hashed);
    if (!row) return null;
    return { tenantId: row.tenant_id, apiKeyId: row.id };
  }
}

export default ApiKeyService;
