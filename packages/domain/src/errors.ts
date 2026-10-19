export interface ApplicationFailure<Code extends string = string> {
  code: Code;
  message: string;
  details?: Readonly<Record<string, string | number | boolean>>;
}
