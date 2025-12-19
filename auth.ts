import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) {
          return null;
        }

        // Support verification code login
        if (credentials.code) {
          // Check if this is a temporary verification token
          const tempToken = await prisma.verificationToken.findFirst({
            where: {
              identifier: `temp_${credentials.email}`,
              token: credentials.code as string,
              expires: {
                gt: new Date(),
              },
            },
          });

          if (tempToken) {
            // Valid temporary token, allow login and clean up
            await prisma.verificationToken.deleteMany({
              where: {
                identifier: `temp_${credentials.email}`,
                token: credentials.code as string,
              },
            });
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
            };
          }
          // Invalid or expired token
          return null;
        }

        // Password login
        if (!credentials.password || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Give new users 2 initial credits (for OAuth providers like Google)
      if (user.email && account?.provider === 'google') {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { credits: true, createdAt: true },
        });
        
        // If user has 0 credits and was created recently (within last minute), give initial credits
        if (dbUser && dbUser.credits === 0) {
          const isNewUser = new Date().getTime() - dbUser.createdAt.getTime() < 60000;
          if (isNewUser) {
            await prisma.user.update({
              where: { email: user.email },
              data: { credits: 2 },
            });
          }
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});

