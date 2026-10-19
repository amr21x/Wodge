import type { ServerEnvironment } from "@wodge/env/server";
import { inject, injectable } from "tsyringe";
import { HttpClient } from "../http/client";
import { IntegrationUnavailableError } from "../integration-unavailable";

@injectable()
export class ResendEmail {
  constructor(
    @inject("environment") private readonly environment: ServerEnvironment,
    @inject(HttpClient) private readonly http: HttpClient,
  ) {}

  async send(message: { to: string; subject: string; text: string }) {
    if (!this.environment.RESEND_API_KEY || !this.environment.RESEND_EMAIL_FROM)
      throw new IntegrationUnavailableError("Sign-in email");
    const response = await this.http.request("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.environment.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: this.environment.RESEND_EMAIL_FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
    });
    if (!response.ok) throw new Error("Unable to send email");
    await response.body?.cancel();
  }
}
