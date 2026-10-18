import { useState } from "react";

export function useEditEditor() {
  const [isEditing, setIsEditing] = useState(false);
  const onCancelEdit = () => setIsEditing(false);
  const onEdit = () => setIsEditing(true);

  return {
    onEdit,
    isEditing,
    setIsEditing,
    onCancelEdit,
  };
}
