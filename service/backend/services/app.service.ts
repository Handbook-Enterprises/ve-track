import { DrizzleD1Database } from "drizzle-orm/d1";
import { AppRepository } from "../repositories/app.repository";
import { AppMessages } from "../messages/app.messages";
import { CustomError, DuplicateError, slugify } from "../utils";
import { HTTP_STATUS_CODES } from "../constants";
import type { AppCreateBody, AppUpdateBody } from "../interfaces/app.interface";

class AppService {
  static async create(
    db: DrizzleD1Database,
    tenantId: string,
    body: AppCreateBody,
  ) {
    const name = (body.name ?? "").trim();
    if (!name) {
      throw new CustomError(
        AppMessages.VALIDATION_ERROR,
        HTTP_STATUS_CODES.BAD_REQUEST,
      );
    }
    const slug = (body.slug ?? "").trim() ? slugify(body.slug!) : slugify(name);

    const existing = await AppRepository.fetchBySlug(db, tenantId, slug);
    if (existing) {
      throw new DuplicateError(AppMessages.DUPLICATE, HTTP_STATUS_CODES.FORBIDDEN);
    }

    const created = await AppRepository.create(db, {
      tenant_id: tenantId,
      slug,
      name,
      description: body.description ?? null,
      status: body.status ?? "active",
    });
    return { success: true, message: AppMessages.CREATE_SUCCESS, data: created };
  }

  static async listForTenant(db: DrizzleD1Database, tenantId: string) {
    const data = await AppRepository.fetchByTenant(db, tenantId);
    return { success: true, message: AppMessages.LIST_SUCCESS, data };
  }

  static async getById(db: DrizzleD1Database, tenantId: string, id: string) {
    const row = await AppRepository.fetchById(db, id);
    if (!row || row.tenant_id !== tenantId) {
      throw new CustomError(AppMessages.NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }
    return { success: true, message: AppMessages.FETCH_SUCCESS, data: row };
  }

  static async update(
    db: DrizzleD1Database,
    tenantId: string,
    id: string,
    body: AppUpdateBody,
  ) {
    const row = await AppRepository.fetchById(db, id);
    if (!row || row.tenant_id !== tenantId) {
      throw new CustomError(AppMessages.NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }
    const update: Partial<typeof row> = {};
    if (body.name != null) update.name = body.name.trim();
    if (body.slug != null) update.slug = slugify(body.slug);
    if (body.description !== undefined) update.description = body.description;
    if (body.status != null) update.status = body.status;

    if (update.slug && update.slug !== row.slug) {
      const clash = await AppRepository.fetchBySlug(db, tenantId, update.slug);
      if (clash) {
        throw new DuplicateError(
          AppMessages.DUPLICATE,
          HTTP_STATUS_CODES.FORBIDDEN,
        );
      }
    }

    const updated = await AppRepository.update(db, id, update);
    return { success: true, message: AppMessages.UPDATE_SUCCESS, data: updated };
  }

  static async remove(db: DrizzleD1Database, tenantId: string, id: string) {
    const row = await AppRepository.fetchById(db, id);
    if (!row || row.tenant_id !== tenantId) {
      throw new CustomError(AppMessages.NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }
    await AppRepository.remove(db, id);
    return { success: true, message: AppMessages.DELETE_SUCCESS };
  }
}

export default AppService;
