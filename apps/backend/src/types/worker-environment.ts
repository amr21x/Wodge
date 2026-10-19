import type PageServer from "../servers/page";
import type RoomServer from "../servers/room";
import type ThreadServer from "../servers/thread";
import type UserServer from "../servers/user";
import type WorkspaceServer from "../servers/workspace";

import type { ServerEnvironment } from "@wodge/env/server";

// Application-specific object namespaces extend the shared server configuration.
export interface WorkerEnvironment extends ServerEnvironment {
  User: DurableObjectNamespace<UserServer>;
  Workspace: DurableObjectNamespace<WorkspaceServer>;
  Room: DurableObjectNamespace<RoomServer>;
  Thread: DurableObjectNamespace<ThreadServer>;
  Page: DurableObjectNamespace<PageServer>;
}
