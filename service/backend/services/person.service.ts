import { DrizzleD1Database } from "drizzle-orm/d1";
import { PersonRepository } from "../repositories/person.repository";
import { PersonMessages } from "../messages/person.messages";
import { CustomError, DuplicateError } from "../utils";
import { HTTP_STATUS_CODES } from "../constants";
import type {
  PersonCreateBody,
  PersonUpdateBody,
} from "../interfaces/person.interface";

const clean = (value?: string | null): string | null => {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

class PersonService {
  static async create(
    db: DrizzleD1Database,
    tenantId: string,
    body: PersonCreateBody,
  ) {
    const name = clean(body.name);
    const externalId = clean(body.external_id);
    if (!name && !externalId) {
      throw new CustomError(
        PersonMessages.VALIDATION_ERROR,
        HTTP_STATUS_CODES.BAD_REQUEST,
      );
    }

    if (externalId) {
      const existing = await PersonRepository.fetchByExternalId(
        db,
        tenantId,
        externalId,
      );
      if (existing) {
        throw new DuplicateError(
          PersonMessages.DUPLICATE,
          HTTP_STATUS_CODES.FORBIDDEN,
        );
      }
    }

    const created = await PersonRepository.create(db, {
      tenant_id: tenantId,
      external_id: externalId,
      name,
      email: clean(body.email),
      avatar_url: clean(body.avatar_url),
      organization_external_id: clean(body.organization_external_id),
      status: body.status ?? "active",
    });
    return {
      success: true,
      message: PersonMessages.CREATE_SUCCESS,
      data: created,
    };
  }

  static async listForTenant(db: DrizzleD1Database, tenantId: string) {
    const data = await PersonRepository.fetchByTenant(db, tenantId);
    return { success: true, message: PersonMessages.LIST_SUCCESS, data };
  }

  static async getById(db: DrizzleD1Database, tenantId: string, id: string) {
    const row = await PersonRepository.fetchById(db, id);
    if (!row || row.tenant_id !== tenantId) {
      throw new CustomError(
        PersonMessages.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND,
      );
    }
    return { success: true, message: PersonMessages.FETCH_SUCCESS, data: row };
  }

  static async update(
    db: DrizzleD1Database,
    tenantId: string,
    id: string,
    body: PersonUpdateBody,
  ) {
    const row = await PersonRepository.fetchById(db, id);
    if (!row || row.tenant_id !== tenantId) {
      throw new CustomError(
        PersonMessages.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND,
      );
    }
    const update: Partial<typeof row> = {};
    if (body.external_id !== undefined) update.external_id = clean(body.external_id);
    if (body.name !== undefined) update.name = clean(body.name);
    if (body.email !== undefined) update.email = clean(body.email);
    if (body.avatar_url !== undefined) update.avatar_url = clean(body.avatar_url);
    if (body.organization_external_id !== undefined)
      update.organization_external_id = clean(body.organization_external_id);
    if (body.status != null) update.status = body.status;

    if (update.external_id && update.external_id !== row.external_id) {
      const clash = await PersonRepository.fetchByExternalId(
        db,
        tenantId,
        update.external_id,
      );
      if (clash && clash.id !== id) {
        throw new DuplicateError(
          PersonMessages.DUPLICATE,
          HTTP_STATUS_CODES.FORBIDDEN,
        );
      }
    }

    const updated = await PersonRepository.update(db, id, update);
    return {
      success: true,
      message: PersonMessages.UPDATE_SUCCESS,
      data: updated,
    };
  }

  static async remove(db: DrizzleD1Database, tenantId: string, id: string) {
    const row = await PersonRepository.fetchById(db, id);
    if (!row || row.tenant_id !== tenantId) {
      throw new CustomError(
        PersonMessages.NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND,
      );
    }
    await PersonRepository.remove(db, id);
    return { success: true, message: PersonMessages.DELETE_SUCCESS };
  }
}

export default PersonService;
