import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/requireAdmin";
import { logAdminAction } from "@/lib/auditLog";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { errorResponse } from "@/lib/apiResponse";

export async function POST(req: Request) {
  try {
    const adminResult = await requireAdmin(req, { limit: 10 });
    if (adminResult instanceof NextResponse) return adminResult;
    const session = adminResult;

    await dbConnect();

    let body: { name?: unknown; email?: unknown; password?: unknown; role?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body." }, { status: 400 });
    }

    const { name, email, password, role } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const validRole = role === "admin" ? "admin" : "customer";
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password as string, 12);

    const user = await User.create({
      name: (typeof name === "string" ? name : "").trim() || undefined,
      email: normalizedEmail,
      password: hashedPassword,
      role: validRole,
    });

    // Audit log
    logAdminAction({
      adminId: session.user.id,
      adminEmail: session.user.email,
      action: "USER_CREATED",
      targetType: "user",
      targetId: user._id.toString(),
      metadata: {
        createdEmail: normalizedEmail,
        createdRole: validRole,
      },
      req,
    });

    return NextResponse.json({
      user: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
