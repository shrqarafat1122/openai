import { NextResponse, type NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/auth";

// Routes that never require an app session.
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

// Gateway routes authenticate with their own Bearer sk-... keys (validated
// against Firestore inside the handler), so middleware must let them through.
function isGatewayPath(pathname: string): boolean {
  return pathname.startsWith("/v1/");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isGatewayPath(pathname)) return NextResponse.next();
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = await verifySession(token);

  if (!session) {
    // API calls get a 401; page navigations redirect to /login.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
