import { Hono } from "hono";
import { inject, injectable } from "tsyringe";
import { BillingHandlers } from "../../handlers/api/billing";
import type { ApiContext } from "../../types/hono-context";
@injectable()
export class BillingRoutes {
  readonly router: ReturnType<typeof BillingRoutes.define>;

  constructor(@inject(BillingHandlers) handlers: BillingHandlers) {
    this.router = BillingRoutes.define(handlers);
  }
  private static define(handlers: BillingHandlers) {
    const router = new Hono<ApiContext>();

    const withPortal = router.get("/portal", handlers.portal);
    const withCheckout = withPortal.get("/checkout", handlers.checkout);

    return withCheckout;
  }
}
