import { waitUntil } from "cloudflare:workers";
import { dash, sentinel } from "@better-auth/infra";
import { passkey } from "@better-auth/passkey";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import {
  admin,
  captcha,
  emailOTP,
  haveIBeenPwned,
  jwt,
  lastLoginMethod,
  openAPI,
  twoFactor,
  username,
} from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { emailHarmony } from "better-auth-harmony";
import { eq } from "drizzle-orm";
import { getAvatarUrl } from "@/lib/avatar";
import { db } from "@/lib/db";
import * as generatedAuthSchema from "@/lib/db/auth-schema";
import { user as authUser } from "@/lib/db/auth-schema";
import * as schema from "@/lib/db/schema";
import {
  authNotifications,
  EMAIL_OTP_EXPIRATION_SECONDS,
  TWO_FACTOR_OTP_EXPIRATION_MINUTES,
} from "./auth-notifications";

const USERNAME_ADJECTIVES = [
  "amber",
  "brisk",
  "calm",
  "cinder",
  "clear",
  "cloud",
  "cool",
  "crisp",
  "dawn",
  "ember",
  "field",
  "flint",
  "forest",
  "glacier",
  "golden",
  "harbor",
  "hollow",
  "iron",
  "ivory",
  "juniper",
  "lunar",
  "maple",
  "meadow",
  "mist",
  "north",
  "nova",
  "oak",
  "olive",
  "opal",
  "river",
  "silver",
  "solar",
  "stone",
  "summit",
  "timber",
  "velvet",
  "wild",
  "winter",
].sort();

const USERNAME_NOUNS = [
  "badger",
  "brook",
  "cedar",
  "comet",
  "crest",
  "falcon",
  "field",
  "finch",
  "fjord",
  "fox",
  "grove",
  "harbor",
  "hawk",
  "heron",
  "lynx",
  "meadow",
  "otter",
  "owl",
  "panda",
  "pine",
  "quartz",
  "raven",
  "ridge",
  "river",
  "robin",
  "stone",
  "storm",
  "sunrise",
  "thicket",
  "trail",
  "vale",
  "wave",
  "willow",
  "wind",
  "wolf",
  "wren",
].sort();

function randomArrayValue(values: string[]): string {
  return values[Math.floor(Math.random() * values.length)] ?? "user";
}

function generateGenericUsername(): string {
  const adjective = randomArrayValue(USERNAME_ADJECTIVES);
  const noun = randomArrayValue(USERNAME_NOUNS);
  const suffix = Math.floor(Math.random() * 9_000 + 1_000);
  return `${adjective}_${noun}_${suffix}`;
}

async function generateUniqueUsername() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateGenericUsername();
    const existingUser = await db.query.user.findFirst({
      where: eq(authUser.username, candidate),
      columns: { id: true },
    });

    if (!existingUser) {
      return candidate;
    }
  }

  return `user_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export const auth = betterAuth({
  appName: "SoulFire",
  baseURL: "https://soulfiremc.com",
  secret: process.env.BETTER_AUTH_SECRET ?? "",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
      ...generatedAuthSchema,
    },
  }),
  rateLimit: {
    enabled: true,
    storage: "database",
  },
  verification: {
    storeIdentifier: "hashed",
  },
  advanced: {
    ipAddress: {
      ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"],
    },
    database: {
      generateId: "uuid",
    },
    backgroundTasks: {
      handler: waitUntil,
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
      strategy: "jwe",
    },
  },
  experimental: {
    joins: true,
  },
  account: {
    encryptOAuthTokens: true,
    accountLinking: {
      enabled: true,
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const uniqueUsername = await generateUniqueUsername();

          return {
            data: {
              ...user,
              image: getAvatarUrl(user.image, user.email),
              username: user.username ?? uniqueUsername,
              displayUsername: user.displayUsername ?? uniqueUsername,
            },
          };
        },
      },
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    async sendResetPassword({ user, url }): Promise<void> {
      await authNotifications.sendPasswordReset({ user, url });
    },
    autoSignIn: true,
    revokeSessionsOnPasswordReset: true,
  },
  emailVerification: {
    async sendVerificationEmail({ user, url }): Promise<void> {
      await authNotifications.sendEmailVerification({ user, url });
    },
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
  },
  user: {
    changeEmail: {
      enabled: true,
      async sendChangeEmailConfirmation({
        user,
        newEmail,
        url,
      }): Promise<void> {
        await authNotifications.sendChangeEmailConfirmation({
          user,
          newEmail,
          url,
        });
      },
    },
    deleteUser: {
      enabled: true,
      async sendDeleteAccountVerification({ user, url }): Promise<void> {
        await authNotifications.sendDeleteAccountVerification({ user, url });
      },
    },
  },
  plugins: [
    emailHarmony(),
    twoFactor({
      issuer: "SoulFire",
      otpOptions: {
        period: TWO_FACTOR_OTP_EXPIRATION_MINUTES,
        storeOTP: "hashed",
        async sendOTP({ user, otp }): Promise<void> {
          await authNotifications.sendTwoFactorOTP({ user, otp });
        },
      },
    }),
    username(),
    emailOTP({
      expiresIn: EMAIL_OTP_EXPIRATION_SECONDS,
      disableSignUp: true,
      storeOTP: "hashed",
      overrideDefaultEmailVerification: true,
      changeEmail: {
        enabled: true,
        verifyCurrentEmail: true,
      },
      async sendVerificationOTP({ email, otp, type }): Promise<void> {
        await authNotifications.sendEmailOTP({ email, otp, type });
      },
    }),
    passkey(),
    admin(),
    jwt(),
    openAPI(),
    lastLoginMethod({
      storeInDatabase: true,
    }),
    haveIBeenPwned({
      customPasswordCompromisedMessage: "Please choose a more secure password.",
    }),
    captcha({
      provider: "cloudflare-turnstile",
      secretKey: process.env.TURNSTILE_SECRET_KEY ?? "",
    }),
    dash({
      activityTracking: {
        enabled: true,
      },
    }),
    sentinel(),
    tanstackStartCookies(),
  ],
  trustedOrigins: [
    "https://soulfiremc.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ],
});
