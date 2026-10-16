import type { Task } from "./schema";

export interface CreateColumnArgs {
  title?: string;
  id: string;
}
export interface CreateTaskArgs {
  task: Task;
  col: string;
}

export interface EditTaskArgs {
  task: Task;
}

export interface MoveColumnsArgs {
  c1: string;
  c2: string;
}

export interface MoveTasksArgs {
  t1: string;
  tOrC2: string;
  isOverColumn: boolean;
}
