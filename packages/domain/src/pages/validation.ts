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

export const PageSchema = ChannelSchema.extend({});

export const pageInputSchemas = {
  createColumn: ColumnSchema,
  deleteColumn: ColumnSchema,
  updateColumn: ColumnSchema,
  createTask: z.object({ task: TaskSchema, col: z.string() }),
  editTask: z.object({ task: TaskSchema }),
  deleteTask: z.object({ task: TaskSchema }),
  moveColumns: z.object({ c1: z.string(), c2: z.string() }),
  moveTasks: z.object({
    t1: z.string(),
    tOrC2: z.string(),
    isOverColumn: z.boolean(),
  }),
};
