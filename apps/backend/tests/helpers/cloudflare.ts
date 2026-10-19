// Node tests use a minimal Durable Object host. Runtime integration tests use workerd.
export class DurableObject {
  constructor(
    readonly ctx: DurableObjectState,
    readonly env: unknown,
  ) {}
}

export const env = {};
