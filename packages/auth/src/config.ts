import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verify } from "argon2";
import { getUserByEmail } from "@nexora/db/src/queries/users";
import { checkLoginRateLimit } from "./rate-limit";
import type { Role } from "@nexora/db";

/**
 * JWT payload estendido com tenant_id ativo e role do usuário naquele tenant.
 * Sem isso não conseguimos isolar dados no server sem query adicional por request.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      activeTenantId: string;
      role: Role;
      availableTenants: { tenantId: string; role: Role }[];
    };
  }

  interface JWT {
    id: string;
    activeTenantId: string;
    role: Role;
    availableTenants: { tenantId: string; role: Role }[];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
        tenantId: { label: "Tenant", type: "text" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        // Rate limit por IP: 5 tentativas / 15 min
        const ip =
          request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
        const rl = await checkLoginRateLimit(ip);
        if (!rl.success) return null;

        const user = await getUserByEmail(credentials.email as string);
        if (!user) {
          // Mensagem genérica — nunca revelar se o email existe
          return null;
        }

        const passwordValid = await verify(
          user.passwordHash,
          credentials.password as string,
        );
        if (!passwordValid) return null;

        const availableTenants = user.memberships.map((m) => ({
          tenantId: m.tenantId,
          role: m.role,
        }));

        if (availableTenants.length === 0) return null;

        // Tenant ativo: o passado no form, ou o primeiro disponível
        const requestedTenant = credentials.tenantId as string | undefined;
        const activeMembership =
          availableTenants.find((t) => t.tenantId === requestedTenant) ??
          availableTenants[0];

        if (!activeMembership) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          activeTenantId: activeMembership.tenantId,
          role: activeMembership.role,
          availableTenants,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        // Cast necessário pois NextAuth tipifica `user` como AdapterUser
        const u = user as {
          id: string;
          activeTenantId: string;
          role: Role;
          availableTenants: { tenantId: string; role: Role }[];
        };
        token.id = u.id;
        token.activeTenantId = u.activeTenantId;
        token.role = u.role;
        token.availableTenants = u.availableTenants;
      }
      return token;
    },
    session({ session, token }) {
      const t = token as {
        id: string;
        activeTenantId: string;
        role: Role;
        availableTenants: { tenantId: string; role: Role }[];
      };
      session.user.id = t.id;
      session.user.activeTenantId = t.activeTenantId;
      session.user.role = t.role;
      session.user.availableTenants = t.availableTenants;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  // Access token: 8h; refresh via httpOnly cookie é gerenciado pelo NextAuth v5
  jwt: { maxAge: 8 * 60 * 60 },
});
