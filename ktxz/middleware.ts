import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const userEmail = req.auth?.user?.email;
  const adminEmail = process.env.ADMIN_EMAIL;
  
  console.log("--- DEBUG AUTH ---");
  console.log("Logged in as:", userEmail);
  console.log("Target Admin:", adminEmail);
  console.log("Match:", userEmail === adminEmail);

  const isAdmin = userEmail === adminEmail;
  const isAdminPage = req.nextUrl.pathname.startsWith("/admin");

  if (isAdminPage && !isAdmin) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};