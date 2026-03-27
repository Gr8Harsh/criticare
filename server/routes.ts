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
      const fields = z.object({
        dailyCharge: z.coerce.number().optional(),
        nursingCharge: z.coerce.number().optional(),
        rmoCharge: z.coerce.number().optional(),
      }).parse(req.body);
      const [updated] = await db.update(roomTypes).set(fields).where(eq(roomTypes.id, id)).returning();
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

    let roomNursingCharges = 0;
    let rmoCharges = 0;

    if (roomCharge === 0) {
      const allRoomTypes = await storage.getRoomTypes();
      const switches = await storage.getRoomSwitchesByPatient(patientId);
      switches.sort((a, b) => new Date(a.switchDate).getTime() - new Date(b.switchDate).getTime());

      // Helper to accumulate all room-based charges for a segment
      const addSegmentCharges = (roomTypeId: number, days: number) => {
        if (days <= 0) return;
        const rt = allRoomTypes.find((r) => r.id === roomTypeId);
        if (!rt) return;
        roomCharge += days * rt.dailyCharge;
        roomNursingCharges += days * (rt.nursingCharge ?? 0);
        rmoCharges += days * (rt.rmoCharge ?? 0);
      };

      // Normalize a date to midnight (calendar day boundary) for clean day arithmetic
      const toMidnight = (d: Date) => {
        const m = new Date(d);
        m.setHours(0, 0, 0, 0);
        return m;
      };
      const calendarDayDiff = (a: Date, b: Date) =>
        Math.round((b.getTime() - a.getTime()) / (1000 * 3600 * 24));

      if (switches.length === 0) {
        addSegmentCharges(patient.roomTypeId, daysAdmitted);
      } else {
        // Work in calendar days (midnight boundaries) to avoid time-of-day drift
        let prevDay = toMidnight(admissionDate);
        const dischargeDay = toMidnight(dischargeDate);
        let prevRoomTypeId = switches[0].fromRoomTypeId;
        let lastRoomTypeId = switches[switches.length - 1].toRoomTypeId;

        for (const sw of switches) {
          const switchDay = toMidnight(new Date(sw.switchDate));
          const diffDays = Math.max(0, calendarDayDiff(prevDay, switchDay));

          if (sw.isHalfDay) {
            // Charge diffDays in old room + half the switch day, half in new room
            addSegmentCharges(prevRoomTypeId, diffDays + 0.5);
            addSegmentCharges(sw.toRoomTypeId, 0.5);
            // Next segment starts from the day after the switch day
            const nextDay = new Date(switchDay);
            nextDay.setDate(nextDay.getDate() + 1);
            prevDay = nextDay;
          } else {
            // Charge diffDays in old room; switch day belongs to new room
            addSegmentCharges(prevRoomTypeId, diffDays);
            prevDay = switchDay;
          }
          prevRoomTypeId = sw.toRoomTypeId;
          lastRoomTypeId = sw.toRoomTypeId;
        }

        // Final segment: remaining days from last boundary to discharge day
        const finalDays = Math.max(0, calendarDayDiff(prevDay, dischargeDay));
        addSegmentCharges(prevRoomTypeId, finalDays);

        // Ensure minimum 1 day billing (e.g. all switches on same calendar day)
        if (roomCharge === 0) {
          addSegmentCharges(lastRoomTypeId, 1);
        }
      }

      roomCharge = Math.round(roomCharge);
      roomNursingCharges = Math.round(roomNursingCharges);
      rmoCharges = Math.round(rmoCharges);
    }

    const procedureCharges = proceduresList.reduce((acc, p) => acc + p.cost, 0);

    const surgeriesList = await storage.getPatientSurgeries(patientId);
    const surgeryCharges = surgeriesList.reduce((acc, s) =>
      acc + s.surgeryCharge + s.surgeonCharge + s.assistantSurgeonCharge +
      s.anaesthetistCharge + s.otCharge + s.otAssistantCharge, 0);

    const grandTotal =
      roomCharge +
      roomNursingCharges +
      rmoCharges +
      doctorCharges +
      medicineCharges +
      nursingCharges +
      otherCharges +
      procedureCharges +
      surgeryCharges;

    const roomSwitchesList = await storage.getRoomSwitchesByPatient(patientId);
    roomSwitchesList.sort((a, b) => new Date(a.switchDate).getTime() - new Date(b.switchDate).getTime());

    res.json({
      daysAdmitted,
      roomCharge,
      roomNursingCharges,
      rmoCharges,
      doctorCharges,
      medicineCharges,
      nursingCharges,
      otherCharges,
      procedureCharges,
      surgeryCharges,
      grandTotal,
      visits,
      prescriptions,
      charges: chargesList,
      procedures: proceduresList,
      surgeries: surgeriesList,
      roomSwitches: roomSwitchesList,
      patient,
    });
  });

  app.get('/api/patients/:id/room-switches', async (req, res) => {
    const patientId = Number(req.params.id);
    const switches = await storage.getRoomSwitchesByPatient(patientId);
    switches.sort((a, b) => new Date(a.switchDate).getTime() - new Date(b.switchDate).getTime());
    res.json(switches);
  });

  app.post('/api/patients/:id/room-switch', async (req, res) => {
    try {
      const patientId = Number(req.params.id);
      const patient = await storage.getPatient(patientId);
      if (!patient) return res.status(404).json({ message: "Patient not found" });
      if (patient.discharged) return res.status(400).json({ message: "Cannot switch room for a discharged patient" });

      const { toRoomTypeId, isHalfDay, notes } = req.body;
      if (!toRoomTypeId) return res.status(400).json({ message: "toRoomTypeId is required" });
      if (patient.roomTypeId === Number(toRoomTypeId)) return res.status(400).json({ message: "Patient is already in this room type" });

      const sw = await storage.createRoomSwitch({
        patientId,
        fromRoomTypeId: patient.roomTypeId,
        toRoomTypeId: Number(toRoomTypeId),
        isHalfDay: isHalfDay !== false,
        notes: notes || null,
      });

      await storage.updatePatient(patientId, { roomTypeId: Number(toRoomTypeId) });

      res.status(201).json(sw);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
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

  app.get("/api/doctors/:id/surgery-charges", async (req, res) => {
    const doctorId = Number(req.params.id);
    const surgeryCharges = await storage.getDoctorSurgeryCharges(doctorId);
    res.json(surgeryCharges);
  });

  app.put("/api/doctors/:id/surgery-charges", async (req, res) => {
    try {
      const doctorId = Number(req.params.id);
      const { category, charge } = z.object({
        category: z.string(),
        charge: z.coerce.number().min(0),
      }).parse(req.body);
      const result = await storage.upsertDoctorSurgeryCharge(doctorId, category, charge);
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

  // Surgery Names
  app.get("/api/surgery-names", async (req, res) => {
    const names = await storage.getSurgeryNames();
    res.json(names);
  });

  app.post("/api/surgery-names", requireAdmin, async (req, res) => {
    try {
      const { name } = z.object({ name: z.string().min(1) }).parse(req.body);
      const item = await storage.createSurgeryName(name);
      res.status(201).json(item);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put("/api/surgery-names/:id", requireAdmin, async (req, res) => {
    try {
      const { name } = z.object({ name: z.string().min(1) }).parse(req.body);
      const item = await storage.updateSurgeryName(Number(req.params.id), name);
      res.json(item);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete("/api/surgery-names/:id", requireAdmin, async (req, res) => {
    await storage.deleteSurgeryName(Number(req.params.id));
    res.sendStatus(204);
  });

  // Surgery Catalog
  app.get("/api/surgery-catalog", async (req, res) => {
    const catalog = await storage.getSurgeryCatalog();
    res.json(catalog);
  });

  app.post("/api/surgery-catalog", async (req, res) => {
    try {
      const { name, cost, category } = z.object({
        name: z.string().min(1),
        cost: z.coerce.number().min(0),
        category: z.enum(['SURGERY', 'SURGEON', 'ASSISTANT_SURGEON', 'ANAESTHETIST', 'OT', 'OT_ASSISTANT']),
      }).parse(req.body);
      const item = await storage.createSurgeryCatalogItem({ name, cost, category });
      res.status(201).json(item);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put("/api/surgery-catalog/:id", async (req, res) => {
    try {
      const { name, cost, category } = z.object({
        name: z.string().min(1).optional(),
        cost: z.coerce.number().min(0).optional(),
        category: z.enum(['SURGERY', 'SURGEON', 'ASSISTANT_SURGEON', 'ANAESTHETIST', 'OT', 'OT_ASSISTANT']).optional(),
      }).parse(req.body);
      const item = await storage.updateSurgeryCatalogItem(Number(req.params.id), { name, cost, category });
      res.json(item);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete("/api/surgery-catalog/:id", async (req, res) => {
    await storage.deleteSurgeryCatalogItem(Number(req.params.id));
    res.sendStatus(204);
  });

  // Patient Surgeries
  app.get("/api/patients/:id/surgeries", async (req, res) => {
    const surgeries = await storage.getPatientSurgeries(Number(req.params.id));
    res.json(surgeries);
  });

  app.post("/api/patients/:id/surgeries", async (req, res) => {
    try {
      const patientId = Number(req.params.id);
      const data = z.object({
        surgeryName: z.string().optional(),
        surgeryCharge: z.coerce.number().min(0).default(0),
        surgeonCharge: z.coerce.number().min(0).default(0),
        assistantSurgeonCharge: z.coerce.number().min(0).default(0),
        anaesthetistCharge: z.coerce.number().min(0).default(0),
        otCharge: z.coerce.number().min(0).default(0),
        otAssistantCharge: z.coerce.number().min(0).default(0),
      }).parse(req.body);
      const surgery = await storage.createPatientSurgery({ patientId, ...data });
      res.status(201).json(surgery);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete("/api/patient-surgeries/:id", async (req, res) => {
    await storage.deletePatientSurgery(Number(req.params.id));
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
