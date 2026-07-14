import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { api } from "@shared/routes";
import { z } from "zod";
import { db } from "./db";
import { users, roomTypes } from "@shared/schema";
import { eq } from "drizzle-orm";

// Returns current time adjusted to IST (UTC+5:30) so that calendar day
// boundaries fall at midnight India time instead of midnight UTC.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const nowIST = () => new Date(Date.now() + IST_OFFSET_MS);

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

  const requireManager = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || !["ADMIN", "MANAGER"].includes(req.user.role))
      return res.status(403).json({ message: "Manager access required" });
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

  app.post("/api/admin/users/:id/reset-password", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { password } = z.object({ password: z.string().min(6) }).parse(req.body);
      const [account] = await db.select().from(users).where(eq(users.id, id));

      if (!account) return res.status(404).json({ message: "User not found" });
      if (!["MANAGER", "DOCTOR"].includes(account.role)) {
        return res.status(400).json({ message: "Only manager and doctor passwords can be reset here" });
      }

      const [updated] = await db
        .update(users)
        .set({ password: await hashPassword(password) })
        .where(eq(users.id, id))
        .returning({ id: users.id, name: users.name, email: users.email, role: users.role });

      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/room-types/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const fields = z.object({
        dailyCharge: z.coerce.number().optional(),
        nursingCharge: z.coerce.number().optional(),
        rmoCharge: z.coerce.number().optional(),
        incentiviseCharge: z.coerce.number().optional(),
        monitorCharge: z.coerce.number().optional(),
        visitCharge: z.coerce.number().optional(),
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

  app.post(api.patients.create.path, requireManager, async (req, res) => {
    try {
      const { doctorId, ...patientData } = api.patients.create.input
        .extend({ doctorId: z.coerce.number().optional() })
        .parse(req.body);
      const normalizedIpd = patientData.ipdNumber?.trim();
      if (normalizedIpd) {
        const existingPatient = (await storage.getPatients()).find((patient) => patient.ipdNumber === normalizedIpd);
        if (existingPatient) {
          return res.status(400).json({ message: "IPD number already exists" });
        }
      }
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
      const patientId = Number(req.params.id);
      const normalizedIpd = input.ipdNumber?.trim();
      if (normalizedIpd) {
        const existingPatient = (await storage.getPatients()).find((patient) => patient.ipdNumber === normalizedIpd && patient.id !== patientId);
        if (existingPatient) {
          return res.status(400).json({ message: "IPD number already exists" });
        }
      }
      const patient = await storage.updatePatient(patientId, input);
      if (!patient) return res.status(404).json({ message: "Patient not found" });
      res.json(patient);
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.patients.discharge.path, async (req, res) => {
    const body = z.object({
      dischargeDate: z.string().optional(),
      dischargeTime: z.string().optional(),
      halfDayDischarge: z.boolean().optional(),
    }).parse(req.body ?? {});
    const dischargeDateTime = body.dischargeDate
      ? new Date(`${body.dischargeDate}T${body.dischargeTime || "00:00"}`)
      : new Date();
    const patient = await storage.updatePatient(Number(req.params.id), {
      discharged: true,
      expectedDischargeDate: dischargeDateTime,
      halfDayDischarge: body.halfDayDischarge ?? false,
    } as any);
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

    let nursingCharges = 0;
    let otherCharges = 0;

    chargesList.forEach((c) => {
      if (c.type === "NURSING") nursingCharges += c.amount;
      else otherCharges += c.amount;
    });

    const admissionDate = new Date(patient.admissionDate);
    const dischargeDate =
      patient.discharged && patient.expectedDischargeDate
        ? new Date(patient.expectedDischargeDate)
        : nowIST();
    const daysAdmitted = Math.max(
      1,
      Math.ceil(
        (dischargeDate.getTime() - admissionDate.getTime()) /
          (1000 * 3600 * 24),
      ),
    );

    let roomCharge = 0;
    let roomNursingCharges = 0;
    let rmoCharges = 0;
    let incentiviseCharges = 0;
    let monitorCharges = 0;
    let visitCharges = 0;

    // Fetch explicit per-day room charges
    const roomChargesList = await storage.getPatientRoomCharges(patientId);
    const visibleRoomChargesList = roomChargesList.filter((rc) => rc.notes !== "__EMPTY_ROOM_CONFIGURATION__");
    const switches = await storage.getRoomSwitchesByPatient(patientId);
    switches.sort((a, b) => new Date(a.switchDate).getTime() - new Date(b.switchDate).getTime());

    if (visibleRoomChargesList.length > 0 && switches.length === 0) {
      // Use explicit per-day entries
      visibleRoomChargesList.forEach((rc) => {
        roomCharge += rc.roomCharge;
        roomNursingCharges += rc.nursingCharge;
        rmoCharges += rc.rmoCharge;
        incentiviseCharges += (rc as any).incentiviseCharge ?? 0;
        monitorCharges += (rc as any).monitorCharge ?? 0;
        visitCharges += (rc.visitCharge ?? 0);
      });
    } else {
      // Auto-calculate from room type and room switches
      const allRoomTypes = await storage.getRoomTypes();

      // Adds room/nursing/rmo charges for a number of days (visit charge handled separately for switch days)
      const addSegmentCharges = (roomTypeId: number, days: number, includeVisit = true) => {
        if (days <= 0) return;
        const rt = allRoomTypes.find((r) => r.id === roomTypeId);
        if (!rt) return;
        roomCharge += days * rt.dailyCharge;
        roomNursingCharges += days * (rt.nursingCharge ?? 0);
        rmoCharges += days * (rt.rmoCharge ?? 0);
        incentiviseCharges += days * ((rt as any).incentiviseCharge ?? 0);
        monitorCharges += days * ((rt as any).monitorCharge ?? 0);
        if (includeVisit) visitCharges += days * 2 * (rt.visitCharge ?? 0);
      };

      const toMidnight = (d: Date) => {
        const m = new Date(d);
        m.setHours(0, 0, 0, 0);
        return m;
      };
      const calendarDayDiff = (a: Date, b: Date) =>
        Math.round((b.getTime() - a.getTime()) / (1000 * 3600 * 24));

      if (switches.length === 0) {
        addSegmentCharges(patient.roomTypeId, (patient as any).halfDayDischarge ? 0.5 : daysAdmitted);
      } else {
        let prevDay = toMidnight(admissionDate);
        const dischargeDay = toMidnight(dischargeDate);
        let prevRoomTypeId = switches[0].fromRoomTypeId;
        let lastRoomTypeId = switches[switches.length - 1].toRoomTypeId;

        for (const sw of switches) {
          const switchDay = toMidnight(new Date(sw.switchDate));
          const diffDays = Math.max(0, calendarDayDiff(prevDay, switchDay));
          if (sw.isHalfDay) {
            // Room/nursing/rmo: half-day split (no visit charge yet)
            addSegmentCharges(prevRoomTypeId, diffDays + 0.5, false);
            addSegmentCharges(sw.toRoomTypeId, 0.5, false);
            // Visit charge for regular days before switch day (2 visits per day)
            const oldRt = allRoomTypes.find((r) => r.id === prevRoomTypeId);
            visitCharges += diffDays * 2 * (oldRt?.visitCharge ?? 0);
            // Visit charge for the switch day itself — determined by visitDistribution
            const newRt = allRoomTypes.find((r) => r.id === sw.toRoomTypeId);
            const dist = sw.visitDistribution ?? "old_new";
            if (dist === "old_twice") visitCharges += 2 * (oldRt?.visitCharge ?? 0);
            else if (dist === "new_twice") visitCharges += 2 * (newRt?.visitCharge ?? 0);
            else visitCharges += (oldRt?.visitCharge ?? 0) + (newRt?.visitCharge ?? 0); // old_new
            const nextDay = new Date(switchDay);
            nextDay.setDate(nextDay.getDate() + 1);
            prevDay = nextDay;
          } else {
            addSegmentCharges(prevRoomTypeId, diffDays);
            const nextDay = new Date(switchDay);
            nextDay.setDate(nextDay.getDate() + 1);
            prevDay = nextDay;
            addSegmentCharges(sw.toRoomTypeId, 1);
          }
          prevRoomTypeId = sw.toRoomTypeId;
          lastRoomTypeId = sw.toRoomTypeId;
        }

        const finalDays = Math.max(0, calendarDayDiff(prevDay, toMidnight(dischargeDate)));
        addSegmentCharges(prevRoomTypeId, finalDays);
        if (roomCharge === 0) addSegmentCharges(lastRoomTypeId, 1);
      }

      roomCharge = Math.round(roomCharge);
      roomNursingCharges = Math.round(roomNursingCharges);
      rmoCharges = Math.round(rmoCharges);
      incentiviseCharges = Math.round(incentiviseCharges);
      monitorCharges = Math.round(monitorCharges);
      visitCharges = Math.round(visitCharges);
    }

    const procedureCharges = proceduresList.reduce((acc, p) => acc + p.cost, 0);

    const surgeriesList = await storage.getPatientSurgeries(patientId);
    const surgeryCharges = surgeriesList.reduce((acc, s) =>
      acc + s.surgeryCharge + s.surgeonCharge + s.assistantSurgeonCharge +
      s.anaesthetistCharge + s.otCharge + s.otAssistantCharge +
      ((s as any).armLaminarCharge ?? 0) + ((s as any).airFlowSterilisationCharge ?? 0) + ((s as any).gaksCharge ?? 0), 0);

    const registrationCharge = (patient as any).registrationCharge ?? 400;
    const packageAmount = (patient as any).packageAmount ?? 0;
    const discountAmount = (patient as any).discountAmount ?? 0;
    const discountType = (patient as any).discountType ?? null;

    const grandTotal =
      registrationCharge +
      packageAmount +
      roomCharge +
      roomNursingCharges +
      rmoCharges +
      incentiviseCharges +
      monitorCharges +
      visitCharges +
      doctorCharges +
      medicineCharges +
      nursingCharges +
      otherCharges +
      procedureCharges +
      surgeryCharges;
    const advanceAmount = patient.advanceAmount ?? 0;
    const finalAmount = grandTotal - advanceAmount - discountAmount;

    const roomSwitchesList = await storage.getRoomSwitchesByPatient(patientId);
    roomSwitchesList.sort((a, b) => new Date(a.switchDate).getTime() - new Date(b.switchDate).getTime());

    res.json({
      daysAdmitted,
      roomCharge,
      roomNursingCharges,
      rmoCharges,
      incentiviseCharges,
      monitorCharges,
      visitCharges,
      registrationCharge,
      packageAmount,
      discountAmount,
      discountType,
      doctorCharges,
      medicineCharges,
      nursingCharges,
      otherCharges,
      procedureCharges,
      surgeryCharges,
      grandTotal,
      advanceAmount,
      finalAmount,
      visits,
      prescriptions,
      charges: chargesList,
      procedures: proceduresList,
      surgeries: surgeriesList,
      roomChargesList,
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

      const { toRoomTypeId, bedNumber, isHalfDay, visitDistribution, switchDate, notes } = req.body;
      if (!toRoomTypeId) return res.status(400).json({ message: "toRoomTypeId is required" });
      if (!bedNumber || typeof bedNumber !== "string" || !bedNumber.trim()) {
        return res.status(400).json({ message: "Room number is required" });
      }
      if (patient.roomTypeId === Number(toRoomTypeId)) return res.status(400).json({ message: "Patient is already in this room type" });

      const halfDay = isHalfDay !== false;
      const sw = await storage.createRoomSwitch({
        patientId,
        fromRoomTypeId: patient.roomTypeId,
        toRoomTypeId: Number(toRoomTypeId),
        switchDate: switchDate ? new Date(switchDate) : new Date(),
        isHalfDay: halfDay,
        visitDistribution: halfDay ? (visitDistribution ?? "old_new") : "old_new",
        notes: notes || null,
      });

      await storage.updatePatient(patientId, {
        roomTypeId: Number(toRoomTypeId),
        bedNumber: bedNumber.trim(),
      });

      res.status(201).json(sw);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete('/api/patients/:id/room-switches/:switchId', async (req, res) => {
    try {
      const patientId = Number(req.params.id);
      const switchId = Number(req.params.switchId);
      const patient = await storage.getPatient(patientId);
      if (!patient) return res.status(404).json({ message: "Patient not found" });

      const switches = await storage.getRoomSwitchesByPatient(patientId);
      const switchToDelete = switches.find((sw) => sw.id === switchId);
      if (!switchToDelete) return res.status(404).json({ message: "Room switch not found" });

      await storage.deleteRoomSwitch(switchId);

      const remainingSwitches = (await storage.getRoomSwitchesByPatient(patientId))
        .sort((a, b) => new Date(a.switchDate).getTime() - new Date(b.switchDate).getTime());
      const newRoomTypeId = remainingSwitches.length > 0
        ? remainingSwitches[remainingSwitches.length - 1].toRoomTypeId
        : switchToDelete.fromRoomTypeId;
      await storage.updatePatient(patientId, { roomTypeId: newRoomTypeId });

      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // Patient Room Charges CRUD
  app.get('/api/patients/:id/room-charges', async (req, res) => {
    const patientId = Number(req.params.id);
    const list = await storage.getPatientRoomCharges(patientId);
    res.json(list);
  });

  app.post('/api/patients/:id/room-charges', async (req, res) => {
    try {
      const patientId = Number(req.params.id);
      const patient = await storage.getPatient(patientId);
      if (!patient) return res.status(404).json({ message: "Patient not found" });
      const { date, roomTypeId, roomCharge, nursingCharge, rmoCharge, incentiviseCharge, monitorCharge, visitCharge, notes } = req.body;
      const row = await storage.createPatientRoomCharge({
        patientId,
        date: new Date(date),
        roomTypeId: roomTypeId ? Number(roomTypeId) : null,
        roomCharge: Number(roomCharge ?? 0),
        nursingCharge: Number(nursingCharge ?? 0),
        rmoCharge: Number(rmoCharge ?? 0),
        incentiviseCharge: Number(incentiviseCharge ?? 0),
        monitorCharge: Number(monitorCharge ?? 0),
        visitCharge: Number(visitCharge ?? 0),
        notes: notes || null,
      } as any);
      res.status(201).json(row);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put('/api/patients/:id/room-charges/:chargeId', async (req, res) => {
    try {
      const id = Number(req.params.chargeId);
      const { date, roomTypeId, roomCharge, nursingCharge, rmoCharge, incentiviseCharge, monitorCharge, visitCharge, notes } = req.body;
      const row = await storage.updatePatientRoomCharge(id, {
        date: date ? new Date(date) : undefined,
        roomTypeId: roomTypeId ? Number(roomTypeId) : null,
        roomCharge: roomCharge !== undefined ? Number(roomCharge) : undefined,
        nursingCharge: nursingCharge !== undefined ? Number(nursingCharge) : undefined,
        rmoCharge: rmoCharge !== undefined ? Number(rmoCharge) : undefined,
        incentiviseCharge: incentiviseCharge !== undefined ? Number(incentiviseCharge) : undefined,
        monitorCharge: monitorCharge !== undefined ? Number(monitorCharge) : undefined,
        visitCharge: visitCharge !== undefined ? Number(visitCharge) : undefined,
        notes: notes !== undefined ? (notes || null) : undefined,
      } as any);
      res.json(row);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete('/api/patients/:id/room-charges/:chargeId', async (req, res) => {
    try {
      const id = Number(req.params.chargeId);
      await storage.deletePatientRoomCharge(id);
      res.json({ message: "Deleted" });
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

  app.post(api.medicines.create.path, requireManager, async (req, res) => {
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

  app.post(api.roomTypes.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.roomTypes.create.input.parse(req.body);
      const roomType = await storage.createRoomType(input);
      res.status(201).json(roomType);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.roomNumbers.list.path, async (_req, res) => {
    const list = await storage.getRoomNumbers();
    res.json(list);
  });

  app.post(api.roomNumbers.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.roomNumbers.create.input.parse(req.body);
      const normalizedNumber = input.number.trim();
      const existing = await storage.getRoomNumberByTypeAndNumber(input.roomTypeId, normalizedNumber);
      if (existing) {
        return res.status(400).json({ message: "Room number already exists for this room type" });
      }
      const roomNumber = await storage.createRoomNumber({
        roomTypeId: input.roomTypeId,
        number: normalizedNumber,
      });
      res.status(201).json(roomNumber);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete("/api/room-numbers/:id", requireAdmin, async (req, res) => {
    await storage.deleteRoomNumber(Number(req.params.id));
    res.sendStatus(204);
  });

  app.post(api.visits.create.path, async (req, res) => {
    try {
      const input = api.visits.create.input.parse(req.body);
      const { date, ...visitInput } = input;
      const visit = await storage.createVisit({
        ...visitInput,
        ...(date ? { date: new Date(date) } : {}),
      } as any);
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

  app.get("/api/other-charge-catalog", async (_req, res) => {
    const catalog = await storage.getOtherChargeCatalog();
    res.json(catalog);
  });

  app.post("/api/other-charge-catalog", requireManager, async (req, res) => {
    try {
      const input = z.object({
        name: z.string().min(1),
        category: z.enum(["OTHER", "PROSTHESIS", "PATHOLOGY", "RADIOLOGY"]),
        defaultAmount: z.coerce.number().min(0).default(0),
      }).parse(req.body);
      const item = await storage.createOtherChargeCatalogItem({
        ...input,
        defaultAmount: input.category === "PROSTHESIS" ? 0 : input.defaultAmount,
      });
      res.status(201).json(item);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put("/api/other-charge-catalog/:id", requireManager, async (req, res) => {
    try {
      const input = z.object({
        name: z.string().min(1).optional(),
        category: z.enum(["OTHER", "PROSTHESIS", "PATHOLOGY", "RADIOLOGY"]).optional(),
        defaultAmount: z.coerce.number().min(0).optional(),
      }).parse(req.body);
      const existingItems = await storage.getOtherChargeCatalog();
      const existingItem = existingItems.find((item) => item.id === Number(req.params.id));
      const nextCategory = input.category ?? existingItem?.category;
      const item = await storage.updateOtherChargeCatalogItem(Number(req.params.id), {
        ...input,
        ...(nextCategory === "PROSTHESIS" ? { defaultAmount: 0 } : {}),
      });
      res.json(item);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete("/api/other-charge-catalog/:id", requireManager, async (req, res) => {
    await storage.deleteOtherChargeCatalogItem(Number(req.params.id));
    res.sendStatus(204);
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
        date: z.string().optional(),
        surgeryCharge: z.coerce.number().min(0).default(0),
        surgeonCharge: z.coerce.number().min(0).default(0),
        assistantSurgeonCharge: z.coerce.number().min(0).default(0),
        anaesthetistCharge: z.coerce.number().min(0).default(0),
        otCharge: z.coerce.number().min(0).default(0),
        otAssistantCharge: z.coerce.number().min(0).default(0),
        armLaminarCharge: z.coerce.number().min(0).default(0),
        airFlowSterilisationCharge: z.coerce.number().min(0).default(0),
        gaksCharge: z.coerce.number().min(0).default(0),
      }).parse(req.body);
      const { date, ...rest } = data;
      const surgeryData: any = { patientId, ...rest };
      if (date) surgeryData.date = new Date(date);
      const surgery = await storage.createPatientSurgery(surgeryData);
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

    const totalAdmitted = patientsList.filter((p) => !p.discharged).length;
    const totalBedsOccupied = totalAdmitted;
    const todayKey = nowIST().toISOString().slice(0, 10);
    const totalDischargedToday = patientsList.filter((patient) => {
      if (!patient.discharged || !patient.expectedDischargeDate) return false;
      return new Date(patient.expectedDischargeDate).toISOString().slice(0, 10) === todayKey;
    }).length;

    res.json({
      totalAdmitted,
      totalBedsOccupied,
      totalDischargedToday,
      activeDoctors: doctorsList.length,
    });
  });

  return httpServer;
}
