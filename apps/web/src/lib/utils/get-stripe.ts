import { env } from "@wodge/env";
import Stripe from "stripe";

export function getStripe() {
  return new Stripe(env.STRIPE_SECRET_KEY);
}
