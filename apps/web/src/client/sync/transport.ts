import { makeWorkspaceMembersKey } from "@wodge/domain/sync/index";
import type {
  PullRequest,
  PullerResult,
  PushRequest,
  PusherResult,
} from "replicache";
import { queryClient } from "../query";
import { failureMessage, requireOk, RequestFailure } from "../errors";
import { refreshPermissions } from "../permissions";
import type { ChannelsTypes } from "@wodge/domain/channels/index";

type SyncDomain = "user" | "workspace" | ChannelsTypes;
export const syncStatusEvent = "wodge:sync-status";

function reportSync(key: string, message: string | null) {
  if (typeof window !== "undefined")
    window.dispatchEvent(
      new CustomEvent(syncStatusEvent, { detail: { key, message } }),
    );
}

export function replicacheWrapper(
  mode: "pull",
  domain: SyncDomain,
  id: string,
  headers?: Record<string, string>,
): (body: PullRequest, requestID: string) => Promise<PullerResult>;
export function replicacheWrapper(
  mode: "push",
  domain: SyncDomain,
  id: string,
  headers?: Record<string, string>,
): (body: PushRequest, requestID: string) => Promise<PusherResult>;
export function replicacheWrapper(
  mode: "push" | "pull",
  domain: SyncDomain,
  id: string,
  headers?: Record<string, string>,
) {
  const key = `${domain}:${id}:${mode}`;
  const request = async (requestBody: PullRequest | PushRequest) => {
    const response = await fetch(`/api/replicache/${mode}`, {
      method: "POST",
      credentials: "include",
      body: JSON.stringify(requestBody),
      headers: { ...headers, "content-type": "application/json", domain, id },
    });
    await requireOk(response);
    return response;
  };
  const failed = (error: unknown) => {
    const message = failureMessage(
      error,
      "Synchronization failed. Pending edits have not been confirmed by the server.",
    );
    reportSync(key, message);
    return {
      httpRequestInfo: {
        httpStatusCode: error instanceof RequestFailure ? error.status : 0,
        errorMessage: message,
      },
    };
  };
  if (mode === "push")
    return async (
      body: PushRequest,
      _requestID: string,
    ): Promise<PusherResult> => {
      try {
        const response = await request(body);
        // Replicache supports empty successful pushes and JSON protocol errors.
        const text = await response.text();
        let protocolResponse: PusherResult["response"];
        if (text) {
          const value: unknown = JSON.parse(text);
          if (value && typeof value === "object" && "error" in value) {
            if (value.error === "ClientStateNotFound")
              protocolResponse = { error: "ClientStateNotFound" };
            if (
              value.error === "VersionNotSupported" &&
              "versionType" in value &&
              (value.versionType === "push" || value.versionType === "schema")
            )
              protocolResponse = {
                error: "VersionNotSupported",
                versionType: value.versionType,
              };
          }
        }
        reportSync(key, null);
        return {
          httpRequestInfo: {
            httpStatusCode: response.status,
            errorMessage: "",
          },
          ...(protocolResponse && { response: protocolResponse }),
        };
      } catch (error) {
        return failed(error);
      }
    };
  return async (
    body: PullRequest,
    _requestID: string,
  ): Promise<PullerResult> => {
    try {
      const result = await request(body);
      const response: PullerResult["response"] = await result.json();
      if (
        domain === "workspace" &&
        response &&
        "patch" in response &&
        response.patch.some(
          (patch) => "key" in patch && patch.key === makeWorkspaceMembersKey(),
        )
      ) {
        void queryClient.invalidateQueries({ queryKey: [id, "members"] });
        refreshPermissions();
      }
      reportSync(key, null);
      const httpRequestInfo = {
        httpStatusCode: result.status,
        errorMessage: "",
      };
      if (response && "lastMutationIDChanges" in response)
        return { httpRequestInfo, response };
      if (response && "lastMutationID" in response)
        return { httpRequestInfo, response };
      if (!response || "error" in response)
        return { httpRequestInfo, response };
      throw new Error("Invalid synchronization response");
    } catch (error) {
      return failed(error);
    }
  };
}
