import type { z } from "zod";
import type { roomInputSchemas } from "./validation";

export type RoomInputs = {
  [Operation in keyof typeof roomInputSchemas]: z.output<
    (typeof roomInputSchemas)[Operation]
  >;
};

export type EditMessageProps = RoomInputs["editMessage"];

export type VoteArgs = RoomInputs["vote"];
