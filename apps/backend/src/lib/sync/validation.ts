import { z } from "zod";

export const MutationSchema = z.object({
  id: z.number(),
  clientID: z.string(),
  name: z.string(),
  // Arguments stay unknown until the selected domain operation validates them.
  args: z.unknown(),
});

export const PushRequestSchema = z.object({
  clientGroupID: z.string(),
  mutations: z.array(MutationSchema),
});

export type PushRequest = z.infer<typeof PushRequestSchema>;

export const PullRequestSchema = z.object({
  clientGroupID: z.string(),
  cookie: z.union([z.number(), z.null()]),
});

export type PullRequest = z.infer<typeof PullRequestSchema>;
