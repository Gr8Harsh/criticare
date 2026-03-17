import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // 'ADMIN', 'MANAGER', or 'DOCTOR'
});

export const roomTypes = pgTable("room_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  dailyCharge: integer("daily_charge").notNull(),
});

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  ipdNumber: text("ipd_number").notNull().unique(),
  name: text("name").notNull(),
  gender: text("gender").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  phone: text("phone"),
  relativePhone: text("relative_phone"),
  illness: text("illness"),
  admissionDate: timestamp("admission_date").defaultNow().notNull(),
  expectedDischargeDate: timestamp("expected_discharge_date"),
  roomTypeId: integer("room_type_id").notNull(),
  bedNumber: text("bed_number").notNull(),
  discharged: boolean("discharged").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const doctors = pgTable("doctors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  specialization: text("specialization").notNull(),
  visitCharge: integer("visit_charge").notNull(),
  userId: integer("user_id").notNull(),
});

export const patientDoctors = pgTable("patient_doctors", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  doctorId: integer("doctor_id").notNull(),
});

export const medicines = pgTable("medicines", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  unitCost: integer("unit_cost").notNull(),
});

export const visits = pgTable("visits", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  doctorId: integer("doctor_id").notNull(),
  date: timestamp("date").defaultNow().notNull(),
  charge: integer("charge").notNull(),
});

export const prescriptions = pgTable("prescriptions", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  medicineId: integer("medicine_id").notNull(),
  quantity: integer("quantity").notNull(),
  totalCost: integer("total_cost").notNull(),
  date: timestamp("date").defaultNow().notNull(),
});

export const charges = pgTable("charges", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  type: text("type").notNull(), // 'ROOM', 'NURSING', 'OTHER'
  description: text("description"),
  amount: integer("amount").notNull(),
  date: timestamp("date").defaultNow().notNull(),
});

export const procedures = pgTable("procedures", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  doctorId: integer("doctor_id"),
  name: text("name").notNull(),
  description: text("description"),
  cost: integer("cost").notNull(),
  date: timestamp("date").defaultNow().notNull(),
});

export const procedureCatalog = pgTable("procedure_catalog", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  cost: integer("cost").notNull(),
});

export const doctorRoomCharges = pgTable("doctor_room_charges", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").notNull(),
  roomTypeId: integer("room_type_id").notNull(),
  charge: integer("charge").notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertRoomTypeSchema = createInsertSchema(roomTypes).omit({ id: true });
export const insertPatientSchema = createInsertSchema(patients).omit({ id: true, createdAt: true, ipdNumber: true });
export const insertDoctorSchema = createInsertSchema(doctors).omit({ id: true });
export const insertPatientDoctorSchema = createInsertSchema(patientDoctors).omit({ id: true });
export const insertMedicineSchema = createInsertSchema(medicines).omit({ id: true });
export const insertVisitSchema = createInsertSchema(visits).omit({ id: true, date: true });
export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({ id: true, date: true });
export const insertChargeSchema = createInsertSchema(charges).omit({ id: true, date: true });
export const insertProcedureSchema = createInsertSchema(procedures).omit({ id: true, date: true });
export const insertProcedureCatalogSchema = createInsertSchema(procedureCatalog).omit({ id: true });
export const insertDoctorRoomChargeSchema = createInsertSchema(doctorRoomCharges).omit({ id: true });

// Types
export type User = typeof users.$inferSelect;
export type RoomType = typeof roomTypes.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type Doctor = typeof doctors.$inferSelect;
export type PatientDoctor = typeof patientDoctors.$inferSelect;
export type Medicine = typeof medicines.$inferSelect;
export type Visit = typeof visits.$inferSelect;
export type Prescription = typeof prescriptions.$inferSelect;
export type Charge = typeof charges.$inferSelect;
export type Procedure = typeof procedures.$inferSelect;
export type ProcedureCatalog = typeof procedureCatalog.$inferSelect;
export type DoctorRoomCharge = typeof doctorRoomCharges.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertRoomType = z.infer<typeof insertRoomTypeSchema>;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type InsertDoctor = z.infer<typeof insertDoctorSchema>;
export type InsertPatientDoctor = z.infer<typeof insertPatientDoctorSchema>;
export type InsertMedicine = z.infer<typeof insertMedicineSchema>;
export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type InsertCharge = z.infer<typeof insertChargeSchema>;
export type InsertProcedure = z.infer<typeof insertProcedureSchema>;
export type InsertProcedureCatalog = z.infer<typeof insertProcedureCatalogSchema>;
export type InsertDoctorRoomCharge = z.infer<typeof insertDoctorRoomChargeSchema>;