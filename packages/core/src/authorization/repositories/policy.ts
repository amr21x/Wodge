import { eq } from "drizzle-orm";
import { inject, injectable } from "tsyringe";
import {
  authorization_policy,
  authorization_roles,
  authorization_permissions,
  authorization_assignments,
  authorization_outbox,
} from "@wodge/domain/authorization/schema/object";
import { PermissionSetSchema } from "@wodge/domain/authorization/validation";
import type {
  AuthorizationPolicy,
  AuthorizationInvalidation,
} from "@wodge/domain/authorization/models";
import { authorizationError } from "@wodge/core/authorization/errors";
import type { ObjectDatabase } from "@wodge/infra/database/object-database";
import { prepareObjectDatabase } from "@wodge/infra/database/object-migrations";
import { reconcileRows } from "@wodge/infra/database/durable-sql";

@injectable()
export class AuthorizationRepository {
  private ready?: Promise<void>;
  constructor(
    @inject("storage") private readonly legacy: Pick<
      DurableObjectStorage,
      "get"
    >,
    @inject("objectId") private readonly workspaceId: string,
    @inject("objectDatabase") private readonly db: ObjectDatabase,
  ) {}
  private initialize() {
    return (this.ready ??= this.importLegacy());
  }
  private async importLegacy() {
    await prepareObjectDatabase(this.db, "workspace");
    if (this.db.select().from(authorization_policy).get()) return;
    const stored = await this.legacy.get<{
      policy: AuthorizationPolicy;
      outbox: AuthorizationInvalidation[];
    }>("authorization:policy:v1");
    this.db.transaction(() => {
      if (this.db.select().from(authorization_policy).get()) return;
      if (stored) {
        this.writePolicy(stored.policy);
        for (const event of stored.outbox)
          this.db
            .insert(authorization_outbox)
            .values({
              id: event.id,
              workspace_id: event.workspaceId,
              revision: event.revision,
              created_at: event.createdAt,
            })
            .onConflictDoNothing()
            .run();
      } else
        this.db
          .insert(authorization_policy)
          .values({
            id: 1,
            workspace_id: null,
            revision: 0,
            schema_version: 1,
            resources_migrated: null,
          })
          .run();
    });
  }
  private readPolicy(): AuthorizationPolicy | null {
    const header = this.db.select().from(authorization_policy).get();
    if (!header?.workspace_id) return null;
    if (header.schema_version !== 1)
      throw new Error("Unsupported authorization policy schema");
    const permissions = this.db
      .select()
      .from(authorization_permissions)
      .orderBy(authorization_permissions.position)
      .all();
    return {
      schemaVersion: 1,
      workspaceId: header.workspace_id,
      revision: header.revision,
      ...(header.resources_migrated !== null
        ? { resourcesMigrated: header.resources_migrated === 1 }
        : {}),
      roles: this.db
        .select()
        .from(authorization_roles)
        .orderBy(authorization_roles.position)
        .all()
        .map((role) => {
          const values: Record<string, string[]> = {};
          for (const item of permissions.filter(
            (item) => item.role_id === role.id,
          ))
            (values[item.resource] ??= []).push(item.action);
          return {
            id: role.id,
            name: role.name,
            permissions: PermissionSetSchema.parse(values),
            ...(role.system ? { system: role.system } : {}),
          };
        }),
      assignments: this.db
        .select()
        .from(authorization_assignments)
        .orderBy(authorization_assignments.position)
        .all()
        .map((row) => ({
          id: row.id,
          roleId: row.role_id,
          subject: { type: row.subject_type, id: row.subject_id },
          scope: { type: row.scope_type, id: row.scope_id },
        })),
    };
  }
  async read() {
    await this.initialize();
    return this.readPolicy();
  }
  private writePolicy(policy: AuthorizationPolicy) {
    this.db
      .insert(authorization_policy)
      .values({
        id: 1,
        workspace_id: policy.workspaceId,
        revision: policy.revision,
        schema_version: policy.schemaVersion,
        resources_migrated:
          policy.resourcesMigrated === undefined
            ? null
            : Number(policy.resourcesMigrated),
      })
      .onConflictDoUpdate({
        target: authorization_policy.id,
        set: {
          workspace_id: policy.workspaceId,
          revision: policy.revision,
          resources_migrated:
            policy.resourcesMigrated === undefined
              ? null
              : Number(policy.resourcesMigrated),
        },
      })
      .run();
    reconcileRows(
      this.db,
      authorization_roles,
      ["id"],
      policy.roles.map((role, position) => ({
        id: role.id,
        position,
        name: role.name,
        system: role.system ?? null,
      })),
    );
    reconcileRows(
      this.db,
      authorization_permissions,
      ["role_id", "resource", "action"],
      policy.roles.flatMap((role) =>
        Object.entries(role.permissions).flatMap(([resource, actions]) =>
          actions.map((action, position) => ({
            role_id: role.id,
            resource,
            action,
            position,
          })),
        ),
      ),
    );
    reconcileRows(
      this.db,
      authorization_assignments,
      ["id"],
      policy.assignments.map((item, position) => ({
        id: item.id,
        position,
        role_id: item.roleId,
        subject_type: item.subject.type,
        subject_id: item.subject.id,
        scope_type: item.scope.type,
        scope_id: item.scope.id,
      })),
    );
  }
  async commit(
    expectedRevision: number,
    policy: AuthorizationPolicy,
    event: AuthorizationInvalidation,
  ) {
    await this.initialize();
    this.db.transaction(() => {
      const current = this.db.select().from(authorization_policy).get()!;
      if (current.revision !== expectedRevision)
        throw authorizationError(
          "AUTHORIZATION_CONFLICT",
          "Authorization changed; retry with current policy",
        );
      if (
        policy.workspaceId !== this.workspaceId ||
        policy.revision !== expectedRevision + 1
      )
        throw authorizationError(
          "AUTHORIZATION_INVALID_INPUT",
          "Invalid policy revision or workspace",
        );
      this.writePolicy(policy);
      this.db
        .insert(authorization_outbox)
        .values({
          id: event.id,
          workspace_id: event.workspaceId,
          revision: event.revision,
          created_at: event.createdAt,
        })
        .run();
    });
  }
  async pendingInvalidations() {
    await this.initialize();
    return this.db
      .select()
      .from(authorization_outbox)
      .orderBy(authorization_outbox.revision, authorization_outbox.created_at)
      .all()
      .map((row) => ({
        id: row.id,
        workspaceId: row.workspace_id,
        revision: row.revision,
        createdAt: row.created_at,
      }));
  }
  async acknowledgeInvalidation(id: string) {
    await this.initialize();
    this.db
      .delete(authorization_outbox)
      .where(eq(authorization_outbox.id, id))
      .run();
  }
}
