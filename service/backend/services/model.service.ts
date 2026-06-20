import { DrizzleD1Database } from "drizzle-orm/d1";
import { ModelRepository } from "../repositories/model.repository";
import { ModelMessages } from "../messages/model.messages";
import { CustomError, DuplicateError } from "../utils";
import { HTTP_STATUS_CODES } from "../constants";
import type {
  ModelCreateBody,
  ModelUpdateBody,
} from "../interfaces/model.interface";

class ModelService {
  static async create(
    db: DrizzleD1Database,
    tenantId: string,
    body: ModelCreateBody,
  ) {
    const provider = (body.provider ?? "").trim().toLowerCase();
    const modelId = (body.model_id ?? "").trim();
    if (!provider || !modelId) {
      throw new CustomError(
        ModelMessages.VALIDATION_ERROR,
        HTTP_STATUS_CODES.BAD_REQUEST,
      );
    }
    const name = (body.name ?? "").trim() || modelId;

    const existing = await ModelRepository.fetchByKey(
      db,
      tenantId,
      provider,
      modelId,
    );
    if (existing) {
      throw new DuplicateError(
        ModelMessages.DUPLICATE,
        HTTP_STATUS_CODES.FORBIDDEN,
      );
    }

    const created = await ModelRepository.create(db, {
      tenant_id: tenantId,
      provider,
      model_id: modelId,
      name,
      description: body.description ?? null,
      status: body.status ?? "active",
    });
    return {
      success: true,
      message: ModelMessages.CREATE_SUCCESS,
      data: created,
    };
  }

  static async listForTenant(db: DrizzleD1Database, tenantId: string) {
    const data = await ModelRepository.fetchByTenant(db, tenantId);
    return { success: true, message: ModelMessages.LIST_SUCCESS, data };
  }

  static async getById(db: DrizzleD1Database, tenantId: string, id: string) {
    const row = await ModelRepository.fetchById(db, id);
    if (!row || row.tenant_id !== tenantId) {
      throw new CustomError(ModelMessages.NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }
    return { success: true, message: ModelMessages.FETCH_SUCCESS, data: row };
  }

  static async update(
    db: DrizzleD1Database,
    tenantId: string,
    id: string,
    body: ModelUpdateBody,
  ) {
    const row = await ModelRepository.fetchById(db, id);
    if (!row || row.tenant_id !== tenantId) {
      throw new CustomError(ModelMessages.NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }
    const update: Partial<typeof row> = {};
    if (body.provider != null) update.provider = body.provider.trim().toLowerCase();
    if (body.model_id != null) update.model_id = body.model_id.trim();
    if (body.name != null) update.name = body.name.trim();
    if (body.description !== undefined) update.description = body.description;
    if (body.status != null) update.status = body.status;

    const nextProvider = update.provider ?? row.provider;
    const nextModelId = update.model_id ?? row.model_id;
    if (nextProvider !== row.provider || nextModelId !== row.model_id) {
      const clash = await ModelRepository.fetchByKey(
        db,
        tenantId,
        nextProvider,
        nextModelId,
      );
      if (clash && clash.id !== id) {
        throw new DuplicateError(
          ModelMessages.DUPLICATE,
          HTTP_STATUS_CODES.FORBIDDEN,
        );
      }
    }

    const updated = await ModelRepository.update(db, id, update);
    return {
      success: true,
      message: ModelMessages.UPDATE_SUCCESS,
      data: updated,
    };
  }

  static async remove(db: DrizzleD1Database, tenantId: string, id: string) {
    const row = await ModelRepository.fetchById(db, id);
    if (!row || row.tenant_id !== tenantId) {
      throw new CustomError(ModelMessages.NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }
    await ModelRepository.remove(db, id);
    return { success: true, message: ModelMessages.DELETE_SUCCESS };
  }
}

export default ModelService;
