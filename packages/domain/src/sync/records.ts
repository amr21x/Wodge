export interface VersionedRecord<T> {
  data: T;
  lastModifiedVersion: number;
  deleted: boolean;
}
