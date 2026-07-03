import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isAuthed = !!req.auth;
  const { pathname } = req.nextUrl;
  const isPublic =
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/api/auth");
  if (!isAuthed && !isPublic) {
    const url = new URL("/login", req.nextUrl.origin);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
