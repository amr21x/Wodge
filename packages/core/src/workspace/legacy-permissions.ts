import { z } from "zod";
import type { workspace_permission_imports } from "@wodge/domain/workspace/schema/object";

// Migration-only input. These fields never enter the current workspace model or API.
const channel = z.object({
  id: z.string(),
  viewGroups: z.array(z.string()).default([]),
  editGroups: z.array(z.string()).default([]),
});
const legacy = z.object({
  groups: z
    .array(z.object({ id: z.string(), members: z.array(z.string()) }))
    .default([]),
  teams: z.array(
    z.object({
      id: z.string(),
      members: z.array(z.string()),
      moderators: z.array(z.string()),
      rooms: z.array(channel),
      threads: z.array(channel),
      folders: z.array(z.object({ channels: z.array(channel) })),
    }),
  ),
});
export function legacyPermissionImports(input: unknown) {
  const state = legacy.parse(input);
  const rows: (typeof workspace_permission_imports.$inferInsert)[] = [];
  for (const team of state.teams) {
    const collections = [
      { kind: "room" as const, channels: team.rooms },
      {
        kind: "page" as const,
        channels: team.folders.flatMap((f) => f.channels),
      },
    ];
    for (const { kind, channels } of collections)
      for (const resource of channels) {
        for (const [access, ids] of [
          ["read", resource.viewGroups],
          ["update", resource.editGroups],
        ] as const) {
          for (const id of ids) {
            if (id === "team-members")
              rows.push({
                scope_type: kind,
                scope_id: resource.id,
                subject_type: "team",
                subject_id: team.id,
                access,
              });
            else
              for (const member of state.groups.find((g) => g.id === id)
                ?.members ?? []) {
                if (team.members.includes(member))
                  rows.push({
                    scope_type: kind,
                    scope_id: resource.id,
                    subject_type: "user",
                    subject_id: member,
                    access,
                  });
              }
          }
        }
      }
    for (const resource of team.threads)
      for (const access of ["read", "update"] as const)
        rows.push({
          scope_type: "thread",
          scope_id: resource.id,
          subject_type: "team",
          subject_id: team.id,
          access,
        });
  }
  return rows;
}
