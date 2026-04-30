import { Hono } from "hono";
import type { Env } from "./types";
import routes from "./routes";
import { CustomError, DuplicateError } from "./utils";
import { generalMessages } from "./messages";
import { HTTP_STATUS_CODES } from "./constants";
import type { ContentfulStatusCode } from "hono/utils/http-status";

const app = new Hono<{ Bindings: Env }>();

app.onError((err, c) => {
  if (err instanceof CustomError || err instanceof DuplicateError) {
    const { errors, message, statusCode } = err;
    const payload =
      errors && Object.keys(errors).length > 0
        ? { message, errors }
        : { message };
    return c.json(payload, statusCode as ContentfulStatusCode);
  }

  console.error("Unexpected error:", err);
  return c.json(
    { message: generalMessages.UNEXPECTED_FAILURE },
    HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
  );
});

routes(app);

app.get("/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() }),
);

app.notFound((c) => {
  return c.json({ success: false, message: "Route not found" }, 404);
});

export default app;
