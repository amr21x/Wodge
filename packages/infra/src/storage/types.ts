export interface ObjectLocation {
  Bucket: string;
  Key: string;
}

export interface ObjectStorage {
  createBucket(input: { Bucket: string }): Promise<unknown>;
  putObject(
    input: ObjectLocation & { Body: File; ContentType: string },
  ): Promise<unknown>;
  listObjects(input: {
    Bucket: string;
    Prefix: string;
    ContinuationToken?: string;
  }): Promise<{
    Contents?: { Key?: string; Size?: number }[];
    NextContinuationToken?: string;
  }>;
  headUrl(input: ObjectLocation, expiresIn?: number): Promise<string>;
  downloadUrl(
    input: ObjectLocation & { ResponseContentDisposition?: string },
    expiresIn?: number,
  ): Promise<string>;
  deleteUrl(input: ObjectLocation, expiresIn?: number): Promise<string>;
}
