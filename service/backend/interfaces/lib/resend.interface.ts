export interface ResendConfig {
  apiKey: string;
}

export interface SendEmailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}
