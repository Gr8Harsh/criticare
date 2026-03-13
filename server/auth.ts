import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { type User } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends import("@shared/schema").User {}
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
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPLIT_ID || "ipd-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: true,        // 🔥 REQUIRED FOR HTTPS DEPLOY
      httpOnly: true,
      sameSite: "none",    // 🔥 REQUIRED FOR CROSS-SITE COOKIES
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
        console.log("---- LOGIN ATTEMPT ----");
        console.log("Email entered:", email);
        console.log("Password entered:", password);

        const user = await storage.getUserByEmail(email);

        console.log("User from DB:", user);

        if (!user) {
          console.log("User NOT found");
          return done(null, false);
        }

        console.log("Stored password:", user.password);

        const isValid = await comparePasswords(password, user.password);

        console.log("Password match result:", isValid);

        if (!isValid) {
          console.log("Password did NOT match");
          return done(null, false);
        }

        console.log("Login success");
        return done(null, user);
      } catch (err) {
        console.log("ERROR:", err);
        return done(err);
      }
    }),
  );
  passport.serializeUser((user, done) => done(null, user.id));

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Seed demo users if not exists
  (async () => {
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