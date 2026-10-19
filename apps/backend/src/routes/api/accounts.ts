import { UpdateAccountBody } from "../../validators/user";
import { jsonBody } from "../../validators/json";
import { Hono } from "hono";
import { inject, injectable } from "tsyringe";
import { AccountHandlers } from "../../handlers/api/account";
import type { ApiContext } from "../../types/hono-context";
@injectable()
export class AccountRoutes {
  readonly router: ReturnType<typeof AccountRoutes.define>;

  constructor(@inject(AccountHandlers) handlers: AccountHandlers) {
    this.router = AccountRoutes.define(handlers);
  }
  private static define(handlers: AccountHandlers) {
    const router = new Hono<ApiContext>();

    const withCurrentAccount = router.get("/me", handlers.currentAccount);
    const withConnectionTicket = withCurrentAccount.get(
      "/token",
      handlers.connectionTicket,
    );
    const withUpdateAccount = withConnectionTicket.post(
      "/update",
      jsonBody(UpdateAccountBody),
      handlers.updateAccount,
    );

    return withUpdateAccount;
  }
}
