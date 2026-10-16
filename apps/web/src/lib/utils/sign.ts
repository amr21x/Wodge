import { env } from "@wodge/env";
import * as jose from "jose";

export async function sign(data?: any, duration: string = "5m") {
  const jwt = await new jose.SignJWT(data)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(duration)
    .sign(new TextEncoder().encode(env.SECRET_KEY));

  return jwt;
}
