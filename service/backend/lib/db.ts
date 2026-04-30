import { drizzle } from "drizzle-orm/d1";

export const getDb = (env: Env) => {
  return drizzle(env.DB);
};
