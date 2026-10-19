import { useCurrentResources } from "@/features/workspace/hooks/use-current-resources";
import { File } from "./file";

export function Files({ workspaceId }: { workspaceId: string }) {
  const { files, dirs, curPath } = useCurrentResources();

  return (
    <>
      {files.map((p, i) => (
        <File name={p} key={i} curPath={curPath} wid={workspaceId} />
      ))}
    </>
  );
}
