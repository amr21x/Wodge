import { NextRequest, NextResponse } from "next/server";
import { env } from "@wodge/env";
import { getStripe } from "@/lib/utils/get-stripe";
import { isWorkspaceAdmin } from "../../../is-workspace-admin";
import { getWorkspaceById } from "@/lib/data-server";

export async function GET(
  request: NextRequest,
  { params: { workspaceId } }: { params: { workspaceId: string } },
) {
  const userId = request.headers.get("x-user-id");

  if (!userId) return new Response("Unauthorized", { status: 401 });

  if (!(await isWorkspaceAdmin(userId, workspaceId)))
    return new Response("Unauthorized", { status: 401 });

  const workspace = await getWorkspaceById(workspaceId);

  if (!workspace) return new Response("Workspace not found", { status: 404 });

  if (!workspace.isPremium || !workspace.customerId) {
    return new Response("Not premium", { status: 400 });
  }

  const stripe = getStripe();

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: workspace.customerId,
    return_url: `${env.APP_DOMAIN}/${workspace.slug}/settings/upgrade`,
  });

  return Response.json({ url: portalSession.url });
}
