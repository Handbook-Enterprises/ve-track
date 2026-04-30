export type Env = {
  DB: D1Database;
  ADMIN_API_KEY?: string;
  CLERK_SECRET_KEY?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
};

export type ApiKeyVariables = {
  tenantId: string;
  apiKeyId: string;
};

export type AuthVariables = {
  userId: string;
  organizationId: string;
};
