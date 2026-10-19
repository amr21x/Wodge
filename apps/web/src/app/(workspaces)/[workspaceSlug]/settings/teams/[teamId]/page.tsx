"use client";

import { TeamSettings } from "@/features/workspace/settings/teams/team-settings";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";
import { useMemo } from "react";

function TeamSettingsPage({
  params: { teamId },
}: {
  params: { workspaceSlug: string; teamId: string };
}) {
  const { structure } = useCurrentWorkspace();

  const team = useMemo(
    () => structure.teams.find((t) => t.id === teamId),
    [teamId, structure.teams],
  );

  if (!team) {
    return <p>Team not found</p>;
  }

  return <TeamSettings team={team} />;
}

export default TeamSettingsPage;
