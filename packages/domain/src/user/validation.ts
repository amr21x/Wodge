import { z } from "zod";

/** Application profile validation; displayName/avatar map to Better Auth's name/image. */
export const UserSchema = z.object({
  id: z.string(),
  username: z
    .string({
      required_error: "Username is required",
    })
    .trim()
    .max(24, "Username must be between 3 and 24 characters.")
    .min(3, "Username must be between 3 and 24 characters.")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Only letters, numbers, dashes, and underscores.",
    ),
  displayName: z
    .string({
      required_error: "Display name is required",
    })
    .max(70, "Display name is too long")
    .min(1, "Display name is required"),
  avatar: z.optional(z.string().url()).or(z.literal("")),
  email: z.string().email(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * User schema for updating user info
 * This is a subset of the UserSchema that only allows updating the avatar, username, and display name
 */
export const UpdateUserSchema = UserSchema.pick({
  avatar: true,
  username: true,
  displayName: true,
});

/**
 * Schema for the user object that is stored in the local storage
 */
export const PublicUserSchema = UserSchema.pick({
  id: true,
  avatar: true,
  username: true,
  displayName: true,
  email: true,
});
