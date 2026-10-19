import type { z } from "zod";
import type * as Validation from "./validation";

export type Room = z.infer<typeof Validation.RoomSchema>;

export type Message = z.infer<typeof Validation.MessageSchema>;
