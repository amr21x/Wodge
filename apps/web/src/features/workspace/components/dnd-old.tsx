"use client";

import React from "react";

// type Movement =
//   | {
//       type: "channel-channel";
//       from: {
//         teamId: string;
//         folderId: string;
//         channelId: UniqueIdentifier;
//         idx: number;
//       };
//       to: {
//         teamId: string;
//         folderId: string;
//         idx: number;
//       };
//     }
//   | {
//       type: "channel-folder";
//       from: {
//         teamId: string;
//         folderId: string;
//         channelId: UniqueIdentifier;
//         idx: number;
//       };
//       to: {
//         teamId: string;
//         folderId: UniqueIdentifier;
//       };
//     }
//   | {
//       type: "folder-team";
//       from: {
//         teamId: string;
//         folderId: UniqueIdentifier;
//         idx: number;
//       };
//       to: {
//         teamId: UniqueIdentifier;
//       };
//     }
//   | {
//       type: "folder-folder";
//       from: {
//         teamId: string;
//         folderId: UniqueIdentifier;
//         idx: number;
//       };
//       to: {
//         teamId: string;
//         idx: number;
//       };
//     }
//   | {
//       type: "team-team";
//       from: {
//         teamId: UniqueIdentifier;
//         idx: number;
//       };
//       to: {
//         idx: number;
//       };
//     }
//   | {
//       type: "channel-team";
//       from: {
//         teamId: string;
//         channelId: UniqueIdentifier;
//         folderId: string;
//         idx: number;
//       };
//       to: {
//         teamId: UniqueIdentifier;
//       };
//     };

// const teams: Team[] = [
//   {
//     id: "t1",
//     moderators: [],
//     name: "Team 1",
//     folders: [
//       {
//         id: "root-t1",
//         name: "root",
//         editGroups: [],
//         viewGroups: [],
//         channels: [
//           {
//             id: "1c1",
//             name: "Amr 1",
//             editGroups: [],
//             viewGroups: [],
//             avatar: "https://i.imgur.com/7V9b0e3.jpg",
//             type: "text",
//           },
//           {
//             id: "1c11",
//             name: "Maro 2",
//             editGroups: [],
//             viewGroups: [],
//             avatar: "https://i.imgur.com/7V9b0e3.jpg",
//             type: "text",
//           },
//         ],
//       },
//       {
//         id: "1d1",
//         name: "Dir 1",
//         editGroups: [],
//         viewGroups: [],
//         channels: [
//           {
//             id: "1c2",
//             name: "Ali 1",
//             editGroups: [],
//             viewGroups: [],
//             avatar: "https://i.imgur.com/7V9b0e3.jpg",
//             type: "text",
//           },
//         ],
//       },
//       {
//         id: "1d2",
//         name: "Dir 2",
//         editGroups: [],
//         viewGroups: [],
//         channels: [
//           {
//             id: "1c3",
//             name: "Begz 2",
//             editGroups: [],
//             viewGroups: [],
//             avatar: "https://i.imgur.com/7V9b0e3.jpg",
//             type: "text",
//           },
//         ],
//       },
//     ],
//     members: [],
//     createdBy: "xx",
//     tags: [],
//   },
//   {
//     id: "t2",
//     moderators: [],
//     name: "Team 2",
//     folders: [
//       {
//         id: "2d1",
//         name: "Dir 1",
//         editGroups: [],
//         viewGroups: [],
//         channels: [
//           {
//             id: "2c1",
//             name: "Omar 1",
//             editGroups: [],
//             viewGroups: [],
//             avatar: "https://i.imgur.com/7V9b0e3.jpg",
//             type: "text",
//           },
//         ],
//       },
//       {
//         id: "2d2",
//         name: "Dir 2",
//         editGroups: [],
//         viewGroups: [],
//         channels: [
//           {
//             id: "2c2",
//             name: "Masry 2",
//             editGroups: [],
//             viewGroups: [],
//             type: "text",
//             avatar: "https://i.imgur.com/7V9b0e3.jpg",
//           },
//         ],
//       },
//     ],
//     members: [],
//     createdBy: "xx",
//     tags: [],
//   },
//   {
//     id: "t3",
//     name: "Team 3",
//     moderators: [],
//     folders: [
//       {
//         id: "3d1",
//         name: "Dir 1",
//         editGroups: [],
//         viewGroups: [],
//         channels: [
//           {
//             id: "3c1",
//             name: "Channel 1",
//             editGroups: [],
//             viewGroups: [],
//             avatar: "https://i.imgur.com/7V9b0e3.jpg",
//             type: "text",
//           },
//         ],
//       },
//       {
//         id: "3d2",
//         name: "Dir 2",
//         editGroups: [],
//         viewGroups: [],
//         channels: [
//           {
//             id: "3c2",
//             name: "Channel 2",
//             editGroups: [],
//             viewGroups: [],
//             type: "text",
//             avatar: "https://i.imgur.com/7V9b0e3.jpg",
//           },
//         ],
//       },
//     ],
//     members: [],
//     createdBy: "xx",
//     tags: [],
//   },
// ];

export default function Page() {
  return <div>home</div>;
}

// export default function App() {
//   const [items, setItems] = useState(teams);
//   const [activeId, setActiveId] = useState<UniqueIdentifier>();
//   const [activeChannel, setActiveChannel] = useState<Channel>();
//   const setIsDraggingFolder = useSetAtom(isDraggingFolderAtom);
//   const setIsDraggingTeam = useSetAtom(isDraggingTeamAtom);
//   const [undo, setUndo] = useState(false);

//   const sensors = useSensors(
//     useSensor(PointerSensor, {
//       activationConstraint: {
//         tolerance: 5,
//         delay: 250,
//       },
//     }),
//     useSensor(KeyboardSensor, {
//       coordinateGetter: sortableKeyboardCoordinates,
//     }),
//   );

//   function onDragStart(e: DragStartEvent) {
//     setActiveId(e.active.id);

//     // if (e.active.data.current?.type === "team") {
//     //   setIsDraggingTeam(true);
//     // }

//     // if (e.active.data.current?.type === "folder") {
//     //   setIsDraggingFolder(true);
//     // }

//     // if (e.active.data.current?.type === "channel") {
//     //   const team = items.find((t) => t.id === e.active.data.current?.teamId);
//     //   const dir = team?.dirs.find(
//     //     (d) => d.id === e.active.data.current?.folderId,
//     //   );
//     //   const channel = dir?.channels.find((c) => c.id === e.active.id);

//     //   setActiveChannel(channel);
//     // }
//   }

//   function onDragEnd(event: DragEndEvent) {
//     const { active, over, delta } = event;

//     if (!over) {
//       setIsDraggingFolder(false);
//       setIsDraggingTeam(false);
//       return;
//     }

//     const activeType = active.data.current?.type;
//     const overType = over.data.current?.type;
//     const activeIdx = active.data.current?.idx;
//     const overIdx = over.data.current?.idx;
//     const activeTeamId = active.data.current?.teamId as string;
//     const overTeamId = over.data.current?.teamId as string;

//     if (!activeType || !overType) {
//       setIsDraggingFolder(false);
//       setIsDraggingTeam(false);
//       return;
//     }

//     if (activeType === "channel" && overType === "channel") {
//       const activeFolderId = active.data.current?.folderId as string;
//       const overFolderId = over.data.current?.folderId as string;

//       console.log({
//         type: "channel-channel",
//         from: {
//           teamId: activeTeamId,
//           folderId: activeFolderId,
//           channelId: active.id,
//           idx: activeIdx,
//         },
//         to: {
//           teamId: overTeamId,
//           folderId: overFolderId,
//           idx: activeFolderId === overFolderId ? overIdx : overIdx + 1,
//         },
//       } satisfies Movement);

//       // const newItems = produce(items, (draft) => {
//       //   if (activeFolderId === overFolderId) {
//       //     const team = draft.find((t) => t.id === activeTeamId);
//       //     if (team) {
//       //       const dir = team.folders.find((d) => d.id === overFolderId);
//       //       if (dir) {
//       //         const channels = dir.channels;
//       //         const oldIndex = channels.findIndex((c) => c.id === active.id);
//       //         const newIndex = channels.findIndex((c) => c.id === over.id);
//       //         dir.channels = arrayMove(channels, oldIndex, newIndex);
//       //       }
//       //     }
//       //   } else {
//       //     const activeTeam = draft.find((t) => t.id === activeTeamId);
//       //     const overTeam = draft.find((t) => t.id === overTeamId);

//       //     if (activeTeam && overTeam) {
//       //       const activeDir = activeTeam.folders.find(
//       //         (d) => d.id === activeFolderId,
//       //       );
//       //       const overDir = overTeam.folders.find((d) => d.id === overFolderId);
//       //       if (activeDir && overDir) {
//       //         const channel = activeDir.channels.find(
//       //           (c) => c.id === active.id,
//       //         );
//       //         if (channel) {
//       //           activeDir.channels = activeDir.channels.filter(
//       //             (c) => c.id !== active.id,
//       //           );
//       //           overDir.channels.push(channel);
//       //         }
//       //       }
//       //     }
//       //   }

//       //   return draft;
//       // });

//       // setItems(newItems);
//     }

//     if (activeType === "channel" && overType === "folder") {
//       const activeFolderId = active.data.current?.folderId as string;
//       const overFolderId = over.id;
//       // const activeFolderId = active.data.current?.folderId;
//       // const newItems = produce(items, (draft) => {
//       //   const curTeam = draft.find((t) => t.id === activeTeamId);
//       //   const overTeam = draft.find((t) => t.id === overTeamId);
//       //   const curDir = curTeam?.folders.find((d) => d.id === activeFolderId);
//       //   const overDir = overTeam?.folders.find((d) => d.id === over.id);
//       //   if (curDir && overDir && activeChannel) {
//       //     curDir.channels = curDir.channels.filter(
//       //       (c) => c.id !== activeChannel.id,
//       //     );
//       //     overDir.channels.push(activeChannel);
//       //   }
//       //   return draft;
//       // });
//       // setItems(newItems);
//       console.log({
//         type: "channel-folder",
//         from: {
//           teamId: activeTeamId,
//           folderId: activeFolderId,
//           channelId: active.id,
//           idx: activeIdx,
//         },
//         to: {
//           teamId: overTeamId,
//           folderId: overFolderId,
//         },
//       } satisfies Movement);
//     }

//     if (activeType === "folder" && overType === "team") {
//       console.log({
//         type: "folder-team",
//         from: {
//           teamId: activeTeamId,
//           folderId: active.id,
//           idx: activeIdx,
//         },
//         to: {
//           teamId: over.id,
//         },
//       } satisfies Movement);
//       // const newItems = produce(items, (draft) => {
//       //   const curTeam = draft.find((t) => t.id === activeTeamId);
//       //   const overTeam = draft.find((t) => t.id === over.id);
//       //   if (curTeam && overTeam) {
//       //     const dir = curTeam.folders.find((d) => d.id === active.id);
//       //     if (dir) {
//       //       curTeam.folders = curTeam.folders.filter((d) => d.id !== active.id);
//       //       overTeam.folders.unshift(dir);
//       //     }
//       //   }
//       // });
//       // setItems(newItems);
//     }

//     if (activeType === "folder" && overType === "folder") {
//       console.log({
//         type: "folder-folder",
//         from: {
//           teamId: activeTeamId,
//           folderId: active.id,
//           idx: activeIdx,
//         },
//         to: {
//           teamId: overTeamId,
//           idx: activeTeamId === overTeamId ? overIdx : overIdx + 1,
//         },
//       } satisfies Movement);
//       // const oldIndex

//       // setItems

//       // const newItems = produce(items, (draft) => {
//       //   const team = draft.find((t) => t.id === activeTeamId);
//       //   if (team) {
//       //     const oldIndex = team.folders.findIndex((d) => d.id === active.id);
//       //     const newIndex = team.folders.findIndex((d) => d.id === over.id);
//       //     team.folders = arrayMove(team.folders, oldIndex, newIndex);
//       //   }
//       // });

//       // setItems(newItems);
//     }

//     if (activeType === "team" && overType === "team") {
//       console.log({
//         type: "team-team",
//         from: {
//           teamId: activeTeamId,
//           idx: activeIdx,
//         },
//         to: {
//           idx: overIdx,
//         },
//       } satisfies Movement);
//     }

//     // Put channel in root directory for dropping in team
//     if (activeType === "channel" && overType === "team") {
//       const activeFolderId = active.data.current?.folderId as string;

//       console.log({
//         type: "channel-team",
//         from: {
//           teamId: activeTeamId,
//           channelId: active.id,
//           folderId: activeFolderId,
//           idx: activeIdx,
//         },
//         to: {
//           teamId: over.id,
//         },
//       } satisfies Movement);
//       // const activeFolderId = active.data.current?.folderId;
//       // const newItems = produce(items, (draft) => {
//       //   const curTeam = draft.find((t) => t.id === activeTeamId);
//       //   const overTeam = draft.find((t) => t.id === over.id);
//       //   const curDir = curTeam?.folders.find((d) => d.id === activeFolderId);
//       //   const overDir = overTeam?.folders.find(
//       //     (d) => d.id === "root-" + over.id,
//       //   );
//       //   if (curDir && overDir && activeChannel) {
//       //     curDir.channels = curDir.channels.filter(
//       //       (c) => c.id !== activeChannel.id,
//       //     );
//       //     overDir.channels.push(activeChannel);
//       //   }
//       //   return draft;
//       // });
//       // setItems(newItems);
//     }

//     // setIsDraggingFolder(false);
//     // setIsDraggingTeam(false);
//   }

//   return (
//     <DndContext
//       sensors={sensors}
//       collisionDetection={closestCenter}
//       onDragStart={onDragStart}
//       onDragEnd={onDragEnd}
//       // onDragOver={onDragOver}
//       onDragCancel={() => setActiveId(undefined)}
//       // onDragMove={(e) => console.log(e, "move")}
//     >
//       <div className="flex w-72 flex-col gap-2 bg-yellow-300 px-2 py-2">
//         <Teamspaces teams={items} />
//       </div>

//       <DragOverlay>
//         {activeId ? (
//           <SidebarItem label="Test" noIcon className="bg-accent opacity-50">
//             {activeId}
//           </SidebarItem>
//         ) : null}
//       </DragOverlay>
//     </DndContext>
//   );
// }
