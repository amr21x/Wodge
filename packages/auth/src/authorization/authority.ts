import type {
  AuthorizationPrincipal,
  ResourceGrant,
  RoomAuthorizationScope,
} from "@wodge/domain/authorization/models";

/** Capability supplied by the host; the authorization package does not choose a transport. */
export const GrantAuthority = Symbol("GrantAuthority");
export interface GrantAuthority {
  resolve(
    scope: RoomAuthorizationScope,
    principal: AuthorizationPrincipal,
  ): Promise<ResourceGrant>;
}
