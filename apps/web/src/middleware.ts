import { NextResponse, type NextRequest } from "next/server";
import { env } from "@wodge/env/client";
import { authRoutes, publicRoutes } from "./routes";
import type { PublicUserType } from "@wodge/domain/user/models";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path.startsWith("/api/") || publicRoutes.includes(path)) {
    return NextResponse.next();
  }

  const response = await fetch(
    `${env.NEXT_PUBLIC_BACKEND_DOMAIN}/api/users/me`,
    {
      headers: { cookie: request.headers.get("cookie") ?? "" },
      cache: "no-store",
    },
  );

  if (response.status === 401) {
    if (authRoutes.includes(path)) {
      return NextResponse.next();
    }

    const login = new URL("/login", request.url);

    login.searchParams.set("redirect", path);

    return NextResponse.redirect(login);
  }

  if (!response.ok) {
    return NextResponse.next();
  }

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
