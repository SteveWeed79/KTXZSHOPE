"use server";

import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function signUp(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    // 1. Structural Validation (Failsafe)
    if (password !== confirmPassword) {
      return { error: "PASSWORDS DO NOT MATCH." };
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*]{8,}$/;
    if (!passwordRegex.test(password)) {
      return { error: "SECURITY CRITERIA NOT MET." };
    }

    // 2. Database Operations
    await dbConnect();

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return { error: "IDENTITY ALREADY REGISTERED." };
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "customer"
    });

    return { success: true };
  } catch (e) {
    console.error("SIGNUP_ERROR:", e);
    return { error: "SYSTEM FAILURE. TRY AGAIN LATER." };
  }
}