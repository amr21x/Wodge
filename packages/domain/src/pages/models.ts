import type { z } from "zod";
import type * as Validation from "./validation";

export type Db = {
  tasks: Task[];
  columns: Column[];
};

export type Task = z.infer<typeof Validation.TaskSchema>;

export type Column = z.infer<typeof Validation.ColumnSchema>;

export type Page = z.infer<typeof Validation.PageSchema>;

export interface PageRecord {
  data: Db;
  lastModifiedVersion: number;
  deleted: boolean;
}
