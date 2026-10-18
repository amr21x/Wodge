import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type GetObjectCommandInput,
  type ListObjectsV2CommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { FetchHttpHandler } from "@smithy/fetch-http-handler";
import type { ServerEnvironment } from "@wodge/env/server";
import type { ObjectStorage } from "@wodge/infra/storage/types";
import { inject, injectable } from "tsyringe";

@injectable()
export class S3ObjectStorage implements ObjectStorage {
  private readonly client: S3Client;
  constructor(@inject("environment") environment: ServerEnvironment) {
    this.client = new S3Client({
      region: "us-east-1",
      endpoint: environment.R2_ENDPOINT,
      credentials: {
        accessKeyId: environment.R2_ACCESS_KEY,
        secretAccessKey: environment.R2_SECRET_KEY,
      },
      requestHandler: new FetchHttpHandler(),
      streamCollector: async (stream) =>
        new Uint8Array(await new Response(stream).arrayBuffer()),
    });
  }

  createBucket(input: { Bucket: string }) {
    return this.client.send(new CreateBucketCommand(input));
  }

  async putObject(input: Parameters<ObjectStorage["putObject"]>[0]) {
    const { Body, ...location } = input;
    const url = await getSignedUrl(
      this.client,
      new PutObjectCommand(location),
      { expiresIn: 300 },
    );
    const response = await fetch(url, {
      method: "PUT",
      body: Body,
      headers: { "content-type": input.ContentType },
    });

    if (!response.ok) {
      throw new Error("Object upload failed");
    }

    await response.body?.cancel();

    return {
      ETag: response.headers.get("etag") ?? undefined,
      $metadata: { httpStatusCode: response.status },
    };
  }

  listObjects(input: ListObjectsV2CommandInput) {
    return this.client.send(new ListObjectsV2Command(input));
  }

  headUrl(input: { Bucket: string; Key: string }, expiresIn = 3600) {
    return getSignedUrl(this.client, new HeadObjectCommand(input), {
      expiresIn,
    });
  }

  downloadUrl(input: GetObjectCommandInput, expiresIn = 3600) {
    return getSignedUrl(this.client, new GetObjectCommand(input), {
      expiresIn,
    });
  }

  deleteUrl(input: { Bucket: string; Key: string }, expiresIn = 3600) {
    return getSignedUrl(this.client, new DeleteObjectCommand(input), {
      expiresIn,
    });
  }

  dispose() {
    this.client.destroy();
  }
}
