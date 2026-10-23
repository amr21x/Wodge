import { z } from "zod";

const identifier = z
  .string()
  .min(1)
  .max(256)
  .refine(
    (value) => !value.includes("\0") && !/[/\\]/.test(value),
    "Invalid identifier",
  );
export const FileParams = z.object({
  teamId: identifier,
  channelId: identifier.optional(),
});
export const AvatarKey = z
  .string()
  .regex(/^[\w=-]{1,80}$/, "Invalid avatar key");
export const StoragePath = z
  .string()
  .min(1)
  .max(1024)
  .refine(
    (value) =>
      !value.includes("\0") &&
      !value.includes("\\") &&
      value
        .split("/")
        .every(
          (segment) => segment !== ".." && segment !== "." && segment !== "",
        ),
    "Invalid file path",
  );
export const EncodedStoragePath = z
  .string()
  .transform((value, context) => {
    try {
      return atob(value);
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid encoded file path",
      });
      return z.NEVER;
    }
  })
  .pipe(StoragePath);
