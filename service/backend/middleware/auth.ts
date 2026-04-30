import { createMiddleware } from "hono/factory";
import { verifyToken } from "@clerk/backend";
import type { Env, AuthVariables } from "../types";
import { CustomError } from "../utils";
import { HTTP_STATUS_CODES } from "../constants";

export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: AuthVariables;
}>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const organizationId = c.req.header("X-Organization-Id");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new CustomError(
      "Authorization header missing or invalid",
      HTTP_STATUS_CODES.UNAUTHORIZED,
    );
  }

  if (!organizationId) {
    throw new CustomError(
      "Organization ID is required. Please select an organization.",
      HTTP_STATUS_CODES.BAD_REQUEST,
    );
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const payload = await verifyToken(token, {
      secretKey: c.env.CLERK_SECRET_KEY,
    });

    const userId = payload.sub;

    if (!userId) {
      throw new CustomError(
        "Invalid authentication token",
        HTTP_STATUS_CODES.UNAUTHORIZED,
      );
    }

    c.set("userId", userId);
    c.set("organizationId", organizationId);

    await next();
  } catch (error) {
    if (error instanceof CustomError) {
      throw error;
    }
    throw new CustomError(
      "Authentication failed",
      HTTP_STATUS_CODES.UNAUTHORIZED,
    );
  }
});
