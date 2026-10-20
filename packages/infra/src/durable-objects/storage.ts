/** Read-only access for one-time imports from legacy Durable Object KV records. */
export interface LegacyRecordStorage {
  get<T = unknown>(key: string): Promise<T | undefined>;
  get<T = unknown>(keys: string[]): Promise<Map<string, T>>;
}
