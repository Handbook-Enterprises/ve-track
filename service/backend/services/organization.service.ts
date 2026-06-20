import { DrizzleD1Database } from "drizzle-orm/d1";
import { OrganizationRepository } from "../repositories/organization.repository";
import { OrganizationMessages } from "../messages/organization.messages";
import { CustomError, DuplicateError } from "../utils";
import { HTTP_STATUS_CODES } from "../constants";
import type {
  OrganizationCreateBody,
  OrganizationUpdateBody,
} from "../interfaces/organization.interface";

const clean = (value?: string | null): string | null => {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

class OrganizationService {
  static async create(
    db: DrizzleD1Database,
    tenantId: string,
    body: OrganizationCreateBody,
  ) {
    const name = clean(body.name);
    const externalId = clean(body.external_id);
    if (!name && !externalId) {
      throw new CustomError(
        OrganizationMessages.VALIDATION_ERROR,
        HTTP_STATUS_CODES.BAD_REQUEST,
      );
    }

    if (externalId) {
      const existing = await OrganizationRepository.fetchByExternalId(
        db,
        tenantId,
        externalId,
      );
      if (existing) {
        throw new DuplicateError(
          OrganizationMessages.DUPLICATE,
          HTTP_STATUS_CODES.FORBIDDEN,
        );
      }
    }

    const created = await OrganizationRepository.create(db, {
      tenant_id: tenantId,
      external_id: externalId,
      name,
      domain: clean(body.domain),
      status: body.status ?? "active",
    });
    return {
      success: true,
      message: OrganizationMessages.CREATE_SUCCESS,
      data: created,
    };
  }

  static async listForTenant(db: DrizzleD1Database, tenantId: string) {
    const data = await OrganizationRepository.fetchByTenant(db, tenantId);
    return { success: true, message: OrganizationMessages.LIST_SUCCESS, data };
  }

  static async getById(db: DrizzleD1Database, tenantId: string, id: string) {
    const row = await OrganizationRepository.fetchById(db, id);
    if (!row || row.tenant_id !== tenantId) {
      throw new CustomError(
        OrganizationMessages.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND,
      );
    }
    return {
      success: true,
      message: OrganizationMessages.FETCH_SUCCESS,
      data: row,
    };
  }

  static async update(
    db: DrizzleD1Database,
    tenantId: string,
    id: string,
    body: OrganizationUpdateBody,
  ) {
    const row = await OrganizationRepository.fetchById(db, id);
    if (!row || row.tenant_id !== tenantId) {
      throw new CustomError(
        OrganizationMessages.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND,
      );
    }
    const update: Partial<typeof row> = {};
    if (body.external_id !== undefined) update.external_id = clean(body.external_id);
    if (body.name !== undefined) update.name = clean(body.name);
    if (body.domain !== undefined) update.domain = clean(body.domain);
    if (body.status != null) update.status = body.status;

    if (update.external_id && update.external_id !== row.external_id) {
      const clash = await OrganizationRepository.fetchByExternalId(
        db,
        tenantId,
        update.external_id,
      );
      if (clash && clash.id !== id) {
        throw new DuplicateError(
          OrganizationMessages.DUPLICATE,
          HTTP_STATUS_CODES.FORBIDDEN,
        );
      }
    }

    const updated = await OrganizationRepository.update(db, id, update);
    return {
      success: true,
      message: OrganizationMessages.UPDATE_SUCCESS,
      data: updated,
    };
  }

  static async remove(db: DrizzleD1Database, tenantId: string, id: string) {
    const row = await OrganizationRepository.fetchById(db, id);
    if (!row || row.tenant_id !== tenantId) {
      throw new CustomError(
        OrganizationMessages.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND,
      );
    }
    await OrganizationRepository.remove(db, id);
    return { success: true, message: OrganizationMessages.DELETE_SUCCESS };
  }
}

export default OrganizationService;
