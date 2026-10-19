import type PageServer from "../servers/page";
import type RoomServer from "../servers/room";
import type ThreadServer from "../servers/thread";
import type UserServer from "../servers/user";
import type WorkspaceServer from "../servers/workspace";
/** The caller declares its object kind; state field names never determine registration. */
export type ObjectContext =
  | { type: "page"; instance: PageServer }
  | { type: "room"; instance: RoomServer }
  | { type: "thread"; instance: ThreadServer }
  | { type: "user"; instance: UserServer }
  | { type: "workspace"; instance: WorkspaceServer };
