import { JoinWorkspaceForm } from "./join-workspace-form";
import { CreateWorkspaceForm } from "./create-workspace-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AddWorkspaceDialog() {
  return (
    <Dialog>
      <DialogTrigger className="mt-6 w-full" asChild>
        <Button className="w-full">Add a Workspace</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <Tabs defaultValue="join" className="w-full">
          <DialogHeader>
            <TabsList className="grid w-full grid-cols-2 transition-all">
              <TabsTrigger value="join">Join a Workspace</TabsTrigger>
              <TabsTrigger value="create">Create a Workspace</TabsTrigger>
            </TabsList>

            <TabsContent value="join">
              <JoinWorkspaceForm />
            </TabsContent>
            <TabsContent value="create">
              <CreateWorkspaceForm />
            </TabsContent>
          </DialogHeader>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
