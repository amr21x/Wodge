/**
 * An array of routes that are accessible to the public
 * These routes do not require authentication
 */
export const publicRoutes: string[] = ["/demo", "/info"];

/**
 * An array of routes that are used for authentication
 * These routes will redirect logged in users to /settings
 * Onboarding route is treated as a protected route
 */
export const authRoutes: string[] = ["/login", "/login/error"];

/**
 * The prefix for API authentication routes
 * Routes that start with prefix are used for API authentication purposes
 */
export const apiPrefix = "/api";

/**
 * Default redirect path after logging in
 */
export const DEFAULT_LOGIN_REDIRECT = "/";
