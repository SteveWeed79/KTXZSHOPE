import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: Request) {
  const adminResult = await requireAdmin(req, { limit: 30, limiter: "generous" });
  if (adminResult instanceof NextResponse) return adminResult;

  await dbConnect();

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");
  const search = searchParams.get("search");

  const filter: Record<string, unknown> = {};
  if (role && (role === "admin" || role === "customer")) {
    filter.role = role;
  }
  if (search) {
    const safeSearch = escapeRegex(search);
    filter.$or = [
      { email: { $regex: safeSearch, $options: "i" } },
      { name: { $regex: safeSearch, $options: "i" } },
    ];
  }

  const users = await User.find(filter)
    .select("name email role image createdAt")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ users });
}
