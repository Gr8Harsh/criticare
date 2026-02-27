import { db } from "../server/db";
import { users, roomTypes, medicines, doctors, patients, patientDoctors, visits, prescriptions, charges } from "../shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
  console.log("Seeding database...");
  
  const pw = await hashPassword("password123");
  
  // Seed Users
  await db.insert(users).values([
    {
      name: "Admin Manager",
      email: "manager@hospital.com",
      password: pw,
      role: "MANAGER"
    },
    {
      name: "Dr. Smith",
      email: "doctor@hospital.com",
      password: pw,
      role: "DOCTOR"
    }
  ]).onConflictDoNothing();

  // Seed Room Types
  await db.insert(roomTypes).values([
    { name: "General Ward", dailyCharge: 1000 },
    { name: "Semi-Private", dailyCharge: 2500 },
    { name: "Private", dailyCharge: 5000 },
    { name: "ICU", dailyCharge: 10000 }
  ]).onConflictDoNothing();

  // Seed Medicines
  await db.insert(medicines).values([
    { name: "Paracetamol", unitCost: 10 },
    { name: "Amoxicillin", unitCost: 15 },
    { name: "Cough Syrup", unitCost: 50 }
  ]).onConflictDoNothing();

  console.log("Database seeded successfully.");
  process.exit(0);
}

seed().catch(console.error);
