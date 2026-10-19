/** Missing provider configuration is an unavailable capability, never a successful no-op. */
export class IntegrationUnavailableError extends Error {
  constructor(integration: string) {
    super(`${integration} is not configured`);
    this.name = "IntegrationUnavailableError";
  }
}
