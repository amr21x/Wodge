import {
  emailOTPClient,
  inferAdditionalFields,
  organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { AuthInstance } from "./server";

export const authClient = createAuthClient({
  plugins: [
    emailOTPClient(),
    organizationClient(),
    inferAdditionalFields<AuthInstance>(),
  ],
});
