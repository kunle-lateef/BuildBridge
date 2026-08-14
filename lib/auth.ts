import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { db } from '@/lib/db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  // Required by the Credentials provider — a hard library constraint, not a
  // choice made here. See User.sessionVersion in prisma/schema.prisma for
  // how server-side revocation is still achieved without a Session table.
  session: { strategy: 'jwt' },
  // Custom, BuildBridge-styled page instead of Auth.js's default
  // auto-generated one — see app/(marketing)/sign-in/.
  pages: { signIn: '/sign-in' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === 'string' ? credentials.email : undefined;
        const password =
          typeof credentials?.password === 'string' ? credentials.password : undefined;

        if (!email || !password) {
          return null;
        }

        const user = await db.user.findUnique({ where: { email } });

        if (!user) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.sessionVersion = (user as { sessionVersion: number }).sessionVersion;
        return token;
      }

      if (typeof token.userId !== 'string') {
        return null;
      }

      // Re-checked against the DB on every session read so an incremented
      // sessionVersion (forced sign-out) invalidates this token immediately,
      // even though it hasn't expired — see prisma/schema.prisma.
      const currentUser = await db.user.findUnique({
        where: { id: token.userId },
        select: { sessionVersion: true },
      });

      if (!currentUser || currentUser.sessionVersion !== token.sessionVersion) {
        return null;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.userId === 'string') {
        session.user.id = token.userId;
      }
      return session;
    },
  },
});
