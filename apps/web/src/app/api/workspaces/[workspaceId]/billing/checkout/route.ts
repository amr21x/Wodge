import { NextRequest } from "next/server";
import { env } from "@wodge/env";
import { getStripe } from "@/lib/utils/get-stripe";
import { isWorkspaceAdmin } from "../../../is-workspace-admin";
import { getWorkspaceById } from "@/lib/data-server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params: { workspaceId } }: { params: { workspaceId: string } },
) {
  const supabase = createClient();

  const user = await supabase.auth.getUser();

  if (!user.data.user) return new Response("Unauthorized", { status: 401 });

  if (!(await isWorkspaceAdmin(user.data.user.id, workspaceId)))
    return new Response("Unauthorized", { status: 401 });

  const workspace = await getWorkspaceById(workspaceId);

  if (!workspace) return new Response("Workspace not found", { status: 404 });

  if (workspace.isPremium)
    return new Response("Already premium", { status: 400 });

  const stripe = getStripe();

  const prices = await stripe.prices.list({
    lookup_keys: [process.env.STRIPE_LOOKUP_KEY as string],
    expand: ["data.product"],
  });

  if (!prices.data || !prices.data[0])
    return new Response("No price found", { status: 404 });

  const session = await stripe.checkout.sessions.create({
    billing_address_collection: "auto",
    line_items: [
      {
        price: prices.data[0].id,
        // For metered billing, do not pass quantity
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${env.APP_DOMAIN}/${workspace.slug}/billing/success`,
    cancel_url: `${env.APP_DOMAIN}/${workspace.slug}/billing/failure`,
    subscription_data: {
      metadata: {
        workspaceId: workspace.id,
      },
    },
    customer_email: user.data.user.email,
  });

  if (!session.url) return new Response("Bad request", { status: 400 });

  return Response.json({ url: session.url });
}
