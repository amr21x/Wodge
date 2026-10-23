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
import { useState } from "react";
import { SafeAvatar } from "@/components/safe-avatar";

interface MembersColumnsProps {
  removeMember: (memberId: string) => void;
  changeTeamMemberRole: (
    memberId: string,
    role: "teamMember" | "moderator",
  ) => void;
  creatorId?: string;
  moderatorsIds: readonly string[];
  workspaceId?: string;
}

export const teamMembersColumns = ({
  removeMember,
  changeTeamMemberRole,
  moderatorsIds,
  workspaceId,
}: MembersColumnsProps): ColumnDef<string>[] => [
  {
    accessorFn: (row) => {
      const members = queryClient.getQueryData<PublicUserType[]>([
        workspaceId,
        "members",
      ]);

      const member = members?.find((m) => m.id === row);

      return `${member?.displayName} ${member?.email} ${member?.username}`;
    },
    id: "member",
    header: () => <Header>Member</Header>,
    cell: function Cell({ row }) {
      const memberId = row.original;
      const { member, isMembersPending } = useMember(memberId);

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
      const { member, isMembersPending } = useMember(row.original);

      if (isMembersPending) {
        return null;
      }

      return <p className="text-sm">@{member?.username}</p>;
    },
  },
  {
    id: "role",
    header: () => <Header className="pl-3">Role</Header>,
    cell: function Cell({ row }) {
      const isModerator = moderatorsIds?.includes(row.original);
      const [value] = useState<string>(
        isModerator ? "moderator" : "teamMember",
      );

      return (
        <div className="flex w-28">
          <Select
            defaultValue={value}
            onValueChange={(v) =>
              changeTeamMemberRole(
                row.original,
                v as "teamMember" | "moderator",
              )
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
              <SelectItem value="teamMember">Team member</SelectItem>
              <SelectItem value="moderator">Moderator</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const memberId = row.original;

      return (
        <DataTableActions
          row={row}
          table={table}
          menuItems={[
            {
              label: "Remove from team",
              action: () => {
                removeMember(memberId);
              },
              destructive: true,
            },
          ]}
        />
      );
    },
  },
];
