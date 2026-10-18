import type { z } from "zod";
import type { ResourceActor } from "../channels";
import type { pageInputSchemas } from "./validation";

export type PageInputs = {
  [Operation in keyof typeof pageInputSchemas]: z.output<
    (typeof pageInputSchemas)[Operation]
  >;
};

export type CreateColumnArgs = PageInputs["createColumn"];

export type CreateTaskArgs = PageInputs["createTask"];

export type EditTaskArgs = PageInputs["editTask"];

export type MoveColumnsArgs = PageInputs["moveColumns"];

export type MoveTasksArgs = PageInputs["moveTasks"];

export type PageActor = ResourceActor;
