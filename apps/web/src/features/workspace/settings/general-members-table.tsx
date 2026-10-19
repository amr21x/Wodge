import { DrObj } from "@wodge/domain/types";
import { Member } from "@wodge/domain/workspace/models";
import { useTable } from "./use-table";
import { Mutable } from "@/lib/utils/index";
import { Table } from "@tanstack/react-table";
import { MembersCombobox } from "./members-combobox";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data-table/data-table";
import { SettingsSearchInput } from "./settings-search-input";

interface MembersTableProps<TData> {
  table: Table<TData>;
  members: readonly DrObj<Member>[];
  addMember?: (memberId: string) => void;
}

export function GeneralMembersTable<TData>({
  table,
  members,
  addMember,
}: MembersTableProps<TData>) {
  const nMembers = table.getFilteredRowModel().rows.length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <SettingsSearchInput
          table={table}
          searchColumn="member"
          placeHolder="Search by email, username, or name"
        />
        {addMember && <MembersCombobox members={members} onClick={addMember} />}
      </div>

      {nMembers > 0 && (
        <p className="text-xs">
          {nMembers > 1 ? `${nMembers} members` : `1 member`}
        </p>
      )}
      <DataTable table={table} placeholder="No members found" />
    </div>
  );
}
