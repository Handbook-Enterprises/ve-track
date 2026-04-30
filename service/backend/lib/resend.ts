import { Resend } from "resend";
import {
  ResendConfig,
  SendEmailOptions,
  SendEmailResult,
} from "../interfaces/lib/resend.interface";

class ResendService {
  static async send(
    config: ResendConfig,
    options: SendEmailOptions,
  ): Promise<SendEmailResult> {
    try {
      const resend = new Resend(config.apiKey);

      const { data, error } = await resend.emails.send({
        from: options.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        id: data?.id,
      };
    } catch (error) {
      console.error("[ResendService] Send failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send email",
      };
    }
  }
}

export default ResendService;
