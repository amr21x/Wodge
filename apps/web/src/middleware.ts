import { NextResponse, type NextRequest } from "next/server";
import { env } from "@wodge/env/client";
import { authRoutes, publicRoutes } from "./routes";
import { loginPath } from "./features/auth/redirect";
import type { PublicUserType } from "@wodge/domain/user/models";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path.startsWith("/api/") || publicRoutes.includes(path)) {
    return NextResponse.next();
  }

  let response: Response;
  const unavailable = () => {
    if (authRoutes.includes(path)) return NextResponse.next();
    const url = new URL("/unavailable", request.url);
    url.searchParams.set("returnTo", path + request.nextUrl.search);
    return NextResponse.redirect(url);
  };
  try {
    response = await fetch(`${env.NEXT_PUBLIC_BACKEND_DOMAIN}/api/users/me`, {
      headers: { cookie: request.headers.get("cookie") ?? "" },
      cache: "no-store",
    });
  } catch {
    return unavailable();
  }

  if (response.status === 401) {
    if (authRoutes.includes(path)) {
      return NextResponse.next();
    }

    return NextResponse.redirect(
      new URL(loginPath(path + request.nextUrl.search), request.url),
    );
  }

  if (!response.ok) return unavailable();

  const user = (await response.json()) as PublicUserType;

  if (!user.username && path !== "/onboarding") {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (user.username && (authRoutes.includes(path) || path === "/onboarding")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = { matcher: ["/((?!.+\\.[\\w]+$|_next|api).*)", "/"] };
