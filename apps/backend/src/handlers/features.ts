import { FeatureFlagService } from "@wodge/core/features/services/flags";
import { disabledFeature } from "@wodge/core/features/flags";
import {
  httpFeatures,
  mutationFeatures,
  partyFeatures,
} from "@wodge/core/features/policy";
import type { Feature } from "@wodge/domain/features/models";
import type { Context } from "hono";
import { inject, injectable } from "tsyringe";

export function featureDisabledResponse(feature: Feature) {
  return Response.json(
    { error: "FeatureDisabled", feature },
    {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

@injectable()
export class FeatureHandlers {
  constructor(
    @inject(FeatureFlagService) private readonly flags: FeatureFlagService,
  ) {}

  snapshot = async (c: Context) =>
    c.json(await this.flags.read(), 200, { "Cache-Control": "no-store" });

  async check(required: readonly Feature[]) {
    if (!required.length) return;
    const disabled = disabledFeature((await this.flags.read()).flags, required);
    if (disabled) return featureDisabledResponse(disabled);
  }

  async http(request: Request) {
    if (request.method === "OPTIONS") return;
    const required = httpFeatures(
      new URL(request.url).pathname,
      request.method,
    );
    if (!required)
      return Response.json(
        { error: "UnregisteredCapability" },
        { status: 403 },
      );
    return this.check(required);
  }

  async party(
    request: Request,
    domain: string,
    storedType?: (mutation: {
      name: string;
      args: unknown;
    }) => string | undefined,
  ) {
    if (request.method === "OPTIONS") return;
    const path =
      "/" + new URL(request.url).pathname.split("/").slice(4).join("/");
    // Calls keep their existing permanent CALLS_DISABLED response.
    if (domain === "room" && path === "/token") return;
    const required = partyFeatures(domain, path, request.method);
    if (!required)
      return Response.json(
        { error: "UnregisteredCapability" },
        { status: 403 },
      );
    if (path === "/replicache-push" && domain !== "user") {
      let body: unknown;
      try {
        body = await request.clone().json();
      } catch {
        return Response.json({ error: "InvalidPush" }, { status: 400 });
      }
      if (
        !body ||
        typeof body !== "object" ||
        !("mutations" in body) ||
        !Array.isArray(body.mutations)
      )
        return Response.json({ error: "InvalidPush" }, { status: 400 });
      const mutations: unknown[] = body.mutations;
      for (const entry of mutations) {
        if (
          !entry ||
          typeof entry !== "object" ||
          !("name" in entry) ||
          typeof entry.name !== "string"
        )
          return Response.json({ error: "InvalidPush" }, { status: 400 });
        const mutation = {
          name: entry.name,
          args: "args" in entry ? entry.args : undefined,
        };
        const features = mutationFeatures(domain, mutation.name, mutation.args);
        if (!features)
          return Response.json(
            { error: "UnregisteredMutation" },
            { status: 400 },
          );
        required.push(...features);
        const type = storedType?.(mutation);
        if (type)
          required.push(
            ...(mutationFeatures(domain, mutation.name, { type }) ?? []),
          );
      }
    }
    return this.check(required);
  }
}
