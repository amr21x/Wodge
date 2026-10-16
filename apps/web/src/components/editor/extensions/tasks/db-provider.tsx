import { useCurrentPageRep } from "@/hooks/use-page-rep";
import { useSubscribe } from "@/hooks/use-subscribe";
import { Column, Task } from "@wodge/domain/pages";
import { DrObj } from "@wodge/data";
import { pageMutators } from "@/client/sync/pages";
import { createContext, useContext } from "react";
import { ReadTransaction, Replicache } from "replicache";

const Context = createContext<{
  columns: Column[] | DrObj<Column[]>;
  tasks: Task[] | DrObj<Task[]>;
  rep?: Replicache<typeof pageMutators>;
}>({
  columns: [],
  tasks: [],
});

export function DbProvider({ children }: { children?: React.ReactNode }) {
  const rep = useCurrentPageRep();

  const { snapshot: tasks } = useSubscribe(
    rep,
    (tx: ReadTransaction) => tx.get<Task[]>("tasks"),
    {
      default: [],
    },
  );

  const { snapshot: columns } = useSubscribe(
    rep,
    (tx: ReadTransaction) => tx.get<Column[]>("columns"),
    {
      default: [],
    },
  );

  return (
    <Context.Provider
      value={{
        columns,
        tasks,
        rep,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useDb() {
  const context = useContext(Context);

  if (!context) {
    throw new Error("useDb must be used within a DbProvider");
  }

  return context;
}
