import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { createRequestId, REQUEST_ID_HEADER } from "@/lib/request-id";

const PUBLIC_FILE = /\.[^\/]+$/;

export async function middleware(req: NextRequest) {
  const requestId = req.headers.get(REQUEST_ID_HEADER) ?? createRequestId();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);

  const { pathname } = req.nextUrl;

  // Ignore next internals and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const isAuthApi = pathname.startsWith("/api/auth");
  const isHealthApi = pathname === "/api/health";
  const isPublicApiGet = pathname.startsWith("/api/jobs") && req.method === "GET";

  // Dashboard and admin require auth
  const isDashboard = pathname.startsWith("/dashboard");
  const isAdmin = pathname.startsWith("/admin");

  // Any non-GET API (except auth/health) requires auth
  const isWriteApi =
    pathname.startsWith("/api") && req.method !== "GET" && !isAuthApi && !isHealthApi;

  if (isDashboard || isAdmin || (isWriteApi && !isPublicApiGet)) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      const response = NextResponse.redirect(url);
      response.headers.set(REQUEST_ID_HEADER, requestId);
      return response;
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export const config = {
  matcher: ["/((?!.*\..*).*)"],
};
