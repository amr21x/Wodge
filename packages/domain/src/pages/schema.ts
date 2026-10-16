import { z } from "zod";
import { ChannelSchema } from "../channels/index";

export const TaskSchema = z.object({
  id: z.string(),
  columnId: z.string(),
  overview: z.string().optional(),
  title: z.string().optional(),
  due: z
    .object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    })
    .optional(),
  assignee: z.array(z.string()).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  includeTime: z.boolean().default(false),
});

export const ColumnSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
});

export type Db = {
  tasks: Task[];
  columns: Column[];
};

export const PageSchema = ChannelSchema.extend({});
export type Task = z.infer<typeof TaskSchema>;
export type Column = z.infer<typeof ColumnSchema>;

export type Page = z.infer<typeof PageSchema>;
