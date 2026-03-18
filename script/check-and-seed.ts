import { db } from "../server/db";
import { users, roomTypes, doctors } from "../shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function run() {
  const existingUsers = await db.select().from(users);
  const existingRooms = await db.select().from(roomTypes);
  const existingDoctors = await db.select().from(doctors);

  console.log("Existing users:", existingUsers.map(u => ({ id: u.id, email: u.email, role: u.role })));
  console.log("Existing room types:", existingRooms);
  console.log("Existing doctors:", existingDoctors);

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
