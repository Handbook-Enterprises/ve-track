import { createClerkClient } from "@clerk/backend";
import type { Env } from "../types";

export interface IdentityName {
  name: string;
  secondary: string | null;
  imageUrl?: string | null;
}

const cache = new Map<string, IdentityName>();

const setCache = (id: string, value: IdentityName) => {
  if (!id) return;
  cache.set(id, value);
};

export async function resolveIdentities(
  env: Env,
  userIds: string[],
  orgIds: string[],
): Promise<{
  users: Map<string, IdentityName>;
  orgs: Map<string, IdentityName>;
}> {
  const users = new Map<string, IdentityName>();
  const orgs = new Map<string, IdentityName>();

  if (!env.CLERK_SECRET_KEY) return { users, orgs };

  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  const uniqueOrgIds = Array.from(new Set(orgIds.filter(Boolean)));

  const userIdsToFetch = uniqueUserIds.filter((id) => !cache.has(id));
  const orgIdsToFetch = uniqueOrgIds.filter((id) => !cache.has(id));

  let clerk: ReturnType<typeof createClerkClient> | null = null;
  if (userIdsToFetch.length > 0 || orgIdsToFetch.length > 0) {
    clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
  }

  if (clerk && userIdsToFetch.length > 0) {
    try {
      const list = await clerk.users.getUserList({ userId: userIdsToFetch, limit: 100 });
      for (const u of list.data) {
        const email = u.emailAddresses?.[0]?.emailAddress ?? null;
        const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
        const name = fullName || u.username || email || u.id;
        setCache(u.id, { name, secondary: email, imageUrl: u.imageUrl ?? null });
      }
    } catch (err) {
      console.warn("[ve-track][identities] user lookup failed", err);
    }
  }

  if (clerk && orgIdsToFetch.length > 0) {
    await Promise.all(
      orgIdsToFetch.map(async (id) => {
        try {
          const org = await clerk!.organizations.getOrganization({ organizationId: id });
          setCache(id, {
            name: org.name,
            secondary: org.slug ?? null,
            imageUrl: org.imageUrl ?? null,
          });
        } catch (err) {
          console.warn("[ve-track][identities] org lookup failed", id, err);
        }
      }),
    );
  }

  for (const id of uniqueUserIds) {
    const hit = cache.get(id);
    if (hit) users.set(id, hit);
  }
  for (const id of uniqueOrgIds) {
    const hit = cache.get(id);
    if (hit) orgs.set(id, hit);
  }
  return { users, orgs };
}
