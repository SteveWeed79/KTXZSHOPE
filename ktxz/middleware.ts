// ktxz/middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

function secret() {
  // v5 commonly uses AUTH_SECRET; your repo also references NEXTAUTH_SECRET in env validation.
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin");
  const isProfileRoute = pathname.startsWith("/profile");

  // Everything else is public
  if (!isAdminRoute && !isProfileRoute) return NextResponse.next();

  const token = await getToken({ req, secret: secret() });

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isProfileRoute) return NextResponse.next();

  // /admin/*
  const role = typeof (token as any).role === "string" ? (token as any).role : undefined;

  if (role !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/profile/:path*"],
};
