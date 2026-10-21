"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/client/api";
import { failureMessage, requireOk } from "@/client/errors";
import { refreshPermissions } from "@/client/permissions";
import { useMembersInfo } from "../hooks/use-members-info";
import { useCurrentUser } from "@/features/account/hooks/use-current-user";
import { useCurrentWorkspace } from "../state/workspace-provider";
import { usePermission } from "../hooks/use-permission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  CreateRoleSchema,
  AssignRoleSchema,
} from "@wodge/domain/authorization/validation";
import {
  permissionCatalogue,
  type Permissions,
} from "@wodge/domain/authorization/permissions";
import type {
  AuthorizationRole,
  RoleAssignment,
} from "@wodge/domain/authorization/models";
import { SettingsContentHeader, SettingsContentSection } from "./settings";

type RoleCommand =
  | { type: "save"; id?: string; input: z.output<typeof CreateRoleSchema> }
  | { type: "delete"; id: string }
  | { type: "assign"; input: z.output<typeof AssignRoleSchema> }
  | { type: "remove"; id: string };

export function RoleSettings() {
  const { workspaceId } = useCurrentWorkspace();
  // Discard partially edited role forms when changing workspaces.
  return <RoleSettingsContent key={workspaceId} />;
}

function RoleSettingsContent() {
  const { workspaceId, members, structure } = useCurrentWorkspace();
  const { user } = useCurrentUser();
  const { membersInfo } = useMembersInfo();
  const scope = workspaceId
    ? { type: "workspace" as const, id: workspaceId }
    : undefined;
  const canRead = usePermission(scope, { role: ["read"] });
  const canCreate = usePermission(scope, { role: ["create"] });
  const canUpdate = usePermission(scope, { role: ["update"] });
  const canDelete = usePermission(scope, { role: ["delete"] });
  const canAssign = usePermission(scope, { role: ["assign"] });
  const [editing, setEditing] = useState<string>();
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<Permissions>({});
  const [roleId, setRoleId] = useState("");
  const [subject, setSubject] = useState("");
  const [scopeType, setScopeType] = useState<"room" | "team" | "workspace">(
    "room",
  );
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");
  const roles = useQuery({
    queryKey: ["authorization", workspaceId, user?.id],
    enabled: !!workspaceId && !!user && canRead,
    staleTime: 0,
    refetchInterval: 10_000,
    queryFn: async () => {
      if (!workspaceId) throw new Error("No workspace selected");
      const response = await api.api.workspaces[
        ":workspaceId"
      ].authorization.roles.$get({ param: { workspaceId } });
      await requireOk(response);
      return response.json();
    },
  });
  const command = useMutation({
    mutationFn: async (command: RoleCommand) => {
      if (!workspaceId) throw new Error("No workspace selected");
      const authorization = api.api.workspaces[":workspaceId"].authorization;
      const param = { workspaceId };
      let response: Parameters<typeof requireOk>[0];
      switch (command.type) {
        case "save":
          response = command.id
            ? await authorization.roles[":roleId"].$patch({
                param: { ...param, roleId: command.id },
                json: command.input,
              })
            : await authorization.roles.$post({ param, json: command.input });
          break;
        case "delete":
          response = await authorization.roles[":roleId"].$delete({
            param: { ...param, roleId: command.id },
          });
          break;
        case "assign":
          response = await authorization.assignments.$post({
            param,
            json: command.input,
          });
          break;
        case "remove":
          response = await authorization.assignments[":assignmentId"].$delete({
            param: { ...param, assignmentId: command.id },
          });
      }
      await requireOk(response);
    },
    onSuccess: (_data, variables) => {
      setError("");
      if (variables.type === "save") {
        setEditing(undefined);
        setName("");
        setPermissions({});
      }
      refreshPermissions({ revoke: true });
      toast.success("Room roles and permissions updated");
    },
    onError: (error) => setError(failureMessage(error)),
  });
  const allRoles = roles.data?.roles ?? [];
  const isRoomRole = (role: AuthorizationRole) =>
    Object.keys(role.permissions).every(
      (resource) => resource === "room" || resource === "message",
    );
  const assignments = roles.data?.assignments ?? [];
  const rooms = structure?.teams.flatMap((team) => team.rooms ?? []) ?? [];
  const subjectName = (assignment: RoleAssignment) =>
    assignment.subject.type === "user"
      ? (membersInfo?.find((member) => member.id === assignment.subject.id)
          ?.email ?? "Former member")
      : (structure?.teams.find((team) => team.id === assignment.subject.id)
          ?.name ?? "Former team");

  function editRole(role: AuthorizationRole) {
    setEditing(role.id);
    setName(role.name);
    setPermissions(role.permissions);
    setError("");
  }

  if (!canRead)
    return (
      <output className="p-6">
        Room role management requires permission to read workspace roles.
      </output>
    );

  return (
    <div className="divide-y divide-border/70">
      <SettingsContentHeader
        label="Room roles"
        description="Manage roles and assignments for room access. Other resources retain their existing access controls."
      />
      {error && (
        <p role="alert" className="p-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {roles.isError && (
        <div role="alert" className="p-4">
          {failureMessage(roles.error)}{" "}
          <Button onClick={() => void roles.refetch()}>Try again</Button>
        </div>
      )}
      {roles.isPending && <output className="p-4">Loading roles…</output>}
      <SettingsContentSection header="Roles">
        <ul className="space-y-3">
          {allRoles.map((role) => (
            <li key={role.id} className="flex items-center gap-3">
              <span>
                {role.name}
                {role.system ? " (system)" : ""}
              </span>
              {!role.system && isRoomRole(role) && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!canUpdate || command.isPending}
                    onClick={() => editRole(role)}
                  >
                    Edit {role.name}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={
                      !canDelete ||
                      command.isPending ||
                      assignments.some(
                        (assignment) => assignment.roleId === role.id,
                      )
                    }
                    onClick={() =>
                      command.mutate({ type: "delete", id: role.id })
                    }
                  >
                    Delete {role.name}
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          System roles are managed by the server. Remove assignments before
          deleting a custom role.
        </p>
      </SettingsContentSection>
      {(canCreate || canUpdate) && (
        <SettingsContentSection header={editing ? "Edit role" : "Create role"}>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const result = CreateRoleSchema.safeParse({ name, permissions });
              if (!result.success) {
                setError(
                  result.error.issues[0]?.message ?? "Check the role values.",
                );
                return;
              }
              command.mutate({ type: "save", id: editing, input: result.data });
            }}
          >
            <Input
              aria-label="Role name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <fieldset disabled={command.isPending} className="space-y-2">
              <legend className="text-sm">Room permissions</legend>
              {(["room", "message"] as const).map((resource) => (
                <div key={resource} className="flex flex-wrap gap-3">
                  {permissionCatalogue[resource].map((action) => (
                    <label
                      key={action}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={
                          permissions[resource]?.some(
                            (value) => value === action,
                          ) ?? false
                        }
                        onChange={(event) => {
                          // Validate through the shared schema to retain the resource/action relationship.
                          const actions = permissions[resource] ?? [];
                          const next = {
                            ...permissions,
                            [resource]: event.target.checked
                              ? [...actions, action]
                              : actions.filter((value) => value !== action),
                          };
                          setPermissions(next);
                        }}
                      />
                      {resource}: {action}
                    </label>
                  ))}
                </div>
              ))}
            </fieldset>
            <Button
              disabled={
                command.isPending || (editing ? !canUpdate : !canCreate)
              }
              type="submit"
            >
              {editing ? "Save role" : "Create role"}
            </Button>
            {editing && (
              <Button
                variant="secondary"
                type="button"
                disabled={command.isPending}
                onClick={() => {
                  setEditing(undefined);
                  setName("");
                  setPermissions({});
                }}
              >
                Cancel
              </Button>
            )}
          </form>
        </SettingsContentSection>
      )}
      <SettingsContentSection header="Room assignments">
        <ul className="space-y-3">
          {assignments
            .filter(
              (assignment) =>
                ["room", "team", "workspace"].includes(assignment.scope.type) &&
                allRoles.some(
                  (role) => role.id === assignment.roleId && isRoomRole(role),
                ),
            )
            .map((assignment) => (
              <li
                key={assignment.id}
                className="flex flex-wrap items-center gap-3"
              >
                <span>
                  {subjectName(assignment)} ·{" "}
                  {allRoles.find((role) => role.id === assignment.roleId)
                    ?.name ?? "Role"}{" "}
                  ·{" "}
                  {assignment.scope.type === "workspace"
                    ? "All workspace rooms"
                    : assignment.scope.type === "team"
                      ? (structure?.teams.find(
                          (team) => team.id === assignment.scope.id,
                        )?.name ?? "Team")
                      : (rooms.find((room) => room.id === assignment.scope.id)
                          ?.name ?? "Room")}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!canAssign || command.isPending}
                  onClick={() =>
                    command.mutate({ type: "remove", id: assignment.id })
                  }
                >
                  Remove assignment
                </Button>
              </li>
            ))}
        </ul>
        {canAssign && (
          <form
            className="mt-4 flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const [type, id] = subject.split(":");
              const result = AssignRoleSchema.safeParse({
                roleId,
                subject: { type, id },
                scope: {
                  type: scopeType,
                  id: scopeType === "workspace" ? workspaceId : roomId,
                },
              });
              if (!result.success) {
                setError("Choose a role, member or team, and room.");
                return;
              }
              command.mutate({ type: "assign", input: result.data });
            }}
          >
            <select
              aria-label="Assignment role"
              className="rounded border bg-background p-2"
              value={roleId}
              onChange={(event) => setRoleId(event.target.value)}
            >
              <option value="">Choose custom role</option>
              {allRoles
                .filter((role) => !role.system && isRoomRole(role))
                .map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
            </select>
            <select
              aria-label="Assignment member or team"
              className="rounded border bg-background p-2"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            >
              <option value="">Choose member or team</option>
              {members?.members.map((member) => (
                <option key={member.id} value={`user:${member.id}`}>
                  {membersInfo?.find((info) => info.id === member.id)?.email ??
                    member.id}
                </option>
              ))}
              {structure?.teams.map((team) => (
                <option key={team.id} value={`team:${team.id}`}>
                  Team: {team.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Assignment scope"
              className="rounded border bg-background p-2"
              value={scopeType}
              onChange={(event) => {
                const value = event.target.value;
                if (
                  value === "room" ||
                  value === "team" ||
                  value === "workspace"
                ) {
                  setScopeType(value);
                  setRoomId("");
                }
              }}
            >
              <option value="room">One room</option>
              <option value="team">Rooms in a team</option>
              <option value="workspace">All workspace rooms</option>
            </select>
            <select
              disabled={scopeType === "workspace"}
              aria-label="Assignment room"
              className="rounded border bg-background p-2"
              value={roomId}
              onChange={(event) => setRoomId(event.target.value)}
            >
              <option value="">
                {scopeType === "workspace"
                  ? "All workspace rooms"
                  : scopeType === "team"
                    ? "Choose team"
                    : "Choose room"}
              </option>
              {(scopeType === "team" ? (structure?.teams ?? []) : rooms).map(
                (room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ),
              )}
            </select>
            <Button disabled={command.isPending} type="submit">
              Assign role
            </Button>
          </form>
        )}
      </SettingsContentSection>
    </div>
  );
}
