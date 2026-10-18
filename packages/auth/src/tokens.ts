import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export async function signToken(
  secret: string,
  data?: JWTPayload,
  duration = "5m",
) {
  return new SignJWT(data)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(duration)
    .sign(new TextEncoder().encode(secret));
}

export async function verifyToken(secret: string, token: string) {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));

  if (payload.exp && payload.exp < Date.now() / 1000) {
    throw new Error("Expired token");
  }

  return payload;
}
