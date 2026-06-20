import { DrizzleD1Database } from "drizzle-orm/d1";
import { ActionRepository } from "../repositories/action.repository";
import { ActionMessages } from "../messages/action.messages";
import { CustomError, DuplicateError, slugify } from "../utils";
import { HTTP_STATUS_CODES } from "../constants";
import type {
  ActionCreateBody,
  ActionUpdateBody,
} from "../interfaces/action.interface";

const normalizeAppSlug = (value?: string | null): string | null => {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed ? slugify(trimmed) : null;
};

class ActionService {
  static async create(
    db: DrizzleD1Database,
    tenantId: string,
    body: ActionCreateBody,
  ) {
    const name = (body.name ?? "").trim();
    if (!name) {
      throw new CustomError(
        ActionMessages.VALIDATION_ERROR,
        HTTP_STATUS_CODES.BAD_REQUEST,
      );
    }
    const slug = (body.slug ?? "").trim() ? slugify(body.slug!) : slugify(name);
    const appSlug = normalizeAppSlug(body.app_slug);

    const existing = await ActionRepository.fetchBySlug(
      db,
      tenantId,
      appSlug,
      slug,
    );
    if (existing) {
      throw new DuplicateError(
        ActionMessages.DUPLICATE,
        HTTP_STATUS_CODES.FORBIDDEN,
      );
    }

    const created = await ActionRepository.create(db, {
      tenant_id: tenantId,
      slug,
      name,
      app_slug: appSlug,
      description: body.description ?? null,
      credits_per_call: body.credits_per_call ?? null,
      status: body.status ?? "active",
    });
    return {
      success: true,
      message: ActionMessages.CREATE_SUCCESS,
      data: created,
    };
  }

  static async listForTenant(db: DrizzleD1Database, tenantId: string) {
    const data = await ActionRepository.fetchByTenant(db, tenantId);
    return { success: true, message: ActionMessages.LIST_SUCCESS, data };
  }

  static async getById(db: DrizzleD1Database, tenantId: string, id: string) {
    const row = await ActionRepository.fetchById(db, id);
    if (!row || row.tenant_id !== tenantId) {
      throw new CustomError(
        ActionMessages.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND,
      );
    }
    return { success: true, message: ActionMessages.FETCH_SUCCESS, data: row };
  }

  static async update(
    db: DrizzleD1Database,
    tenantId: string,
    id: string,
    body: ActionUpdateBody,
  ) {
    const row = await ActionRepository.fetchById(db, id);
    if (!row || row.tenant_id !== tenantId) {
      throw new CustomError(
        ActionMessages.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND,
      );
    }
    const update: Partial<typeof row> = {};
    if (body.name != null) update.name = body.name.trim();
    if (body.slug != null) update.slug = slugify(body.slug);
    if (body.app_slug !== undefined) update.app_slug = normalizeAppSlug(body.app_slug);
    if (body.description !== undefined) update.description = body.description;
    if (body.credits_per_call !== undefined)
      update.credits_per_call = body.credits_per_call;
    if (body.status != null) update.status = body.status;

    const nextSlug = update.slug ?? row.slug;
    const nextApp = update.app_slug !== undefined ? update.app_slug : row.app_slug;
    if (nextSlug !== row.slug || nextApp !== row.app_slug) {
      const clash = await ActionRepository.fetchBySlug(
        db,
        tenantId,
        nextApp,
        nextSlug,
      );
      if (clash && clash.id !== id) {
        throw new DuplicateError(
          ActionMessages.DUPLICATE,
          HTTP_STATUS_CODES.FORBIDDEN,
        );
      }
    }

    const updated = await ActionRepository.update(db, id, update);
    return {
      success: true,
      message: ActionMessages.UPDATE_SUCCESS,
      data: updated,
    };
  }

  static async remove(db: DrizzleD1Database, tenantId: string, id: string) {
    const row = await ActionRepository.fetchById(db, id);
    if (!row || row.tenant_id !== tenantId) {
      throw new CustomError(
        ActionMessages.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND,
      );
    }
    await ActionRepository.remove(db, id);
    return { success: true, message: ActionMessages.DELETE_SUCCESS };
  }
}

export default ActionService;
