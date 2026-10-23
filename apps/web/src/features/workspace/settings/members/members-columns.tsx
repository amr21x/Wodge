import { Member } from "@wodge/domain/workspace/models";
import { PublicUserType } from "@wodge/domain/user/models";
import { queryClient } from "@/client/query/index";
import { DataTableActions } from "@/components/data-table/data-table-action";
import { Header } from "@/components/data-table/header";

import { buttonVariants } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMember } from "@/features/workspace/hooks/use-member";
import { cn } from "@/lib/utils/index";
import { ColumnDef } from "@tanstack/react-table";

import { DeepReadonly } from "replicache";
import { SafeAvatar } from "@/components/safe-avatar";

interface MembersColumnsProps {
  removeMember: (memberId: string) => void;
  changeMemberRole: (memberId: string, role: Member["role"]) => void;
  workspaceId?: string;
  inviters?: (Pick<Member, "id"> | undefined)[];
}

export function membersColumns({
  removeMember,
  changeMemberRole,
  workspaceId,
}: MembersColumnsProps): ColumnDef<DeepReadonly<Member>>[] {
  return [
    {
      id: "member",
      accessorFn: (row) => {
        const members = queryClient.getQueryData<PublicUserType[]>([
          workspaceId,
          "members",
        ]);

        const member = members?.find((m) => m.id === row.id);

        return `${member?.displayName} ${member?.email} ${member?.username}`;
      },
      header: () => <Header>Member</Header>,

      cell: function Cell({ row }) {
        const { member, isMembersPending } = useMember(row.original.id);

        if (isMembersPending) {
          return null;
        }

        return (
          <div className="flex items-center gap-4">
            <SafeAvatar
              src={member?.avatar}
              fallback={member?.displayName}
              className="h-8 w-8"
            />
            <div className="flex flex-col">
              <div className="flex gap-1 text-[0.8125rem]">
                <p>{member?.displayName}</p>
              </div>
              <span className="text-[0.8125rem] text-muted-foreground">
                {member?.email}
              </span>
            </div>
          </div>
        );
      },
    },

    {
      id: "username",

      header: () => <Header>Username</Header>,

      cell: function Cell({ row }) {
        const { member, isMembersPending } = useMember(row.original.id);

        if (isMembersPending) {
          return null;
        }

        return <p className="text-sm">@{member?.username}</p>;
      },
    },

    {
      id: "role",
      header: () => <Header className="pl-3">Role</Header>,
      cell: ({ row }) => {
        return (
          <div className="flex w-28">
            <Select
              disabled={row.original.role === "owner"}
              defaultValue={row.original.role}
              onValueChange={(v) =>
                changeMemberRole(row.original.id, v as Member["role"])
              }
            >
              <SelectTrigger
                className={cn(
                  buttonVariants({
                    variant: "ghost",
                    size: "sm",
                  }),
                  "w-fit justify-end gap-1 border-none text-right capitalize",
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {row.original.role === "owner" && (
                  <SelectItem value="owner">Owner</SelectItem>
                )}
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row, table }) => {
        const member = row.original;

        return (
          <DataTableActions
            row={row}
            table={table}
            menuItems={[
              {
                label: "Remove from workspace",
                action: () => {
                  removeMember(member.id);
                },
                destructive: true,
                disabled: member.role === "owner",
              },
            ]}
          />
        );
      },
    },
  ];
}
