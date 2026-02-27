import { db } from "./db";
import { eq } from "drizzle-orm";
import { 
  users, roomTypes, patients, doctors, patientDoctors, medicines, visits, prescriptions, charges,
  type User, type InsertUser, type RoomType, type InsertRoomType, type Patient, type InsertPatient,
  type Doctor, type InsertDoctor, type PatientDoctor, type InsertPatientDoctor, type Medicine, type InsertMedicine,
  type Visit, type InsertVisit, type Prescription, type InsertPrescription, type Charge, type InsertCharge
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  // User
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Patients
  async getPatients(): Promise<Patient[]> {
    return await db.select().from(patients);
  }
  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient;
  }
  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const [patient] = await db.insert(patients).values({
      ...insertPatient,
      ipdNumber: `IPD-${Date.now()}`
    }).returning();
    return patient;
  }
  async updatePatient(id: number, updates: Partial<InsertPatient>): Promise<Patient> {
    const [patient] = await db.update(patients).set(updates).where(eq(patients.id, id)).returning();
    return patient;
  }

  // Doctors
  async getDoctors(): Promise<Doctor[]> {
    return await db.select().from(doctors);
  }
  async createDoctor(insertDoctor: InsertDoctor): Promise<Doctor> {
    const [doctor] = await db.insert(doctors).values(insertDoctor).returning();
    return doctor;
  }
  
  // Medicines
  async getMedicines(): Promise<Medicine[]> {
    return await db.select().from(medicines);
  }
  async createMedicine(insertMedicine: InsertMedicine): Promise<Medicine> {
    const [medicine] = await db.insert(medicines).values(insertMedicine).returning();
    return medicine;
  }

  // Room Types
  async getRoomTypes(): Promise<RoomType[]> {
    return await db.select().from(roomTypes);
  }
  async createRoomType(insertRoomType: InsertRoomType): Promise<RoomType> {
    const [roomType] = await db.insert(roomTypes).values(insertRoomType).returning();
    return roomType;
  }

  // Visits
  async getVisits(): Promise<Visit[]> {
    return await db.select().from(visits);
  }
  async createVisit(insertVisit: InsertVisit): Promise<Visit> {
    const [visit] = await db.insert(visits).values(insertVisit).returning();
    return visit;
  }
  async getVisitsByPatient(patientId: number): Promise<Visit[]> {
    return await db.select().from(visits).where(eq(visits.patientId, patientId));
  }
  async getVisitsByDoctor(doctorId: number): Promise<Visit[]> {
    return await db.select().from(visits).where(eq(visits.doctorId, doctorId));
  }

  // Prescriptions
  async createPrescription(insertPrescription: InsertPrescription): Promise<Prescription> {
    const [prescription] = await db.insert(prescriptions).values(insertPrescription).returning();
    return prescription;
  }
  async getPrescriptionsByPatient(patientId: number): Promise<Prescription[]> {
    return await db.select().from(prescriptions).where(eq(prescriptions.patientId, patientId));
  }

  // Charges
  async createCharge(insertCharge: InsertCharge): Promise<Charge> {
    const [charge] = await db.insert(charges).values(insertCharge).returning();
    return charge;
  }
  async getChargesByPatient(patientId: number): Promise<Charge[]> {
    return await db.select().from(charges).where(eq(charges.patientId, patientId));
  }
  async getCharges(): Promise<Charge[]> {
    return await db.select().from(charges);
  }

  // Patient Doctors
  async assignDoctor(patientId: number, doctorId: number): Promise<PatientDoctor> {
    const [pd] = await db.insert(patientDoctors).values({ patientId, doctorId }).returning();
    return pd;
  }
  async getAssignedDoctors(patientId: number): Promise<PatientDoctor[]> {
    return await db.select().from(patientDoctors).where(eq(patientDoctors.patientId, patientId));
  }
}

export const storage = new DatabaseStorage();