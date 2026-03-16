import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { 
  users, roomTypes, patients, doctors, patientDoctors, medicines, visits, prescriptions, charges, procedures, procedureCatalog, doctorRoomCharges,
  type User, type InsertUser, type RoomType, type InsertRoomType, type Patient, type InsertPatient,
  type Doctor, type InsertDoctor, type PatientDoctor, type InsertPatientDoctor, type Medicine, type InsertMedicine,
  type Visit, type InsertVisit, type Prescription, type InsertPrescription, type Charge, type InsertCharge,
  type Procedure, type InsertProcedure, type ProcedureCatalog, type InsertProcedureCatalog, type DoctorRoomCharge
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
  async createPatient(insertPatient: InsertPatient & { doctorId?: number }): Promise<Patient> {
    const { doctorId, ...patientData } = insertPatient;
    const [patient] = await db.insert(patients).values({
      ...patientData,
      ipdNumber: `IPD-${Date.now()}`
    }).returning();
    
    if (doctorId) {
      await this.assignDoctor(patient.id, doctorId);
    }
    
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
  async getDoctorByUserId(userId: number): Promise<Doctor | undefined> {
    const [doctor] = await db.select().from(doctors).where(eq(doctors.userId, userId));
    return doctor;
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
  async getPrescriptions(): Promise<Prescription[]> {
    return await db.select().from(prescriptions);
  }

  async getAssignedDoctors(patientId: number): Promise<any[]> {
    const pds = await db.select().from(patientDoctors).where(eq(patientDoctors.patientId, patientId));
    const results = [];
    for (const pd of pds) {
      const doc = await db.select().from(doctors).where(eq(doctors.id, pd.doctorId));
      if (doc.length > 0) {
        results.push({
          id: pd.id,
          patientId: pd.patientId,
          doctorId: pd.doctorId,
          doctorName: doc[0].name,
        });
      }
    }
    return results;
  }

  async getDoctorPatients(doctorId: number): Promise<Patient[]> {
    const pds = await db.select().from(patientDoctors).where(eq(patientDoctors.doctorId, doctorId));
    const result: Patient[] = [];
    for (const pd of pds) {
      const [patient] = await db.select().from(patients).where(eq(patients.id, pd.patientId));
      if (patient) result.push(patient);
    }
    return result;
  }

  async deleteCharge(id: number): Promise<void> {
    await db.delete(charges).where(eq(charges.id, id));
  }

  // Procedure Catalog
  async getProcedureCatalog(): Promise<ProcedureCatalog[]> {
    return await db.select().from(procedureCatalog);
  }
  async createProcedureCatalogItem(data: InsertProcedureCatalog): Promise<ProcedureCatalog> {
    const [item] = await db.insert(procedureCatalog).values(data).returning();
    return item;
  }
  async updateProcedureCatalogItem(id: number, data: Partial<InsertProcedureCatalog>): Promise<ProcedureCatalog> {
    const [item] = await db.update(procedureCatalog).set(data).where(eq(procedureCatalog.id, id)).returning();
    return item;
  }
  async deleteProcedureCatalogItem(id: number): Promise<void> {
    await db.delete(procedureCatalog).where(eq(procedureCatalog.id, id));
  }

  // Doctor Room Charges
  async getDoctorRoomCharges(doctorId: number): Promise<DoctorRoomCharge[]> {
    return await db.select().from(doctorRoomCharges).where(eq(doctorRoomCharges.doctorId, doctorId));
  }
  async getDoctorRoomCharge(doctorId: number, roomTypeId: number): Promise<DoctorRoomCharge | undefined> {
    const [row] = await db.select().from(doctorRoomCharges).where(
      and(eq(doctorRoomCharges.doctorId, doctorId), eq(doctorRoomCharges.roomTypeId, roomTypeId))
    );
    return row;
  }
  async upsertDoctorRoomCharge(doctorId: number, roomTypeId: number, charge: number): Promise<DoctorRoomCharge> {
    const existing = await this.getDoctorRoomCharge(doctorId, roomTypeId);
    if (existing) {
      const [updated] = await db.update(doctorRoomCharges)
        .set({ charge })
        .where(and(eq(doctorRoomCharges.doctorId, doctorId), eq(doctorRoomCharges.roomTypeId, roomTypeId)))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(doctorRoomCharges).values({ doctorId, roomTypeId, charge }).returning();
      return created;
    }
  }

  // Procedures
  async createProcedure(insertProcedure: InsertProcedure): Promise<Procedure> {
    const [procedure] = await db.insert(procedures).values(insertProcedure).returning();
    return procedure;
  }
  async getProceduresByPatient(patientId: number): Promise<Procedure[]> {
    return await db.select().from(procedures).where(eq(procedures.patientId, patientId));
  }
  async deleteProcedure(id: number): Promise<void> {
    await db.delete(procedures).where(eq(procedures.id, id));
  }
}

export const storage = new DatabaseStorage();