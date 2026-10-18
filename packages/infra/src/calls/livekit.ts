import type { ServerEnvironment } from "@wodge/env/server";
import { AccessToken } from "livekit-server-sdk";
import { inject, injectable } from "tsyringe";
import type { CallTokens } from "./types";
import { IntegrationUnavailableError } from "../integration-unavailable";

@injectable()
export class LiveKitCallTokens implements CallTokens {
  constructor(
    @inject("environment") private readonly environment: ServerEnvironment,
  ) {}

  async issue(input: Parameters<CallTokens["issue"]>[0]) {
    if (
      !this.environment.LIVEKIT_API_KEY ||
      !this.environment.LIVEKIT_API_SECRET
    )
      throw new IntegrationUnavailableError("Calls");
    const token = new AccessToken(
      this.environment.LIVEKIT_API_KEY,
      this.environment.LIVEKIT_API_SECRET,
      {
        identity: input.identity,
        name: input.name,
        ttl: input.ttl,
      },
    );

    token.addGrant({
      roomJoin: true,
      room: input.room,
      canPublish: input.canPublish,
      canSubscribe: input.canSubscribe,
    });

    return token.toJwt();
  }
}
