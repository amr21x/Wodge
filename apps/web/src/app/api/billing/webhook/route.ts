import { getStripe } from "@/lib/utils/get-stripe";
import { createDb, revertWorkspace, upgradeWorkspace } from "@/lib/data-server";
import { env } from "@wodge/env";
import { NextRequest } from "next/server";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  let event;

  const body = await request.text();

  const stripe = getStripe();

  const endpointSecret = env.STRIPE_WH_SECRET;

  const signature = request.headers.get("stripe-signature");

  if (!signature) return new Response(null, { status: 400 });

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      endpointSecret,
    );
  } catch (err) {
    return new Response(null, { status: 400 });
  }

  let subscription;
  let workspaceId;
  let status;
  let cus;

  if (!event) return new Response(null, { status: 400 });

  switch (event.type) {
    case "customer.subscription.trial_will_end":
      subscription = event.data.object;
      status = subscription.status;
      break;
    case "customer.subscription.deleted":
      subscription = event.data.object;
      status = subscription.status;

      workspaceId = subscription.metadata.workspaceId;

      if (!workspaceId) return new Response(null, { status: 400 });
      await revertWorkspace(workspaceId);

      await fetch(
        `${env.BACKEND_DOMAIN}/parties/workspace/${workspaceId}/service/poke`,
        { method: "POST", headers: { authorization: env.SECRET_KEY } },
      );
      break;
    case "customer.subscription.created":
      subscription = event.data.object as Stripe.Subscription;
      status = subscription.status;

      workspaceId = subscription.metadata.workspaceId;
      cus = subscription.customer;

      if (!workspaceId || !cus) return new Response(null, { status: 400 });
      try {
        await upgradeWorkspace(workspaceId, cus as string);
      } catch (e) {
        return new Response(null, { status: 400 });
      }
      await fetch(
        `${env.BACKEND_DOMAIN}/parties/workspace/${workspaceId}/service/poke`,
        { method: "POST", headers: { authorization: env.SECRET_KEY } },
      );
      break;
    case "customer.subscription.updated":
      subscription = event.data.object;
      status = subscription.status;

      break;
    case "entitlements.active_entitlement_summary.updated":
      subscription = event.data.object;
      break;
    default:
  }
  return new Response(null, { status: 200 });
}
