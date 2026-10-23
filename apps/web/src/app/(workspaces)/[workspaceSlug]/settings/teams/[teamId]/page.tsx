"use client";

import { TeamSettings } from "@/features/workspace/settings/teams/team-settings";
import { useCurrentWorkspace } from "@/features/workspace/state/workspace-provider";
import { useMemo } from "react";
import { useParams } from "next/navigation";

function TeamSettingsPage() {
  const { teamId } = useParams<{ teamId: string }>();
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
