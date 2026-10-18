export interface CallTokens {
  issue(input: {
    room: string;
    identity?: string;
    name: string;
    ttl: string;
    canPublish: boolean;
    canSubscribe: boolean;
  }): Promise<string>;
}
