import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { checkout, polar, portal, webhooks } from "@polar-sh/better-auth";
import type {
  PolarCore,
  webhooks as polarWebhooks,
} from "@polar-sh/sdk/2026-10";
import { workspaceMemberLimit } from "@wodge/core/workspace/policy";
import {
  authAccounts,
  authInvitations,
  authMembers,
  authOrganizations,
  authRateLimits,
  authSessions,
  authUsers,
  authVerifications,
} from "@wodge/domain/auth/schema/d1";
import { createEntityId } from "@wodge/domain/identifiers";
import { NewWorkspaceSchema } from "@wodge/domain/workspace/validation";
import type { ServerEnvironment } from "@wodge/env/server";
import type { Database } from "@wodge/infra/database/types";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { organization } from "better-auth/plugins";

/** Polar billing dependencies; omitted when billing is not configured. */
export interface AuthBilling {
  client: PolarCore;
  /** Receives verified, untrusted subscription payloads; the backend re-reads Polar. */
  onSubscriptionChanged(subscription: {
    id: string;
    metadata: Record<string, unknown>;
  }): Promise<void>;
}

/** Configure Better Auth here; the backend supplies environment and dependencies only. */
export function createAuth(
  environment: ServerEnvironment,
  database: Database,
  billing?: AuthBilling,
) {
  return betterAuth({
    appName: "Wodge",
    secret: environment.BETTER_AUTH_SECRET,
    baseURL: environment.APP_DOMAIN,
    basePath: "/api/auth",
    trustedOrigins: [environment.APP_DOMAIN],
    database: drizzleAdapter(database, {
      provider: "sqlite",
      schema: {
        user: authUsers,
        session: authSessions,
        account: authAccounts,
        verification: authVerifications,
        rateLimit: authRateLimits,
        organization: authOrganizations,
        member: authMembers,
        invitation: authInvitations,
      },
      transaction: false,
    }),
    user: {
      additionalFields: {
        // Profile writes go through the application's validated account endpoint.
        username: {
          type: "string",
          required: false,
          unique: true,
          input: false,
        },
      },
    },
    advanced: { database: { generateId: () => createEntityId() } },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    rateLimit: { enabled: true, storage: "database" },
    socialProviders: {
      google: {
        clientId: environment.GOOGLE_CLIENT_ID,
        clientSecret: environment.GOOGLE_CLIENT_SECRET,
      },
      github: {
        clientId: environment.GITHUB_CLIENT_ID,
        clientSecret: environment.GITHUB_CLIENT_SECRET,
      },
    },
    plugins: [
      organization({
        allowUserToCreateOrganization: true,
        membershipLimit: async (_user, organization) =>
          workspaceMemberLimit(
            "isPremium" in organization && Boolean(organization.isPremium),
          ),
        schema: {
          organization: {
            additionalFields: {
              isInviteLinkEnabled: {
                type: "boolean",
                defaultValue: true,
                input: false,
              },
              isPremium: { type: "boolean", defaultValue: false, input: false },
              customerId: { type: "string", required: false, input: false },
            },
          },
        },
        organizationHooks: {
          beforeCreateOrganization: async ({ organization }) => {
            const result = NewWorkspaceSchema.safeParse(organization);
            if (!result.success) {
              throw new APIError("BAD_REQUEST", {
                message: "Invalid workspace name or slug",
              });
            }
            return { data: { ...organization, ...result.data } };
          },
          beforeUpdateOrganization: async ({ organization }) => {
            const result = NewWorkspaceSchema.partial().safeParse(organization);
            if (!result.success) {
              throw new APIError("BAD_REQUEST", {
                message: "Invalid workspace name or slug",
              });
            }
            return { data: { ...organization, ...result.data } };
          },
        },
      }),
      ...(billing ? [billingPlugin(environment, billing)] : []),
    ],
  });
}

/**
 * Workspace billing uses metadata-based `reference_id` checkouts on the purchasing admin's
 * personal Polar customer. Checkout and portal are only called server-side by the workspace
 * billing API, which authorizes the workspace first; the backend blocks direct browser calls.
 * Customers are created by checkout, so sign-up never depends on Polar.
 */
function billingPlugin(environment: ServerEnvironment, billing: AuthBilling) {
  return polar({
    client: billing.client,
    createCustomerOnSignUp: false,
    use: [
      checkout({ authenticatedUsersOnly: true }),
      portal(),
      webhooks({
        // A missing secret makes the plugin reject every delivery as unconfigured.
        secret: environment.POLAR_WEBHOOK_SECRET ?? "",
        // Every subscription event triggers the same authoritative re-read.
        onPayload: async (payload) => {
          if (isSubscriptionPayload(payload))
            await billing.onSubscriptionChanged(payload.data);
        },
      }),
    ],
  });
}

export type AuthInstance = ReturnType<typeof createAuth>;

type WebhookPayload = polarWebhooks.WebhookPayload;
function isSubscriptionPayload(
  payload: WebhookPayload,
): payload is Extract<WebhookPayload, { type: `subscription.${string}` }> {
  return payload.type.startsWith("subscription.");
}
