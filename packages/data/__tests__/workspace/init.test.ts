// import {
//   afterEach,
//   beforeAll,
//   beforeEach,
//   describe,
//   expect,
//   test,
//   vi,
// } from "vitest";
// import { workspaceMutators } from "../../models/workspace/workspace-mutators";
// import { ReadTransaction, Replicache, TEST_LICENSE_KEY } from "replicache";

// import {
//   WorkspaceMembers,
//   Workspace,
//   defaultWorkspaceStructure,
// } from "../../schemas/workspace.schema";
// import { UserId } from "../tests";
// import { nanoid } from "nanoid";
// import { ID_LENGTH } from "@wodge/domain/constants";
// import {
//   makeWorkspaceKey,
//   makeWorkspaceMembersKey,
//   makeWorkspaceStructureKey,
// } from "../../lib/keys";

// const rep = new Replicache({
//   licenseKey: TEST_LICENSE_KEY,
//   name: "test-user",
//   pullURL: undefined,
//   pushURL: undefined,
//   mutators: workspaceMutators,
// });

// describe("Workspace initialization", () => {
//   beforeEach(() => {
//     vi.useFakeTimers();
//   });

//   afterEach(() => {
//     vi.useRealTimers();
//   });

//   test("Workspace initialization", async () => {
//     const newWorkspace: Workspace = {
//       id: nanoid(ID_LENGTH),
//       name: "Test Workspace",
//       owner: UserId,
//       environment: "local",
//       createdAt: new Date().toISOString(),
//       avatar: "",
//     };

//     const date = new Date();
//     vi.setSystemTime(date);

//     await rep.mutate.initWorkspace(newWorkspace);

//     const workspace = await rep.query((tx: ReadTransaction) =>
//       tx.get<Workspace>(makeWorkspaceKey())
//     );

//     expect(workspace).toEqual(newWorkspace);

//     const members = await rep.query((tx: ReadTransaction) =>
//       tx.get<WorkspaceMembers>(makeWorkspaceMembersKey())
//     );

//     expect(members?.members).toEqual([
//       {
//         id: UserId,
//         joinInfo: {
//           created_by: "",
//           joined_at: date.toISOString(),
//           method: "owner",
//           token: "",
//         },
//         data: JSON.parse(localStorage.getItem("user")!),
//       },
//     ]);

//     const structure = await rep.query((tx: ReadTransaction) =>
//       tx.get(makeWorkspaceStructureKey())
//     );

//     expect(structure).toEqual(defaultWorkspaceStructure());
//   });
// });
