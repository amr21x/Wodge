import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";
import { createDb, getUserById } from "@/lib/data-server";
import { users } from "@wodge/data";
import {
  apiPrefix,
  authRoutes,
  DEFAULT_LOGIN_REDIRECT,
  publicRoutes,
} from "./routes";

export async function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const isApiRoute = nextUrl.pathname.startsWith(apiPrefix);

  // order matters here

  if (
    nextUrl.pathname === "/auth/user" ||
    nextUrl.pathname === "/demo" ||
    nextUrl.pathname === "/info" ||
    nextUrl.pathname === "/api/billing/webhook" ||
    nextUrl.pathname === "/auth/callback"
  ) {
    return;
  }

  let { response, user } = await updateSession(request);

  let curUser = await getUserById(user.data.user?.id);

  // handle saving user data on our side
  if (user.data.user && !curUser) {
    const db = createDb();

    const { id, email, user_metadata } = user.data.user;

    try {
      curUser = await db
        .insert(users)
        .values({
          id: id,
          email: email!,
          displayName: user_metadata?.full_name || "",
          avatar: user_metadata?.avatar_url || "",
        })
        .returning()
        .get();
    } catch {}
  }

  const isLoggedIn = !!curUser;
  const hasUsername = !!curUser?.username;

  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);
  const isOnboardingRoute = nextUrl.pathname === "/onboarding";

  if (isApiRoute) {
    return response;
  }

  // auth routes ex. login, onboarding
  if (isAuthRoute) {
    if (isLoggedIn) {
      return Response.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl));
    }

    return response;
  }

  if (nextUrl.pathname.split("/").at(2) === "join") {
    if (!isLoggedIn) {
      return Response.redirect(
        new URL(`/login?redirect=${nextUrl.pathname}`, nextUrl),
      );
    }
    return response;
  }

  // User is not authentic and trying to access a protected route
  if (!isLoggedIn && !isPublicRoute) {
    return Response.redirect(
      new URL(`/login?redirect=${nextUrl.pathname}`, nextUrl),
    );
  }

  // User is authentic but has no profile
  if (!hasUsername && !isOnboardingRoute) {
    return Response.redirect(new URL("/onboarding", nextUrl));
  }

  // User is authentic, has profile, and trying to access onboarding route
  if (isOnboardingRoute && hasUsername) {
    return Response.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl));
  }

  return response;
}

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
