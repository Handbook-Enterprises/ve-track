import { DrizzleD1Database } from "drizzle-orm/d1";
import { TenantRepository } from "../repositories/tenant.repository";
import { TenantMessages } from "../messages/tenant.messages";
import { DuplicateError, CustomError } from "../utils";
import { HTTP_STATUS_CODES } from "../constants";
import type { TenantBody } from "../interfaces/tenant.interface";

class TenantService {
  static async create(db: DrizzleD1Database, body: TenantBody) {
    const existing = await TenantRepository.fetchByName(db, body.name);
    if (existing) throw new DuplicateError(TenantMessages.EXIST);

    const tenant = await TenantRepository.create(db, {
      name: body.name,
      clerk_org_id: body.clerk_org_id ?? null,
      plan: body.plan ?? "free",
    });

    if (!tenant) {
      return { success: false, message: TenantMessages.CREATE_ERROR };
    }

    return {
      success: true,
      message: TenantMessages.CREATE_SUCCESS,
      tenant,
    };
  }

  static async list(db: DrizzleD1Database) {
    const tenants = await TenantRepository.fetchAll(db);
    return {
      success: true,
      message: TenantMessages.LIST_SUCCESS,
      tenants,
    };
  }

  static async getById(db: DrizzleD1Database, id: string) {
    const tenant = await TenantRepository.fetchById(db, id);
    if (!tenant) {
      throw new CustomError(TenantMessages.NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }
    return {
      success: true,
      message: TenantMessages.FETCH_SUCCESS,
      tenant,
    };
  }

  static async update(
    db: DrizzleD1Database,
    id: string,
    body: Partial<TenantBody>,
  ) {
    const tenant = await TenantRepository.update(db, id, {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.clerk_org_id !== undefined
        ? { clerk_org_id: body.clerk_org_id }
        : {}),
      ...(body.plan !== undefined ? { plan: body.plan } : {}),
    });
    if (!tenant) {
      throw new CustomError(TenantMessages.NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }
    return {
      success: true,
      message: TenantMessages.UPDATE_SUCCESS,
      tenant,
    };
  }

  static async delete(db: DrizzleD1Database, id: string) {
    const tenant = await TenantRepository.delete(db, id);
    if (!tenant) {
      throw new CustomError(TenantMessages.NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }
    return {
      success: true,
      message: TenantMessages.DELETE_SUCCESS,
      tenant,
    };
  }
}

export default TenantService;
