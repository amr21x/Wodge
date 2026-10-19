import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { IntegrationUnavailableError } from "@wodge/infra/integration-unavailable";
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
import { APIError, createAuthMiddleware } from "better-auth/api";
import { emailOTP, organization } from "better-auth/plugins";

/** Configure Better Auth here; the backend supplies environment and dependencies only. */
export function createAuth(
  environment: ServerEnvironment,
  database: Database,
  emailSender: {
    send(message: { to: string; subject: string; text: string }): Promise<void>;
  },
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
      ...(environment.GOOGLE_CLIENT_ID &&
        environment.GOOGLE_CLIENT_SECRET && {
          google: {
            clientId: environment.GOOGLE_CLIENT_ID,
            clientSecret: environment.GOOGLE_CLIENT_SECRET,
          },
        }),
      ...(environment.GITHUB_CLIENT_ID &&
        environment.GITHUB_CLIENT_SECRET && {
          github: {
            clientId: environment.GITHUB_CLIENT_ID,
            clientSecret: environment.GITHUB_CLIENT_SECRET,
          },
        }),
    },
    hooks: {
      // Better Auth can mask delivery errors in background tasks. Reject an unavailable
      // email capability before it creates a code or reports that a message was sent.
      before: createAuthMiddleware(async (context) => {
        if (
          context.path.startsWith("/email-otp/") &&
          (!environment.RESEND_API_KEY || !environment.RESEND_EMAIL_FROM)
        )
          throw new APIError("SERVICE_UNAVAILABLE", {
            message: "Sign-in email is not configured",
          });
      }),
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
      emailOTP({
        otpLength: 6,
        expiresIn: 300,
        allowedAttempts: 5,
        storeOTP: "hashed",
        sendVerificationOTP: async ({ email, otp }) => {
          try {
            await emailSender.send({
              to: email,
              subject: "Your Wodge sign-in code",
              text: `Your Wodge sign-in code is ${otp}. It expires in 5 minutes.`,
            });
          } catch (error) {
            if (error instanceof IntegrationUnavailableError)
              throw new APIError("SERVICE_UNAVAILABLE", {
                message: error.message,
              });
            throw error;
          }
        },
      }),
    ],
  });
}

export type AuthInstance = ReturnType<typeof createAuth>;
