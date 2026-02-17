"use server";

import { revalidatePath } from "next/cache";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { checkAdmin } from "@/app/admin/actions";

export async function promoteToAdmin(formData: FormData) {
  await checkAdmin();
  await dbConnect();

  const userId = formData.get("userId") as string;
  if (!userId) throw new Error("User ID required.");

  const user = await User.findById(userId).select("email role");
  if (!user) throw new Error("User not found.");

  if (user.role === "admin") throw new Error("User is already an admin.");

  await User.findByIdAndUpdate(userId, { role: "admin" });
  revalidatePath("/admin/team");
}

export async function revokeAdmin(formData: FormData) {
  const session = await checkAdmin();
  await dbConnect();

  const userId = formData.get("userId") as string;
  if (!userId) throw new Error("User ID required.");

  const user = await User.findById(userId).select("email role");
  if (!user) throw new Error("User not found.");

  // Prevent revoking the primary env-based admin
  if (user.email === process.env.ADMIN_EMAIL) {
    throw new Error("Cannot revoke access from the primary admin.");
  }

  // Prevent self-demotion
  if (session.user?.id === userId) {
    throw new Error("You cannot revoke your own admin access.");
  }

  await User.findByIdAndUpdate(userId, { role: "customer" });
  revalidatePath("/admin/team");
}
