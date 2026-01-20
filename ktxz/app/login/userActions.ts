"use server";

import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

export async function signUp(formData: FormData) {
  await dbConnect();

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (password !== confirmPassword) throw new Error("Passwords do not match.");

  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*]{8,}$/;
  if (!passwordRegex.test(password)) {
    throw new Error("Password must be at least 8 characters long (1 letter, 1 number).");
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) throw new Error("Email already in use.");

  const hashedPassword = await bcrypt.hash(password, 12);

  await User.create({
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    role: "customer"
  });

  // Redirecting with a specific success parameter
  redirect("/login?success=account-created");
}