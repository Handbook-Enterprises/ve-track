import type { ContentfulStatusCode } from "hono/utils/http-status";

export const HTTP_STATUS_CODES = {
  SUCCESS: 200 as ContentfulStatusCode,
  NO_CONTENT: 204 as ContentfulStatusCode,
  BAD_REQUEST: 400 as ContentfulStatusCode,
  UNAUTHORIZED: 401 as ContentfulStatusCode,
  PAYMENT_REQUIRED: 402 as ContentfulStatusCode,
  FORBIDDEN: 403 as ContentfulStatusCode,
  NOT_FOUND: 404 as ContentfulStatusCode,
  INTERNAL_SERVER_ERROR: 500 as ContentfulStatusCode,
};
