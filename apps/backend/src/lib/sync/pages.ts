import { PageService } from "@wodge/core/pages/services/page";
import { inject, injectable } from "tsyringe";
import { WorkspaceGateway } from "../../gateways/workspace";
import type PageServer from "../../servers/page";
import type { RequestActor } from "../../types/actor";
import { dispatchPageMutation } from "./mutations/pages";
import { createPagePatch } from "./patches/pages";
import type { RunnerParams } from "./replicache";

@injectable()
export class PageSync {
  constructor(
    @inject("page") private readonly party: PageServer,
    @inject(PageService) private readonly service: PageService,
    @inject(WorkspaceGateway)
    private readonly workspaceGateway: WorkspaceGateway,
  ) {}
  get storage() {
    return this.party.ctx.storage;
  }
  get versions() {
    return this.party.versions;
  }
  async run(params: RunnerParams, actor: RequestActor) {
    await dispatchPageMutation(this.service, params, actor);
  }
  patch = (userId: string) => createPagePatch(this.party, userId);
  notify = (workspaceId: string) =>
    this.workspaceGateway.notifyChannel(workspaceId, this.party.name);
}
