import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { env } from "@wodge/env";
import { WORKSPACE_TEAM_ID_LENGTH } from "@wodge/domain/constants";
import { useCurrentWorkspace } from "@/components/workspace-provider";

export function useCurrentResources() {
  const { path, teamId } = useParams<{ path: string[]; teamId: string }>();
  const { workspaceId } = useCurrentWorkspace();

  // fetch teamResources from server
  const { data, isError } = useQuery({
    queryFn: async () => {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/files/${teamId}/${btoa(teamId)}`,
      );

      const data = await res.json<string[]>();

      if (!data || data.length === 0) return ["team"];

      return data?.map((d) => d.slice(WORKSPACE_TEAM_ID_LENGTH + 1)) || [];
    },
    queryKey: ["resources", workspaceId, teamId],
    enabled: !!teamId && !!workspaceId,
  });

  const curLevel = path?.length || 0;

  const curPath = path?.join("/");

  const levelItems = curPath
    ? data
        ?.filter((p) => p.startsWith(curPath))
        .map((p) => p.split("/").slice(curLevel).join("/")) || []
    : data;

  const dirs = [
    ...new Set(
      levelItems
        ?.filter((p) => p.includes("/"))
        .map((p) => p.split("/").at(0)) || [],
    ),
  ];

  const files = levelItems?.filter((p) => !p.includes("/")) || [];

  // if (isError) {
  //   console.error("Failed to fetch resources");
  // }

  return { files, dirs, curPath, curLevel };
}
