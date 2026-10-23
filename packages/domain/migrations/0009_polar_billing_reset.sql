-- Polar replaces Stripe. Stripe test-mode subscriptions and customer IDs have no Polar
-- counterpart, so every workspace returns to Basic until a verified Polar subscription arrives.
DELETE FROM `billing_subscriptions`;
--> statement-breakpoint
UPDATE `auth_organizations` SET `is_premium` = 0, `customer_id` = NULL;
