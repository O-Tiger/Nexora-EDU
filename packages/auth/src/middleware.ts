import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import type { Role } from "@nexora/db";

const PUBLIC_PATHS = ["/login", "/certificado", "/p/", "/api/auth", "/_next", "/favicon", "/manifest"];

const ROUTE_ROLES: { prefix: string; roles: Role[] }[] = [
  { prefix: "/admin", roles: ["ADMINISTRATOR", "OWNER", "TI_SUPPORT"] },
  { prefix: "/coord", roles: ["ASSISTANT", "ADMINISTRATOR", "OWNER"] },
  { prefix: "/prof", roles: ["PROFESSOR", "ASSISTANT", "ADMINISTRATOR", "OWNER"] },
  { prefix: "/aluno", roles: ["STUDENT", "PROFESSOR", "ASSISTANT", "ADMINISTRATOR", "OWNER"] },
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // getToken lê o cookie httpOnly e verifica a assinatura com NEXTAUTH_SECRET
  // Não instancia providers — compatível com Edge runtime
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET não definido");

  const token = await getToken({ req, secret });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = token.role as Role | undefined;

  for (const route of ROUTE_ROLES) {
    if (pathname.startsWith(route.prefix)) {
      if (!role || !route.roles.includes(role)) {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
      break;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
