"use server";

import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import crypto from "crypto";
import { Resend } from "resend";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * 1. REQUEST RESET ACTION
 * Sends the branded email with the secure token
 */
export async function requestPasswordReset(formData: FormData) {
  await dbConnect();
  const email = formData.get("email") as string;

  const user = await User.findOne({ email: email.toLowerCase() });
  
  // Security: Always return success to prevent account mining
  if (!user) return { success: true };

  const token = crypto.randomBytes(32).toString("hex");
  user.resetPasswordToken = token;
  user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
  await user.save();

  const resetLink = `${process.env.NEXTAUTH_URL}/reset-password/${token}`;

  try {
    await resend.emails.send({
      from: "KTXZ SHOP <onboarding@resend.dev>",
      to: email,
      subject: "RECOVER YOUR ACCESS | KTXZ",
      html: `
        <div style="font-family: sans-serif; background: #000; color: #fff; padding: 40px; border-radius: 20px; border: 1px solid #333;">
          <h1 style="letter-spacing: -2px; font-weight: 900; color: #fff; margin: 0;">KTXZ <span style="color: #ff0000;">SYSTEMS</span></h1>
          <p style="color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px;">Security Protocol: Password Reset</p>
          <hr style="border: 0; border-top: 1px solid #222; margin: 20px 0;" />
          <p style="font-size: 14px; line-height: 1.6;">A password reset was initiated for your operative account. Click the button below to establish new credentials.</p>
          <a href="${resetLink}" style="display: inline-block; background: #ff0000; color: #fff; padding: 15px 35px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 12px; text-transform: uppercase; margin: 20px 0;">Authorize New Password</a>
          <p style="font-size: 10px; color: #444; margin-top: 20px;">This link expires in 60 minutes. If you did not request this, secure your account immediately.</p>
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Email Error:", error);
    return { error: "Failed to dispatch email." };
  }
}

/**
 * 2. RESET PASSWORD ACTION
 * Validates token and updates the DB
 */
export async function resetPassword(formData: FormData) {
  await dbConnect();
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;
  const confirm = formData.get("confirmPassword") as string;

  if (password !== confirm) throw new Error("Passwords do not match");

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) throw new Error("Invalid or expired token.");

  user.password = await bcrypt.hash(password, 12);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  
  await user.save();

  // Redirect to login with the success toast trigger
  redirect("/login?success=password-updated");
}