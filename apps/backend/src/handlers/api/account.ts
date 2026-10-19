import type { JsonContext } from "../../validators/json";
import { SessionTickets } from "@wodge/auth/tickets";
import { AccountService } from "@wodge/core/user/services/account";
import type { Context } from "hono";
import { inject, injectable } from "tsyringe";
import { UserGateway } from "../../gateways/user";
import type { ApiContext } from "../../types/hono-context";
import { UpdateAccountBody } from "../../validators/user";

@injectable()
export class AccountHandlers {
  constructor(
    @inject(AccountService) private readonly accounts: AccountService,
    @inject(SessionTickets) private readonly tickets: SessionTickets,
    @inject(UserGateway) private readonly userGateway: UserGateway,
  ) {}

  // The session lookup already supplied this profile; reuse it instead of querying again.
  currentAccount = (c: Context<ApiContext>) => {
    return c.json(c.get("user"), 200);
  };

  updateAccount = async (
    c: JsonContext<ApiContext, typeof UpdateAccountBody>,
  ) => {
    const data = c.req.valid("json");
    const user = c.get("user");
    const result = await this.accounts.update(user.id, data);

    if (!result.updatedUser) {
      return c.json({ error: result.error ?? "Unable to update profile" }, 400);
    }

    // Profile data is persisted first, then the user DO propagates it to workspace projections.
    const response = await this.userGateway.refreshProfile(user.id);

    if (!response.ok) {
      return c.json({ error: "Unable to notify workspaces" }, 502);
    }

    return c.json({ success: true, user: result.updatedUser }, 200);
  };

  connectionTicket = async (c: Context<ApiContext>) => {
    const purpose =
      c.req.header("is-upload") === "true" ? "upload" : "connection";
    const token = await this.tickets.issue(
      c.get("user").id,
      c.get("sessionId"),
      purpose,
    );

    c.header("Cache-Control", "no-store");

    return c.json({ token, domain: c.env.APP_DOMAIN }, 200);
  };
}
