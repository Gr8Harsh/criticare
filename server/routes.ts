import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { api } from "@shared/routes";
import { z } from "zod";
import { db } from "./db";
import { users, roomTypes } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  const { hashPassword } = setupAuth(app);

  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const existingUser = await storage.getUserByEmail(input.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const hashedPassword = await hashPassword(input.password);
      const user = await storage.createUser({
        ...input,
        password: hashedPassword,
      });

      // Only login if this is a first-time registration or if not already authenticated
      if (!req.isAuthenticated()) {
        req.login(user, (err) => {
          if (err) return res.status(500).json({ message: "Error logging in" });
          return res.status(201).json(user);
        });
      } else {
        // If an admin/manager is creating a user, just return the user without logging them in
        return res.status(201).json(user);
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.auth.login.path, (req, res, next) => {
    console.log("LOGIN ROUTE HIT");
    import("passport").then((p) =>
      p.default.authenticate("local", (err: any, user: any, info: any) => {
        if (err) return next(err);
        if (!user)
          return res.status(401).json({ message: "Invalid credentials" });

        req.login(user, (err) => {
          if (err) return next(err);
          // Ensure session is saved before responding
          req.session.save((saveErr) => {
            if (saveErr) return next(saveErr);
            return res.json(user);
          });
        });
      })(req, res, next),
    );
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Error logging out" });
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get(api.auth.me.path, (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });

  // Protect API routes
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated())
      return res.status(401).json({ message: "Not authenticated" });
    next();
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || req.user.role !== 'ADMIN')
      return res.status(403).json({ message: "Admin access required" });
    next();
  };

  app.use("/api", (req, res, next) => {
    if (req.path.startsWith("/auth")) return next();
    requireAuth(req, res, next);
  });

  // Admin only routes for managing users and room types
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    const allUsers = await db.select().from(users);
    res.json(allUsers.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role })));
  });

  app.post("/api/admin/room-types/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { dailyCharge } = z.object({ dailyCharge: z.coerce.number() }).parse(req.body);
      const [updated] = await db.update(roomTypes).set({ dailyCharge }).where(eq(roomTypes.id, id)).returning();
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.patients.list.path, async (req, res) => {
    const patients = await storage.getPatients();
    res.json(patients);
  });

  app.post(api.patients.create.path, async (req, res) => {
    try {
      const { doctorId, ...patientData } = req.body;
      const patient = await storage.createPatient({ ...patientData, doctorId });
      res.status(201).json(patient);
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.delete(api.charges.create.path + "/:id", async (req, res) => {
    const id = Number(req.params.id);
    await storage.deleteCharge(id);
    res.sendStatus(204);
  });

  app.get("/api/patients/:id/doctors", async (req, res) => {
    const patientId = Number(req.params.id);
    const assignedDoctors = await storage.getAssignedDoctors(patientId);
    res.json(assignedDoctors);
  });

  app.get(api.patients.get.path, async (req, res) => {
    const patient = await storage.getPatient(Number(req.params.id));
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    res.json(patient);
  });

  app.put(api.patients.update.path, async (req, res) => {
    try {
      const input = api.patients.update.input.parse(req.body);
      const patient = await storage.updatePatient(Number(req.params.id), input);
      if (!patient) return res.status(404).json({ message: "Patient not found" });
      res.json(patient);
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.patients.discharge.path, async (req, res) => {
    const patient = await storage.updatePatient(Number(req.params.id), {
      discharged: true,
      expectedDischargeDate: new Date(),
    });
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    res.json(patient);
  });

  app.get(api.patients.getBill.path, async (req, res) => {
    const patientId = Number(req.params.id);
    const patient = await storage.getPatient(patientId);
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    const visits = await storage.getVisitsByPatient(patientId);
    const prescriptions = await storage.getPrescriptionsByPatient(patientId);
    const chargesList = await storage.getChargesByPatient(patientId);
    const proceduresList = await storage.getProceduresByPatient(patientId);

    const doctorCharges = visits.reduce((acc, v) => acc + v.charge, 0);
    const medicineCharges = prescriptions.reduce(
      (acc, p) => acc + p.totalCost,
      0,
    );

    let roomCharge = 0;
    let nursingCharges = 0;
    let otherCharges = 0;

    chargesList.forEach((c) => {
      if (c.type === "ROOM") roomCharge += c.amount;
      else if (c.type === "NURSING") nursingCharges += c.amount;
      else if (c.type === "OTHER") otherCharges += c.amount;
    });

    const admissionDate = new Date(patient.admissionDate);
    const dischargeDate =
      patient.discharged && patient.expectedDischargeDate
        ? new Date(patient.expectedDischargeDate)
        : new Date();
    const daysAdmitted = Math.max(
      1,
      Math.ceil(
        (dischargeDate.getTime() - admissionDate.getTime()) /
          (1000 * 3600 * 24),
      ),
    );

    if (roomCharge === 0) {
      const roomTypes = await storage.getRoomTypes();
      const roomType = roomTypes.find((r) => r.id === patient.roomTypeId);
      if (roomType) {
        roomCharge = roomType.dailyCharge * daysAdmitted;
      }
    }

    const procedureCharges = proceduresList.reduce((acc, p) => acc + p.cost, 0);

    const grandTotal =
      roomCharge +
      doctorCharges +
      medicineCharges +
      nursingCharges +
      otherCharges +
      procedureCharges;

    res.json({
      daysAdmitted,
      roomCharge,
      doctorCharges,
      medicineCharges,
      nursingCharges,
      otherCharges,
      procedureCharges,
      grandTotal,
      visits,
      prescriptions,
      charges: chargesList,
      procedures: proceduresList,
      patient,
    });
  });

  app.post(api.patients.assignDoctor.path, async (req, res) => {
    try {
      const { doctorId } = api.patients.assignDoctor.input.parse(req.body);
      const pd = await storage.assignDoctor(Number(req.params.id), doctorId);
      res.status(201).json(pd);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.doctors.list.path, async (req, res) => {
    const doctorsList = await storage.getDoctors();
    res.json(doctorsList);
  });

  app.post(api.doctors.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.doctors.create.input.parse(req.body);
      const doctor = await storage.createDoctor(input);
      res.status(201).json(doctor);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get("/api/doctors/:id/room-charges", async (req, res) => {
    const doctorId = Number(req.params.id);
    const roomCharges = await storage.getDoctorRoomCharges(doctorId);
    res.json(roomCharges);
  });

  app.put("/api/doctors/:id/room-charges", async (req, res) => {
    try {
      const doctorId = Number(req.params.id);
      const { roomTypeId, charge } = z.object({
        roomTypeId: z.coerce.number(),
        charge: z.coerce.number().min(0),
      }).parse(req.body);
      const result = await storage.upsertDoctorRoomCharge(doctorId, roomTypeId, charge);
      res.json(result);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.doctors.stats.path, async (req, res) => {
    const inputId = Number(req.params.id);
    // The dashboard passes userId, so look up the doctor profile by userId first
    const doctorByUser = await storage.getDoctorByUserId(inputId);
    const doctorId = doctorByUser ? doctorByUser.id : inputId;

    const visits = await storage.getVisitsByDoctor(doctorId);
    const visitCount = visits.length;
    const revenueGenerated = visits.reduce((acc, v) => acc + v.charge, 0);

    res.json({ visitCount, revenueGenerated });
  });

  app.get(api.doctors.assignedPatients.path, async (req, res) => {
    const inputId = Number(req.params.id);
    // The dashboard passes userId, so look up the doctor profile by userId first
    const doctorByUser = await storage.getDoctorByUserId(inputId);
    const doctorId = doctorByUser ? doctorByUser.id : inputId;

    const doctorPatients = await storage.getDoctorPatients(doctorId);
    res.json(doctorPatients);
  });

  app.get(api.medicines.list.path, async (req, res) => {
    const medicinesList = await storage.getMedicines();
    res.json(medicinesList);
  });

  app.post(api.medicines.create.path, async (req, res) => {
    try {
      const input = api.medicines.create.input.parse(req.body);
      const medicine = await storage.createMedicine(input);
      res.status(201).json(medicine);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.roomTypes.list.path, async (req, res) => {
    const types = await storage.getRoomTypes();
    res.json(types);
  });

  app.post(api.roomTypes.create.path, async (req, res) => {
    try {
      const input = api.roomTypes.create.input.parse(req.body);
      const roomType = await storage.createRoomType(input);
      res.status(201).json(roomType);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post(api.visits.create.path, async (req, res) => {
    try {
      const input = api.visits.create.input.parse(req.body);
      const visit = await storage.createVisit(input);
      res.status(201).json(visit);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post(api.prescriptions.create.path, async (req, res) => {
    try {
      const input = api.prescriptions.create.input.parse(req.body);
      const p = await storage.createPrescription(input);
      res.status(201).json(p);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post(api.charges.create.path, async (req, res) => {
    try {
      const input = api.charges.create.input.parse(req.body);
      const c = await storage.createCharge(input);
      res.status(201).json(c);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post(api.procedures.create.path, async (req, res) => {
    try {
      const input = api.procedures.create.input.parse(req.body);
      const p = await storage.createProcedure(input);
      res.status(201).json(p);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete("/api/procedures/:id", async (req, res) => {
    await storage.deleteProcedure(Number(req.params.id));
    res.sendStatus(204);
  });

  // Procedure Catalog (master list)
  app.get("/api/procedure-catalog", async (req, res) => {
    const catalog = await storage.getProcedureCatalog();
    res.json(catalog);
  });

  app.post("/api/procedure-catalog", async (req, res) => {
    try {
      const { name, description, cost } = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        cost: z.coerce.number().min(0),
      }).parse(req.body);
      const item = await storage.createProcedureCatalogItem({ name, description, cost });
      res.status(201).json(item);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put("/api/procedure-catalog/:id", async (req, res) => {
    try {
      const { name, description, cost } = z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        cost: z.coerce.number().min(0).optional(),
      }).parse(req.body);
      const item = await storage.updateProcedureCatalogItem(Number(req.params.id), { name, description, cost });
      res.json(item);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete("/api/procedure-catalog/:id", async (req, res) => {
    await storage.deleteProcedureCatalogItem(Number(req.params.id));
    res.sendStatus(204);
  });

  app.get(api.dashboard.overview.path, async (req, res) => {
    const patientsList = await storage.getPatients();
    const doctorsList = await storage.getDoctors();
    const visitsList = await storage.getVisits();
    const chargesList = await storage.getCharges();
    const roomTypes = await storage.getRoomTypes();

    const totalAdmitted = patientsList.filter((p) => !p.discharged).length;
    const totalBedsOccupied = totalAdmitted;

    let doctorRev = visitsList.reduce((acc, v) => acc + v.charge, 0);
    
    // Calculate room revenue for all patients (including currently admitted)
    let roomRev = 0;
    for (const patient of patientsList) {
      const admissionDate = new Date(patient.admissionDate);
      const dischargeDate = patient.discharged && patient.expectedDischargeDate 
        ? new Date(patient.expectedDischargeDate) 
        : new Date();
      
      const days = Math.max(1, Math.ceil((dischargeDate.getTime() - admissionDate.getTime()) / (1000 * 3600 * 24)));
      const roomType = roomTypes.find(rt => rt.id === patient.roomTypeId);
      if (roomType) {
        roomRev += roomType.dailyCharge * days;
      }
    }

    // Add explicit room charges if any exist in charges table
    roomRev += chargesList.filter(c => c.type === 'ROOM').reduce((acc, c) => acc + c.amount, 0);

    let nursingRev = chargesList
      .filter((c) => c.type === "NURSING")
      .reduce((acc, c) => acc + c.amount, 0);
    let otherRev = chargesList
      .filter((c) => c.type === "OTHER")
      .reduce((acc, c) => acc + c.amount, 0);
    
    const prescriptions = await storage.getPrescriptions();
    let medicineRev = prescriptions.reduce((acc, p) => acc + p.totalCost, 0);

    const totalRevenue = doctorRev + roomRev + nursingRev + otherRev + medicineRev;

    res.json({
      totalAdmitted,
      totalBedsOccupied,
      totalRevenue,
      revenueBreakdown: {
        room: roomRev,
        doctor: doctorRev,
        medicine: medicineRev,
        nursing: nursingRev,
        other: otherRev,
      },
      activeDoctors: doctorsList.length,
    });
  });

  return httpServer;
}
