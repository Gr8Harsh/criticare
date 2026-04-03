import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { db } from "./db";
import { roomTypes, doctors } from "@shared/schema";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function seedProductionData() {
  // Seed room types if none exist
  let existingRooms = await db.select().from(roomTypes);
  if (existingRooms.length === 0) {
    const roomData = [
      { name: "General Ward", dailyCharge: 500 },
      { name: "Semi-Private Room", dailyCharge: 1200 },
      { name: "Private Room", dailyCharge: 2500 },
      { name: "ICU", dailyCharge: 5000 },
      { name: "Deluxe Suite", dailyCharge: 4000 },
    ];
    for (const room of roomData) {
      await storage.createRoomType(room);
    }
    console.log("Seeded room types");
    existingRooms = await db.select().from(roomTypes);
  }

  // Migrate: apply charge formula (nursing=1/5, rmo=1/5, visit=2/5 of daily charge)
  // to any room type that still has all charges at 0
  const roomsNeedingCharges = existingRooms.filter(
    (r) => (r.nursingCharge ?? 0) === 0 && (r.rmoCharge ?? 0) === 0 && (r.visitCharge ?? 0) === 0
  );
  for (const room of roomsNeedingCharges) {
    const nursing = Math.round(room.dailyCharge / 5);
    const rmo = Math.round(room.dailyCharge / 5);
    const visit = Math.round((room.dailyCharge * 2) / 5);
    await db.update(roomTypes)
      .set({ nursingCharge: nursing, rmoCharge: rmo, visitCharge: visit })
      .where(eq(roomTypes.id, room.id));
  }
  if (roomsNeedingCharges.length > 0) {
    console.log(`Applied charge formula to ${roomsNeedingCharges.length} room type(s)`);
  }

  // Seed doctor users and profiles
  const existingDoctors = await db.select().from(doctors);
  if (existingDoctors.length === 0) {
    const doctorData = [
      {
        user: { name: "Dr. John Smith", email: "doctor@test.com", password: "password123", role: "DOCTOR" },
        profile: { name: "Dr. John Smith", specialization: "General Medicine", visitCharge: 400, isSurgeon: false, isAssistantSurgeon: false, isOtAssistant: false },
      },
      {
        user: { name: "Dr. Priya Sharma", email: "priya.sharma@hospital.com", password: "doctor123", role: "DOCTOR" },
        profile: { name: "Dr. Priya Sharma", specialization: "Cardiology", visitCharge: 500, isSurgeon: false, isAssistantSurgeon: false, isOtAssistant: false },
      },
      {
        user: { name: "Dr. Rahul Mehta", email: "rahul.mehta@hospital.com", password: "doctor123", role: "DOCTOR" },
        profile: { name: "Dr. Rahul Mehta", specialization: "Orthopedics", visitCharge: 600, isSurgeon: true, isAssistantSurgeon: false, isOtAssistant: false },
      },
      {
        user: { name: "Dr. Anjali Gupta", email: "anjali.gupta@hospital.com", password: "doctor123", role: "DOCTOR" },
        profile: { name: "Dr. Anjali Gupta", specialization: "Gynecology", visitCharge: 450, isSurgeon: true, isAssistantSurgeon: false, isOtAssistant: false },
      },
      {
        user: { name: "Dr. Vikram Patel", email: "vikram.patel@hospital.com", password: "doctor123", role: "DOCTOR" },
        profile: { name: "Dr. Vikram Patel", specialization: "General Surgery", visitCharge: 700, isSurgeon: true, isAssistantSurgeon: false, isOtAssistant: false },
      },
    ];

    for (const { user, profile } of doctorData) {
      let existingUser = await storage.getUserByEmail(user.email);
      if (!existingUser) {
        const hashed = await hashPassword(user.password);
        existingUser = await storage.createUser({ ...user, password: hashed });
      }
      await storage.createDoctor({ ...profile, userId: existingUser.id });
    }
    console.log("Seeded doctors");
  }
}
