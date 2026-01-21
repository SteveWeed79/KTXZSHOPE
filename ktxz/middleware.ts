import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const userEmail = req.auth?.user?.email;
  const adminEmail = process.env.ADMIN_EMAIL;
  
  const isAdminPage = req.nextUrl.pathname.startsWith("/admin");

  // If trying to access admin and not the admin user, kick them to home
  if (isAdminPage && userEmail !== adminEmail) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: ["/admin/:path*", "/profile/:path*"],
};