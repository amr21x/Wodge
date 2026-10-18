import type { ApplicationFailure } from "@wodge/domain/errors";

export class ApplicationError<Code extends string = string>
  extends Error
  implements ApplicationFailure<Code>
{
  readonly name = "ApplicationError";

  constructor(
    readonly code: Code,
    message: string,
    readonly details?: ApplicationFailure["details"],
  ) {
    super(message);
  }

  toJSON(): ApplicationFailure<Code> {
    return {
      code: this.code,
      message: this.message,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}
