/**
 * NextAuth configuration for WorldHuman Studio
 * Handles authentication using World ID
 */

import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';

const config: NextAuthConfig = {
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      const isOnTasks = nextUrl.pathname.startsWith('/tasks');
      const isOnSubmissions = nextUrl.pathname.startsWith('/submissions');
      const isProtected = isOnDashboard || isOnTasks || isOnSubmissions;

      if (isProtected) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      return true;
    },
    async session({ session, token }) {
      if (token?.sub && session?.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/',
    error: '/',
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);