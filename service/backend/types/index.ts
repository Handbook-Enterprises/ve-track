export type Env = {
  DB: D1Database;
  USAGE_LOGS: AnalyticsEngineDataset;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  CLERK_SECRET_KEY?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CF_ACCOUNT_ID?: string;
  CF_API_TOKEN?: string;
  VE_TRACK_INTERNAL_KEY?: string;
  CLERK_CANARY_ORG_ID?: string;
  VE_APP?: string;
  APP_URL?: string;
};

export type AuthVariables = {
  userId: string;
  organizationId: string;
};
