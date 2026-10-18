import type { z } from "zod";
import type * as Validation from "./validation";

export type ThreadMessage = z.infer<typeof Validation.ThreadMessageSchema>;

export type ThreadPost = z.infer<typeof Validation.ThreadPostSchema>;

export type Thread = z.infer<typeof Validation.ThreadSchema>;
