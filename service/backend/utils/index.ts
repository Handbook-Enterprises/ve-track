import { sql } from "drizzle-orm";
import { text } from "drizzle-orm/sqlite-core";

export const timestamps = {
  updated_at: text("timestamp")
    .notNull()
    .default(sql`(current_timestamp)`),
  created_at: text("timestamp")
    .default(sql`(current_timestamp)`)
    .notNull(),
};

export const manageAsyncOps = async (fn: Promise<any>) => {
  try {
    const response = await fn;
    return [null, response];
  } catch (error) {
    const err = error;
    console.log("error", err);
    return [err, null];
  }
};

export class CustomError extends Error {
  statusCode;
  errors;

  constructor(message: string, statusCode = 400, errors: any = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export class DuplicateError extends Error {
  statusCode;
  errors;

  constructor(message: string, statusCode = 409, errors: any = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}
