export interface WorkspaceRecord {
  id: string;
  owner: string;
  name: string;
  slug: string;
  avatar: string | null;
  createdAt: Date;
  isInviteLinkEnabled: boolean | null;
  isPremium: boolean | null;
  customerId: string | null;
}

export interface Membership {
  userId: string;
  workspaceId: string;
}
