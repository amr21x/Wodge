"use server";
import "server-only";

import { z } from "zod";
import { redirect } from "next/navigation";

import { updateUserById } from "@/lib/data-server";
import { UpdateUserSchema } from "@wodge/data";
import { currentUser } from "@/lib/supabase/current-user";

export async function updateProfile(rawData: z.infer<typeof UpdateUserSchema>) {
  // 1. Authenticate access

  const user = await currentUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // 2. Validate data
  const validatedFields = UpdateUserSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return { error: "Invalid data" };
  }

  const { data } = validatedFields;

  // TODO
  // 3. Check if there is a new profile avatar

  // 4. Update user data
  const res = await updateUserById(user.id, {
    ...data,
    updatedAt: new Date(),
  });

  if (res.user) return { success: true, user: res.user };

  return { error: res.error };
}
