import { createClerkClient } from "@clerk/backend";
import { DrizzleD1Database } from "drizzle-orm/d1";
import { IdentityKeyRepository } from "../repositories/identity-key.repository";
import { openApiKey } from "./connector-crypto";
import type { Env } from "../types";

export interface IdentityName {
  name: string;
  secondary: string | null;
  imageUrl?: string | null;
}

const cache = new Map<string, IdentityName>();
const missCache = new Map<string, number>();
const tenantKeysCache = new Map<string, { keys: string[]; expiry: number }>();
const MISS_TTL_MS = 10 * 60 * 1000;
const TENANT_KEYS_TTL_MS = 60 * 1000;

const scoped = (tenantId: string, id: string) => `${tenantId}:${id}`;

const setCache = (tenantId: string, id: string, value: IdentityName) => {
  if (!id) return;
  cache.set(scoped(tenantId, id), value);
  missCache.delete(scoped(tenantId, id));
};

const isMissed = (tenantId: string, id: string) => {
  const key = scoped(tenantId, id);
  const expiry = missCache.get(key);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    missCache.delete(key);
    return false;
  }
  return true;
};

const setMissed = (tenantId: string, ids: string[]) => {
  const expiry = Date.now() + MISS_TTL_MS;
  for (const id of ids) missCache.set(scoped(tenantId, id), expiry);
};

export const clearIdentityMisses = (tenantId: string) => {
  const prefix = `${tenantId}:`;
  for (const key of missCache.keys()) {
    if (key.startsWith(prefix)) missCache.delete(key);
  }
  tenantKeysCache.delete(tenantId);
};

const envSecretKeys = (env: Env): string[] =>
  [env.CLERK_SECRET_KEY, ...(env.CLERK_SECRET_KEYS ?? "").split(/[,\s]+/)]
    .map((k) => k?.trim())
    .filter((k): k is string => !!k);

const tenantSecretKeys = async (
  db: DrizzleD1Database,
  env: Env,
  tenantId: string,
): Promise<string[]> => {
  const cached = tenantKeysCache.get(tenantId);
  if (cached && Date.now() < cached.expiry) return cached.keys;
  const keys: string[] = [];
  if (env.CONNECTOR_ENC_KEY) {
    try {
      const rows = await IdentityKeyRepository.fetchFullActiveByTenant(
        db,
        tenantId,
      );
      for (const row of rows) {
        try {
          keys.push(await openApiKey(env.CONNECTOR_ENC_KEY, tenantId, row));
        } catch (err) {
          console.warn(
            "[ve-track][identities] app key decrypt failed",
            row.id,
            err,
          );
        }
      }
    } catch (err) {
      console.warn("[ve-track][identities] app key fetch failed", err);
    }
  }
  tenantKeysCache.set(tenantId, {
    keys,
    expiry: Date.now() + TENANT_KEYS_TTL_MS,
  });
  return keys;
};

export async function resolveIdentities(
  env: Env,
  db: DrizzleD1Database,
  tenantId: string,
  userIds: string[],
  orgIds: string[],
): Promise<{
  users: Map<string, IdentityName>;
  orgs: Map<string, IdentityName>;
}> {
  const users = new Map<string, IdentityName>();
  const orgs = new Map<string, IdentityName>();

  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  const uniqueOrgIds = Array.from(new Set(orgIds.filter(Boolean)));

  let userIdsToFetch = uniqueUserIds.filter(
    (id) => !cache.has(scoped(tenantId, id)) && !isMissed(tenantId, id),
  );
  let orgIdsToFetch = uniqueOrgIds.filter(
    (id) => !cache.has(scoped(tenantId, id)) && !isMissed(tenantId, id),
  );

  if (userIdsToFetch.length > 0 || orgIdsToFetch.length > 0) {
    const secretKeys = Array.from(
      new Set([
        ...envSecretKeys(env),
        ...(await tenantSecretKeys(db, env, tenantId)),
      ]),
    );

    for (const secretKey of secretKeys) {
      if (userIdsToFetch.length === 0 && orgIdsToFetch.length === 0) break;
      const clerk = createClerkClient({ secretKey });

      if (userIdsToFetch.length > 0) {
        try {
          const list = await clerk.users.getUserList({
            userId: userIdsToFetch,
            limit: 100,
          });
          for (const u of list.data) {
            const email = u.emailAddresses?.[0]?.emailAddress ?? null;
            const fullName = [u.firstName, u.lastName]
              .filter(Boolean)
              .join(" ")
              .trim();
            const name = fullName || u.username || email || u.id;
            setCache(tenantId, u.id, {
              name,
              secondary: email,
              imageUrl: u.imageUrl ?? null,
            });
          }
          userIdsToFetch = userIdsToFetch.filter(
            (id) => !cache.has(scoped(tenantId, id)),
          );
        } catch (err) {
          console.warn("[ve-track][identities] user lookup failed", err);
        }
      }

      if (orgIdsToFetch.length > 0) {
        await Promise.all(
          orgIdsToFetch.map(async (id) => {
            try {
              const org = await clerk.organizations.getOrganization({
                organizationId: id,
              });
              setCache(tenantId, id, {
                name: org.name,
                secondary: org.slug ?? null,
                imageUrl: org.imageUrl ?? null,
              });
            } catch (err) {
              console.warn(
                "[ve-track][identities] org lookup failed",
                id,
                err,
              );
            }
          }),
        );
        orgIdsToFetch = orgIdsToFetch.filter(
          (id) => !cache.has(scoped(tenantId, id)),
        );
      }
    }

    setMissed(tenantId, userIdsToFetch);
    setMissed(tenantId, orgIdsToFetch);
  }

  for (const id of uniqueUserIds) {
    const hit = cache.get(scoped(tenantId, id));
    if (hit) users.set(id, hit);
  }
  for (const id of uniqueOrgIds) {
    const hit = cache.get(scoped(tenantId, id));
    if (hit) orgs.set(id, hit);
  }
  return { users, orgs };
}
