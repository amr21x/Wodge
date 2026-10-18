import { SessionTickets } from "@wodge/auth/tickets";
import { signToken } from "@wodge/auth/tokens";
import { expect, test, vi } from "vitest";
import { createTestEnvironment } from "../helpers/environment";

const secret = "test-only-ticket-signing-key";

test("connection tickets carry purpose and entity identity without exposing the session token", async () => {
  const sessions = {
    get: vi.fn<[], Promise<{ expiresAt: Date } | undefined>>(async () => ({
      expiresAt: new Date(Date.now() + 60_000),
    })),
  };
  const tickets = new SessionTickets(
    sessions,
    createTestEnvironment({ SECRET_KEY: secret }),
  );
  const token = await tickets.issue("user", "session-id", "connection");

  expect(await tickets.verify(token)).toEqual({
    userId: "user",
    sessionId: "session-id",
    purpose: "connection",
  });
  expect(sessions.get).toHaveBeenCalledWith("session-id", "user");
  const claims = JSON.parse(
    Buffer.from(token.split(".")[1]!, "base64url").toString(),
  );

  expect(claims).not.toHaveProperty("sessionToken");
  expect(claims.exp - claims.iat).toBe(300);
});

test("revoked or expired sessions invalidate otherwise valid tickets", async () => {
  const sessions = {
    get: vi.fn<[], Promise<{ expiresAt: Date } | undefined>>(async () => ({
      expiresAt: new Date(Date.now() + 60_000),
    })),
  };
  const tickets = new SessionTickets(
    sessions,
    createTestEnvironment({ SECRET_KEY: secret }),
  );
  const token = await tickets.issue("user", "session", "upload");

  expect(await tickets.verify(token)).toEqual({
    userId: "user",
    sessionId: "session",
    purpose: "upload",
  });
  sessions.get.mockResolvedValue(undefined);
  expect(await tickets.verify(token)).toBeNull();
});

test.each([
  { userId: "user", sessionId: "session", purpose: "admin" },
  { userId: "user", purpose: "connection" },
  { userId: 1, sessionId: "session", purpose: "connection" },
])(
  "malformed or unsupported ticket claims are rejected before session lookup: %j",
  async (claims) => {
    const sessions = {
      get: vi.fn<[], Promise<{ expiresAt: Date } | undefined>>(async () => ({
        expiresAt: new Date(Date.now() + 60_000),
      })),
    };
    const tickets = new SessionTickets(
      sessions,
      createTestEnvironment({ SECRET_KEY: secret }),
    );

    expect(await tickets.verify(await signToken(secret, claims))).toBeNull();
    expect(sessions.get).not.toHaveBeenCalled();
  },
);

test("expired tickets and signatures from another key are rejected", async () => {
  const sessions = {
    get: vi.fn<[], Promise<{ expiresAt: Date } | undefined>>(async () => ({
      expiresAt: new Date(Date.now() + 60_000),
    })),
  };
  const tickets = new SessionTickets(
    sessions,
    createTestEnvironment({ SECRET_KEY: secret }),
  );
  const claims = {
    userId: "user",
    sessionId: "session",
    purpose: "connection",
  };

  await expect(
    tickets.verify(await signToken(secret, claims, "-1s")),
  ).rejects.toThrow();
  await expect(
    tickets.verify(await signToken("another-key", claims)),
  ).rejects.toThrow();
  expect(sessions.get).not.toHaveBeenCalled();
});

test("ticket validity is bounded by the current authoritative session expiry", async () => {
  const sessions = {
    get: vi.fn(async () => ({ expiresAt: new Date(Date.now() - 1) })),
  };
  const tickets = new SessionTickets(
    sessions,
    createTestEnvironment({ SECRET_KEY: secret }),
  );
  const token = await tickets.issue("user", "session", "connection");
  expect(await tickets.verify(token)).toBeNull();
});
