import { createMiddleware } from "hono/factory";
import { verifyToken } from "@clerk/backend";
import { drizzle } from "drizzle-orm/d1";
import { TenantRepository } from "../repositories/tenant.repository";
import { CustomError } from "../utils";
import { HTTP_STATUS_CODES } from "../constants";
import type { Env } from "../types";

export type ClerkVariables = {
  clerkUserId: string;
  clerkOrgId: string | null;
  tenantId: string;
};

export const clerkAuthMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: ClerkVariables;
}>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const orgHeader =
    c.req.header("X-Organization-Id") ?? c.req.header("x-organization-id");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new CustomError(
      "Authorization header missing or invalid",
      HTTP_STATUS_CODES.UNAUTHORIZED,
    );
  }

  if (!c.env.CLERK_SECRET_KEY) {
    throw new CustomError(
      "Clerk is not configured on this server",
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
    );
  }

  const token = authHeader.slice(7).trim();

  let payload: Awaited<ReturnType<typeof verifyToken>>;
  try {
    payload = await verifyToken(token, {
      secretKey: c.env.CLERK_SECRET_KEY,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[clerkAuthMiddleware] verifyToken failed:", detail);
    throw new CustomError(
      `Authentication failed · ${detail}`,
      HTTP_STATUS_CODES.UNAUTHORIZED,
    );
  }

  const userId = payload.sub as string;
  const tokenOrgId = (payload.org_id as string | undefined) ?? null;
  const headerOrgId =
    orgHeader && orgHeader.length > 0 ? orgHeader : null;
  const orgId = tokenOrgId ?? headerOrgId;

  if (!userId) {
    throw new CustomError(
      "Invalid authentication token",
      HTTP_STATUS_CODES.UNAUTHORIZED,
    );
  }

  const db = drizzle(c.env.DB);

  let tenant = orgId
    ? await TenantRepository.fetchByClerkOrgId(db, orgId)
    : null;

  if (!tenant) {
    tenant = await TenantRepository.fetchByClerkUserId(db, userId);
  }

  if (!tenant) {
    tenant = await TenantRepository.create(db, {
      name: orgId ? `org · ${orgId.slice(-6)}` : `personal · ${userId.slice(-6)}`,
      clerk_org_id: orgId,
      clerk_user_id: orgId ? null : userId,
      plan: "free",
    });
  }

  c.set("clerkUserId", userId);
  c.set("clerkOrgId", orgId);
  c.set("tenantId", tenant.id);

  await next();
});
