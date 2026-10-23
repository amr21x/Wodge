import { Task } from "@wodge/domain/pages/models";
import { createContext, useContext, useState } from "react";

const Context = createContext<
  | {
      title: string | undefined;
      isEditing: boolean;
      setTitle: (title: string | undefined) => void;
      setIsEditing: (isEditing: boolean) => void;
      open: boolean;
      setOpen: (open: boolean) => void;
    }
  | undefined
>(undefined);

export function TaskProvider({
  children,
  task,
  isEditing,
  setIsEditing,
  // open,
}: {
  children: React.ReactNode;
  task: Task;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
}) {
  const [title, setTitle] = useState(task?.title);
  const [open, setOpen] = useState(false);

  if (task?.title !== title && !isEditing) {
    setTitle(task.title);
  }

  return (
    <Context.Provider
      value={{
        title,
        isEditing,
        setTitle,
        setIsEditing,
        open,
        setOpen,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useTask() {
  const context = useContext(Context);

  if (!context) {
    throw new Error("useTask must be used within a TaskProvider");
  }

  return context;
}
