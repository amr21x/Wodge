import { memo, useMemo } from "react";
import { EditorUser } from "./types";
import { TooltipWrapper } from "@/components/tooltip-wrapper";
import { SafeAvatar } from "@/components/safe-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type EditorInfoProps = {
  users: EditorUser[];
  maxLength?: number;
};

export const EditorInfo = memo(({ users }: EditorInfoProps) => {
  const usersSet = useMemo(() => {
    const set = new Set();

    return users
      .map((user) => {
        if (set.has(user?.username)) {
          return null;
        }

        set.add(user?.username);

        return user;
      })
      .filter((u) => !!u);
  }, [users]);

  return (
    <DropdownMenu>
      <div className="flex items-center py-2">
        <div className="flex flex-row items-center">
          <div className="relative ml-3 flex flex-row items-center">
            {usersSet?.map((user, _i) => {
              return (
                <div key={user?.clientId} className="-ml-2">
                  <TooltipWrapper content={user?.username}>
                    <SafeAvatar
                      className="h-6 w-6"
                      src={user?.avatar}
                      fallback={user?.username}
                      color={user?.color}
                    />
                  </TooltipWrapper>
                </div>
              );
            })}

            {usersSet.length > 5 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="z-50 -ml-2 flex h-6 w-6 cursor-pointer select-none items-center justify-center rounded-full bg-secondary text-xs text-muted-foreground ring-[1.5px] ring-secondary">
                    <span className="hidden md:inline">+</span>
                    {usersSet.length - 5}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="select-none">
                  {usersSet.map((user) => (
                    <DropdownMenuItem
                      key={user?.clientId}
                      className="flex items-center"
                    >
                      <SafeAvatar
                        className="mr-2 h-6 w-6"
                        src={user?.avatar}
                        fallback={user?.username}
                        color={user?.color}
                      />

                      <p className="mr-1 truncate text-sm">
                        {user?.displayName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{user?.username}
                      </p>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </DropdownMenu>
  );
});

EditorInfo.displayName = "EditorInfo";
