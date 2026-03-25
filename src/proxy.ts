import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // API routes handle their own auth (return 401), don't redirect them
  if (pathname.startsWith("/api/")) return NextResponse.next();

  // Redirect unauthenticated users to login for page routes
  if (!req.auth && pathname !== "/login") {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
