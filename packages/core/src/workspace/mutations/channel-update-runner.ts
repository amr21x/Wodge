import { Channel } from "@wodge/domain/channels/index";

export type UpdateableTeamFields = Omit<Channel, "id">;
