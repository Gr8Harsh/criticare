import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { type User as SchemaUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SchemaUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const isProduction = process.env.NODE_ENV === "production";
  const sessionSecret = process.env.SESSION_SECRET || process.env.REPLIT_ID;
  const useSecureCookies = process.env.SESSION_SECURE === "true";

  if (isProduction && !sessionSecret) {
    throw new Error("SESSION_SECRET must be set in production");
  }

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret || "ipd-dev-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: useSecureCookies,
      httpOnly: true,
      sameSite: useSecureCookies ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  };
  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);

        if (!user) {
          return done(null, false);
        }

        const isValid = await comparePasswords(password, user.password);

        if (!isValid) {
          return done(null, false);
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );
  passport.serializeUser((user, done) => done(null, user.id));

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(Number(id));
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Seed demo users only for local development unless explicitly enabled.
  (async () => {
    if (isProduction && process.env.ENABLE_DEMO_USERS !== "true") {
      return;
    }

    const demoUsers = [
      {
        email: "admin@test.com",
        name: "Hospital Admin",
        password: "admin123",
        role: "ADMIN"
      },
      {
        email: "manager@test.com",
        name: "Hospital Manager",
        password: "password123",
        role: "MANAGER"
      },
      {
        email: "doctor@test.com",
        name: "Dr. John Smith",
        password: "password123",
        role: "DOCTOR"
      }
    ];

    for (const user of demoUsers) {
      const existing = await storage.getUserByEmail(user.email);
      if (!existing) {
        const hashed = await hashPassword(user.password);
        await storage.createUser({
          name: user.name,
          email: user.email,
          password: hashed,
          role: user.role
        });
        console.log(`USER CREATED: ${user.email} / ${user.password}`);
      }
    }
  })();

  return { hashPassword };
}
