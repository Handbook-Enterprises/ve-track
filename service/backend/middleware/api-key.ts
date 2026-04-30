import { createMiddleware } from "hono/factory";
import { drizzle } from "drizzle-orm/d1";
import ApiKeyService from "../services/api-key.service";
import { ApiKeyMessages } from "../messages/api-key.messages";
import { CustomError } from "../utils";
import { HTTP_STATUS_CODES } from "../constants";
import type { Env, ApiKeyVariables } from "../types";

export const apiKeyMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: ApiKeyVariables;
}>(async (c, next) => {
  const raw =
    c.req.header("x-ve-key") ??
    c.req.header("X-VE-Key") ??
    c.req.header("X-Ve-Key");

  if (!raw) {
    throw new CustomError(
      ApiKeyMessages.MISSING,
      HTTP_STATUS_CODES.UNAUTHORIZED,
    );
  }

  const db = drizzle(c.env.DB);
  const resolved = await ApiKeyService.resolve(db, raw.trim());
  if (!resolved) {
    throw new CustomError(
      ApiKeyMessages.INVALID,
      HTTP_STATUS_CODES.UNAUTHORIZED,
    );
  }

  c.set("tenantId", resolved.tenantId);
  c.set("apiKeyId", resolved.apiKeyId);
  await next();
});

export const adminApiKeyMiddleware = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    const expected = c.env.ADMIN_API_KEY;
    if (!expected) {
      throw new CustomError(
        ApiKeyMessages.UNAUTHORIZED_ADMIN,
        HTTP_STATUS_CODES.UNAUTHORIZED,
      );
    }
    const header = c.req.header("Authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token || token !== expected) {
      throw new CustomError(
        ApiKeyMessages.UNAUTHORIZED_ADMIN,
        HTTP_STATUS_CODES.UNAUTHORIZED,
      );
    }
    await next();
  },
);
