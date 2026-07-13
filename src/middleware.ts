import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isAuthed = !!req.auth;
  const { pathname } = req.nextUrl;
  const isLocal = req.cookies.get("offcourse-mode")?.value === "local";
  const isPublic =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/offline" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/api/auth");
  // Local-only users have no session but a valid cookie — let them through.
  if (!isAuthed && !isLocal && !isPublic) {
    const url = new URL("/login", req.nextUrl.origin);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
