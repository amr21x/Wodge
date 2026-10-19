import { signToken, verifyToken } from "@wodge/auth/tokens";
import { SessionRepository } from "@wodge/core/user/repositories/sessions";
import type { ServerEnvironment } from "@wodge/env/server";
import { inject, injectable } from "tsyringe";

@injectable()
export class SessionTickets {
  constructor(
    @inject(SessionRepository)
    private readonly sessions: {
      get(
        sessionId: string,
        userId: string,
      ): Promise<{ expiresAt: Date } | undefined>;
    },
    @inject("environment") private readonly environment: ServerEnvironment,
  ) {}

  issue(userId: string, sessionId: string, purpose: "connection" | "upload") {
    return signToken(
      this.environment.SECRET_KEY,
      { userId, sessionId, purpose },
      purpose === "upload" ? "1h" : "5m",
    );
  }

  async verify(token: string) {
    const payload = await verifyToken(this.environment.SECRET_KEY, token);

    if (
      (payload.purpose !== "connection" && payload.purpose !== "upload") ||
      typeof payload.userId !== "string" ||
      typeof payload.sessionId !== "string"
    ) {
      return null;
    }

    // Check the backing session on verification so logout invalidates issued tickets.
    const session = await this.sessions.get(payload.sessionId, payload.userId);
    if (!session || session.expiresAt.getTime() <= Date.now()) {
      return null;
    }

    return {
      userId: payload.userId,
      sessionId: payload.sessionId,
      purpose: payload.purpose,
    };
  }
}
