import type { IncomingMessage, ServerResponse } from "http";
import type { Connect } from "vite";
import type { Plugin } from "vite";

type DemoRole = "ADMIN" | "MANAGER" | "DOCTOR";

type DemoUser = {
  id: number;
  name: string;
  email: string;
  password: string;
  role: DemoRole;
};

type DemoRoomType = {
  id: number;
  name: string;
  dailyCharge: number;
  nursingCharge: number;
  rmoCharge: number;
  visitCharge: number;
};

type DemoDoctor = {
  id: number;
  name: string;
  specialization: string;
  visitCharge: number;
  userId: number;
  isSurgeon: boolean;
  isAssistantSurgeon: boolean;
  isOtAssistant: boolean;
  isAnaesthetist: boolean;
};

type DemoPatient = {
  id: number;
  ipdNumber: string | null;
  name: string;
  gender: string;
  dateOfBirth: string;
  phone: string | null;
  relativePhone: string | null;
  illness: string | null;
  admissionDate: string;
  expectedDischargeDate: string | null;
  roomTypeId: number;
  bedNumber: string;
  discharged: boolean;
  createdAt: string;
  assignedDoctorIds: number[];
};

type DemoMedicine = {
  id: number;
  name: string;
  unitCost: number;
};

const AUTH_COOKIE = "criticare_preview_auth";

const demoUsers: DemoUser[] = [
  {
    id: 1,
    name: "Hospital Admin",
    email: "admin@test.com",
    password: "admin123",
    role: "ADMIN",
  },
  {
    id: 2,
    name: "Hospital Manager",
    email: "manager@test.com",
    password: "password123",
    role: "MANAGER",
  },
  {
    id: 3,
    name: "Dr. John Smith",
    email: "doctor@test.com",
    password: "password123",
    role: "DOCTOR",
  },
];

const demoRoomTypes: DemoRoomType[] = [
  { id: 1, name: "General Ward", dailyCharge: 500, nursingCharge: 100, rmoCharge: 100, visitCharge: 200 },
  { id: 2, name: "Semi-Private Room", dailyCharge: 1200, nursingCharge: 240, rmoCharge: 240, visitCharge: 480 },
  { id: 3, name: "Private Room", dailyCharge: 2500, nursingCharge: 500, rmoCharge: 500, visitCharge: 1000 },
  { id: 4, name: "ICU", dailyCharge: 5000, nursingCharge: 1000, rmoCharge: 1000, visitCharge: 2000 },
];

const demoDoctors: DemoDoctor[] = [
  {
    id: 1,
    name: "John Smith",
    specialization: "General Medicine",
    visitCharge: 400,
    userId: 3,
    isSurgeon: false,
    isAssistantSurgeon: false,
    isOtAssistant: false,
    isAnaesthetist: false,
  },
  {
    id: 2,
    name: "Priya Sharma",
    specialization: "Cardiology",
    visitCharge: 550,
    userId: 4,
    isSurgeon: false,
    isAssistantSurgeon: false,
    isOtAssistant: false,
    isAnaesthetist: false,
  },
  {
    id: 3,
    name: "Rahul Mehta",
    specialization: "Orthopedics",
    visitCharge: 650,
    userId: 5,
    isSurgeon: true,
    isAssistantSurgeon: false,
    isOtAssistant: false,
    isAnaesthetist: false,
  },
];

const demoPatients: DemoPatient[] = [
  {
    id: 1,
    ipdNumber: "IPD-24001",
    name: "Aarav Patel",
    gender: "Male",
    dateOfBirth: "1988-07-16",
    phone: "9876543210",
    relativePhone: "9876500001",
    illness: "Post-operative observation",
    admissionDate: "2026-04-02T10:00:00.000Z",
    expectedDischargeDate: null,
    roomTypeId: 3,
    bedNumber: "P-12",
    discharged: false,
    createdAt: "2026-04-02T10:00:00.000Z",
    assignedDoctorIds: [1, 3],
  },
  {
    id: 2,
    ipdNumber: "IPD-24002",
    name: "Sana Khan",
    gender: "Female",
    dateOfBirth: "1996-03-08",
    phone: "9898989898",
    relativePhone: "9898000002",
    illness: "Cardiac monitoring",
    admissionDate: "2026-04-03T06:30:00.000Z",
    expectedDischargeDate: null,
    roomTypeId: 4,
    bedNumber: "ICU-04",
    discharged: false,
    createdAt: "2026-04-03T06:30:00.000Z",
    assignedDoctorIds: [2],
  },
  {
    id: 3,
    ipdNumber: "IPD-24003",
    name: "Meera Joshi",
    gender: "Female",
    dateOfBirth: "1979-11-21",
    phone: "9811111111",
    relativePhone: "9811222222",
    illness: "Diabetes management",
    admissionDate: "2026-04-01T08:15:00.000Z",
    expectedDischargeDate: "2026-04-05T09:00:00.000Z",
    roomTypeId: 2,
    bedNumber: "SP-07",
    discharged: true,
    createdAt: "2026-04-01T08:15:00.000Z",
    assignedDoctorIds: [1],
  },
];

const demoMedicines: DemoMedicine[] = [
  { id: 1, name: "Paracetamol 650", unitCost: 12 },
  { id: 2, name: "Ceftriaxone", unitCost: 180 },
  { id: 3, name: "Pantoprazole", unitCost: 24 },
];

const demoVisitsByPatientId: Record<number, Array<{ id: number; patientId: number; doctorId: number; date: string; charge: number }>> = {
  1: [
    { id: 1, patientId: 1, doctorId: 1, date: "2026-04-03T09:30:00.000Z", charge: 400 },
    { id: 2, patientId: 1, doctorId: 3, date: "2026-04-04T11:00:00.000Z", charge: 650 },
  ],
  2: [
    { id: 3, patientId: 2, doctorId: 2, date: "2026-04-04T08:45:00.000Z", charge: 550 },
  ],
  3: [
    { id: 4, patientId: 3, doctorId: 1, date: "2026-04-02T10:00:00.000Z", charge: 400 },
  ],
};

const demoPrescriptionsByPatientId: Record<number, Array<{ id: number; patientId: number; medicineId: number; quantity: number; totalCost: number; date: string }>> = {
  1: [
    { id: 1, patientId: 1, medicineId: 1, quantity: 10, totalCost: 120, date: "2026-04-03T14:00:00.000Z" },
    { id: 2, patientId: 1, medicineId: 2, quantity: 4, totalCost: 720, date: "2026-04-04T09:00:00.000Z" },
  ],
  2: [
    { id: 3, patientId: 2, medicineId: 3, quantity: 6, totalCost: 144, date: "2026-04-04T10:30:00.000Z" },
  ],
  3: [
    { id: 4, patientId: 3, medicineId: 1, quantity: 8, totalCost: 96, date: "2026-04-02T13:00:00.000Z" },
  ],
};

const demoChargesByPatientId: Record<number, Array<{ id: number; patientId: number; type: string; description: string | null; amount: number; date: string }>> = {
  1: [
    { id: 1, patientId: 1, type: "OTHER", description: "Dressing materials", amount: 350, date: "2026-04-03T16:00:00.000Z" },
  ],
  2: [
    { id: 2, patientId: 2, type: "NURSING", description: "Critical care nursing support", amount: 600, date: "2026-04-04T18:00:00.000Z" },
  ],
  3: [],
};

const demoProceduresByPatientId: Record<number, Array<{ id: number; patientId: number; doctorId: number | null; name: string; description: string | null; cost: number; date: string }>> = {
  1: [
    { id: 1, patientId: 1, doctorId: 1, name: "Wound Care", description: "Post-op review and dressing", cost: 500, date: "2026-04-04T12:00:00.000Z" },
  ],
  2: [],
  3: [],
};

const demoSurgeriesByPatientId: Record<number, Array<{ id: number; patientId: number; surgeryName: string; date: string; surgeryCharge: number; surgeonCharge: number; assistantSurgeonCharge: number; anaesthetistCharge: number; otCharge: number; otAssistantCharge: number }>> = {
  1: [
    {
      id: 1,
      patientId: 1,
      surgeryName: "Appendectomy",
      date: "2026-04-02T15:30:00.000Z",
      surgeryCharge: 5000,
      surgeonCharge: 2500,
      assistantSurgeonCharge: 1200,
      anaesthetistCharge: 1000,
      otCharge: 800,
      otAssistantCharge: 500,
    },
  ],
  2: [],
  3: [],
};

const demoProcedureCatalog = [
  { id: 1, name: "Wound Care", description: "Post-op review and dressing", cost: 500 },
  { id: 2, name: "ECHO", description: "Cardiac diagnostic procedure", cost: 1800 },
];

const demoSurgeryNames = [
  { id: 1, name: "Appendectomy" },
  { id: 2, name: "CABG" },
  { id: 3, name: "Hernia Repair" },
];

const demoSurgeryCatalog = [
  { id: 1, name: "Major OT Package", category: "SURGERY", cost: 5000 },
  { id: 2, name: "Laminar Airflow", category: "OT", cost: 1200 },
  { id: 3, name: "C-Arm Charge", category: "OT", cost: 1800 },
  { id: 4, name: "Senior Surgeon", category: "SURGEON", cost: 2500 },
];

const demoOtherChargeCatalog = [
  { id: 1, name: "Dressing materials", category: "OTHER", defaultAmount: 350 },
  { id: 2, name: "Stent", category: "PROSTHESIS", defaultAmount: 18000 },
  { id: 3, name: "CBC", category: "PATHOLOGY", defaultAmount: 450 },
  { id: 4, name: "CT Scan", category: "RADIOLOGY", defaultAmount: 2200 },
];

const doctorStatsByUserId: Record<number, { visitCount: number; revenueGenerated: number }> = {
  3: { visitCount: 18, revenueGenerated: 7200 },
  4: { visitCount: 11, revenueGenerated: 6050 },
  5: { visitCount: 9, revenueGenerated: 5850 },
};

function parseCookies(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((cookies, entry) => {
      const separatorIndex = entry.indexOf("=");
      if (separatorIndex === -1) return cookies;
      const key = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function getSessionUser(req: IncomingMessage) {
  const cookies = parseCookies(req.headers.cookie);
  return demoUsers.find((user) => user.email === cookies[AUTH_COOKIE]) ?? null;
}

function toPublicUser(user: DemoUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function sendJson(res: ServerResponse, statusCode: number, data: unknown, headers?: Record<string, string>) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      res.setHeader(key, value);
    }
  }
  res.end(JSON.stringify(data));
}

function readBody(req: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function unauthorized(res: ServerResponse) {
  sendJson(res, 401, { message: "Not authenticated" });
}

function forbidden(res: ServerResponse) {
  sendJson(res, 403, { message: "Admin access required" });
}

function currentTimestamp() {
  return new Date().toISOString();
}

function getDoctorPatientsForUserId(userId: number) {
  const doctor = demoDoctors.find((entry) => entry.userId === userId);
  if (!doctor) return [];
  return demoPatients.filter((patient) => patient.assignedDoctorIds.includes(doctor.id));
}

function getDashboardOverview() {
  const activePatients = demoPatients.filter((patient) => !patient.discharged);
  const totalDischargedToday = demoPatients.filter(
    (patient) => patient.discharged && patient.expectedDischargeDate?.startsWith("2026-04-05"),
  ).length;

  return {
    totalAdmitted: activePatients.length,
    totalBedsOccupied: activePatients.length,
    totalDischargedToday,
    activeDoctors: demoDoctors.length,
  };
}

function getPatientBill(patientId: number) {
  const patient = demoPatients.find((entry) => entry.id === patientId);
  if (!patient) return null;

  const roomType = demoRoomTypes.find((entry) => entry.id === patient.roomTypeId);
  const visits = demoVisitsByPatientId[patientId] ?? [];
  const prescriptions = demoPrescriptionsByPatientId[patientId] ?? [];
  const charges = demoChargesByPatientId[patientId] ?? [];
  const procedures = demoProceduresByPatientId[patientId] ?? [];
  const surgeries = demoSurgeriesByPatientId[patientId] ?? [];

  const admissionDate = new Date(patient.admissionDate);
  const dischargeDate = patient.expectedDischargeDate
    ? new Date(patient.expectedDischargeDate)
    : new Date("2026-04-05T12:00:00.000Z");
  const daysAdmitted = Math.max(
    1,
    Math.ceil((dischargeDate.getTime() - admissionDate.getTime()) / (1000 * 3600 * 24)),
  );

  const roomCharge = (roomType?.dailyCharge ?? 0) * daysAdmitted;
  const roomNursingCharges = (roomType?.nursingCharge ?? 0) * daysAdmitted;
  const rmoCharges = (roomType?.rmoCharge ?? 0) * daysAdmitted;
  const visitCharges = (roomType?.visitCharge ?? 0) * daysAdmitted;
  const doctorCharges = visits.reduce((sum, visit) => sum + visit.charge, 0);
  const medicineCharges = prescriptions.reduce((sum, prescription) => sum + prescription.totalCost, 0);
  const nursingCharges = charges
    .filter((charge) => charge.type === "NURSING")
    .reduce((sum, charge) => sum + charge.amount, 0);
  const otherCharges = charges
    .filter((charge) => charge.type === "OTHER")
    .reduce((sum, charge) => sum + charge.amount, 0);
  const procedureCharges = procedures.reduce((sum, procedure) => sum + procedure.cost, 0);
  const surgeryCharges = surgeries.reduce(
    (sum, surgery) =>
      sum +
      surgery.surgeryCharge +
      surgery.surgeonCharge +
      surgery.assistantSurgeonCharge +
      surgery.anaesthetistCharge +
      surgery.otCharge +
      surgery.otAssistantCharge,
    0,
  );

  return {
    daysAdmitted,
    roomCharge,
    roomNursingCharges,
    rmoCharges,
    visitCharges,
    doctorCharges,
    medicineCharges,
    nursingCharges,
    otherCharges,
    procedureCharges,
    surgeryCharges,
    grandTotal:
      roomCharge +
      roomNursingCharges +
      rmoCharges +
      visitCharges +
      doctorCharges +
      medicineCharges +
      nursingCharges +
      otherCharges +
      procedureCharges +
      surgeryCharges,
    visits,
    prescriptions,
    charges,
    procedures,
    surgeries,
    roomChargesList: [],
    roomSwitches: [],
    patient,
  };
}

function createPreviewMiddleware(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    if (!req.url) return next();

    const url = new URL(req.url, "http://localhost");
    const pathname = url.pathname;

    if (!pathname.startsWith("/api/")) {
      return next();
    }

    if (req.method === "POST" && pathname === "/api/auth/login") {
      const payload = JSON.parse((await readBody(req)) || "{}") as {
        email?: string;
        password?: string;
      };
      const user = demoUsers.find(
        (entry) => entry.email === payload.email && entry.password === payload.password,
      );
      if (!user) {
        return sendJson(res, 401, { message: "Invalid credentials" });
      }
      return sendJson(
        res,
        200,
        toPublicUser(user),
        { "Set-Cookie": `${AUTH_COOKIE}=${encodeURIComponent(user.email)}; Path=/; SameSite=Lax` },
      );
    }

    if (req.method === "POST" && pathname === "/api/auth/logout") {
      return sendJson(
        res,
        200,
        { message: "Logged out successfully" },
        { "Set-Cookie": `${AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax` },
      );
    }

    const sessionUser = getSessionUser(req);

    if (req.method === "GET" && pathname === "/api/auth/me") {
      if (!sessionUser) return unauthorized(res);
      return sendJson(res, 200, toPublicUser(sessionUser));
    }

    if (!sessionUser) {
      return unauthorized(res);
    }

    if (req.method === "GET" && pathname === "/api/dashboard/overview") {
      return sendJson(res, 200, getDashboardOverview());
    }

    if (req.method === "GET" && pathname === "/api/patients") {
      return sendJson(res, 200, demoPatients);
    }

    if (req.method === "GET" && /^\/api\/patients\/\d+\/bill$/.test(pathname)) {
      const patientId = Number(pathname.split("/")[3]);
      const bill = getPatientBill(patientId);
      if (!bill) {
        return sendJson(res, 404, { message: "Patient not found" });
      }
      return sendJson(res, 200, bill);
    }

    if (req.method === "GET" && /^\/api\/patients\/\d+\/doctors$/.test(pathname)) {
      const patientId = Number(pathname.split("/")[3]);
      const patient = demoPatients.find((entry) => entry.id === patientId);
      if (!patient) {
        return sendJson(res, 404, { message: "Patient not found" });
      }
      const assignedDoctors = patient.assignedDoctorIds
        .map((doctorId) => demoDoctors.find((doctor) => doctor.id === doctorId))
        .filter((doctor): doctor is DemoDoctor => Boolean(doctor))
        .map((doctor, index) => ({
          id: index + 1,
          patientId,
          doctorId: doctor.id,
          doctorName: doctor.name,
        }));
      return sendJson(res, 200, assignedDoctors);
    }

    if (req.method === "POST" && pathname === "/api/patients") {
      const payload = JSON.parse((await readBody(req)) || "{}") as Partial<DemoPatient>;
      const nextId = Math.max(0, ...demoPatients.map((patient) => patient.id)) + 1;
      const patient: DemoPatient = {
        id: nextId,
        ipdNumber: payload.ipdNumber?.trim() || `IPD-${String(24000 + nextId)}`,
        name: payload.name ?? "New Patient",
        gender: payload.gender ?? "Male",
        dateOfBirth: payload.dateOfBirth ?? "1990-01-01",
        phone: payload.phone ?? null,
        relativePhone: payload.relativePhone ?? null,
        illness: payload.illness ?? null,
        admissionDate: currentTimestamp(),
        expectedDischargeDate: null,
        roomTypeId: Number(payload.roomTypeId ?? 1),
        bedNumber: payload.bedNumber ?? `B-${nextId}`,
        discharged: false,
        createdAt: currentTimestamp(),
        assignedDoctorIds: payload.assignedDoctorIds ?? [],
      };
      demoPatients.unshift(patient);
      return sendJson(res, 201, patient);
    }

    if (req.method === "GET" && /^\/api\/patients\/\d+$/.test(pathname)) {
      const patientId = Number(pathname.split("/").at(-1));
      const patient = demoPatients.find((entry) => entry.id === patientId);
      if (!patient) {
        return sendJson(res, 404, { message: "Patient not found" });
      }
      return sendJson(res, 200, patient);
    }

    if (req.method === "GET" && pathname === "/api/doctors") {
      return sendJson(res, 200, demoDoctors);
    }

    if (req.method === "POST" && pathname === "/api/doctors") {
      if (sessionUser.role !== "ADMIN") return forbidden(res);
      const payload = JSON.parse((await readBody(req)) || "{}") as Partial<DemoDoctor>;
      const nextId = Math.max(0, ...demoDoctors.map((doctor) => doctor.id)) + 1;
      const doctor: DemoDoctor = {
        id: nextId,
        name: payload.name ?? "New Doctor",
        specialization: payload.specialization ?? "General Medicine",
        visitCharge: Number(payload.visitCharge ?? 0),
        userId: Number(payload.userId ?? 0),
        isSurgeon: Boolean(payload.isSurgeon),
        isAssistantSurgeon: Boolean(payload.isAssistantSurgeon),
        isOtAssistant: Boolean(payload.isOtAssistant),
        isAnaesthetist: Boolean((payload as { isAnaesthetist?: boolean }).isAnaesthetist),
      };
      demoDoctors.unshift(doctor);
      return sendJson(res, 201, doctor);
    }

    if (req.method === "GET" && /^\/api\/doctors\/\d+\/stats$/.test(pathname)) {
      const userId = Number(pathname.split("/")[3]);
      return sendJson(res, 200, doctorStatsByUserId[userId] ?? { visitCount: 0, revenueGenerated: 0 });
    }

    if (req.method === "GET" && /^\/api\/doctors\/\d+\/patients$/.test(pathname)) {
      const userId = Number(pathname.split("/")[3]);
      return sendJson(res, 200, getDoctorPatientsForUserId(userId));
    }

    if (req.method === "GET" && pathname === "/api/medicines") {
      return sendJson(res, 200, demoMedicines);
    }

    if (req.method === "GET" && pathname === "/api/procedure-catalog") {
      return sendJson(res, 200, demoProcedureCatalog);
    }

    if (req.method === "POST" && pathname === "/api/procedure-catalog") {
      const payload = JSON.parse((await readBody(req)) || "{}") as { name?: string; description?: string | null; cost?: number };
      const nextId = Math.max(0, ...demoProcedureCatalog.map((item) => item.id)) + 1;
      const item = {
        id: nextId,
        name: payload.name ?? "New Procedure",
        description: payload.description ?? null,
        cost: Number(payload.cost ?? 0),
      };
      demoProcedureCatalog.unshift(item);
      return sendJson(res, 201, item);
    }

    if (req.method === "PUT" && /^\/api\/procedure-catalog\/\d+$/.test(pathname)) {
      const id = Number(pathname.split("/").at(-1));
      const payload = JSON.parse((await readBody(req)) || "{}") as { name?: string; description?: string | null; cost?: number };
      const item = demoProcedureCatalog.find((entry) => entry.id === id);
      if (!item) return sendJson(res, 404, { message: "Procedure not found" });
      if (payload.name !== undefined) item.name = payload.name;
      if (payload.description !== undefined) item.description = payload.description;
      if (payload.cost !== undefined) item.cost = Number(payload.cost);
      return sendJson(res, 200, item);
    }

    if (req.method === "DELETE" && /^\/api\/procedure-catalog\/\d+$/.test(pathname)) {
      const id = Number(pathname.split("/").at(-1));
      const index = demoProcedureCatalog.findIndex((entry) => entry.id === id);
      if (index >= 0) demoProcedureCatalog.splice(index, 1);
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method === "GET" && pathname === "/api/surgery-names") {
      return sendJson(res, 200, demoSurgeryNames);
    }

    if (req.method === "POST" && pathname === "/api/surgery-names") {
      const payload = JSON.parse((await readBody(req)) || "{}") as { name?: string };
      const nextId = Math.max(0, ...demoSurgeryNames.map((item) => item.id)) + 1;
      const item = { id: nextId, name: payload.name ?? "New Surgery" };
      demoSurgeryNames.unshift(item);
      return sendJson(res, 201, item);
    }

    if (req.method === "PUT" && /^\/api\/surgery-names\/\d+$/.test(pathname)) {
      const id = Number(pathname.split("/").at(-1));
      const payload = JSON.parse((await readBody(req)) || "{}") as { name?: string };
      const item = demoSurgeryNames.find((entry) => entry.id === id);
      if (!item) return sendJson(res, 404, { message: "Surgery name not found" });
      if (payload.name !== undefined) item.name = payload.name;
      return sendJson(res, 200, item);
    }

    if (req.method === "DELETE" && /^\/api\/surgery-names\/\d+$/.test(pathname)) {
      const id = Number(pathname.split("/").at(-1));
      const index = demoSurgeryNames.findIndex((entry) => entry.id === id);
      if (index >= 0) demoSurgeryNames.splice(index, 1);
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method === "GET" && pathname === "/api/surgery-catalog") {
      return sendJson(res, 200, demoSurgeryCatalog);
    }

    if (req.method === "POST" && pathname === "/api/surgery-catalog") {
      const payload = JSON.parse((await readBody(req)) || "{}") as { name?: string; category?: string; cost?: number };
      const nextId = Math.max(0, ...demoSurgeryCatalog.map((item) => item.id)) + 1;
      const item = {
        id: nextId,
        name: payload.name ?? "New Surgery Catalog Entry",
        category: payload.category ?? "SURGERY",
        cost: Number(payload.cost ?? 0),
      };
      demoSurgeryCatalog.unshift(item);
      return sendJson(res, 201, item);
    }

    if (req.method === "PUT" && /^\/api\/surgery-catalog\/\d+$/.test(pathname)) {
      const id = Number(pathname.split("/").at(-1));
      const payload = JSON.parse((await readBody(req)) || "{}") as { name?: string; category?: string; cost?: number };
      const item = demoSurgeryCatalog.find((entry) => entry.id === id);
      if (!item) return sendJson(res, 404, { message: "Surgery catalog item not found" });
      if (payload.name !== undefined) item.name = payload.name;
      if (payload.category !== undefined) item.category = payload.category;
      if (payload.cost !== undefined) item.cost = Number(payload.cost);
      return sendJson(res, 200, item);
    }

    if (req.method === "DELETE" && /^\/api\/surgery-catalog\/\d+$/.test(pathname)) {
      const id = Number(pathname.split("/").at(-1));
      const index = demoSurgeryCatalog.findIndex((entry) => entry.id === id);
      if (index >= 0) demoSurgeryCatalog.splice(index, 1);
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method === "GET" && pathname === "/api/other-charge-catalog") {
      return sendJson(res, 200, demoOtherChargeCatalog);
    }

    if (req.method === "POST" && pathname === "/api/other-charge-catalog") {
      const payload = JSON.parse((await readBody(req)) || "{}") as { name?: string; category?: string; defaultAmount?: number };
      const nextId = Math.max(0, ...demoOtherChargeCatalog.map((item) => item.id)) + 1;
      const item = {
        id: nextId,
        name: payload.name ?? "New Charge",
        category: payload.category ?? "OTHER",
        defaultAmount: Number(payload.defaultAmount ?? 0),
      };
      demoOtherChargeCatalog.unshift(item);
      return sendJson(res, 201, item);
    }

    if (req.method === "PUT" && /^\/api\/other-charge-catalog\/\d+$/.test(pathname)) {
      const id = Number(pathname.split("/").at(-1));
      const payload = JSON.parse((await readBody(req)) || "{}") as { name?: string; category?: string; defaultAmount?: number };
      const item = demoOtherChargeCatalog.find((entry) => entry.id === id);
      if (!item) return sendJson(res, 404, { message: "Catalog item not found" });
      if (payload.name !== undefined) item.name = payload.name;
      if (payload.category !== undefined) item.category = payload.category;
      if (payload.defaultAmount !== undefined) item.defaultAmount = Number(payload.defaultAmount);
      return sendJson(res, 200, item);
    }

    if (req.method === "DELETE" && /^\/api\/other-charge-catalog\/\d+$/.test(pathname)) {
      const id = Number(pathname.split("/").at(-1));
      const index = demoOtherChargeCatalog.findIndex((entry) => entry.id === id);
      if (index >= 0) demoOtherChargeCatalog.splice(index, 1);
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method === "POST" && pathname === "/api/medicines") {
      const payload = JSON.parse((await readBody(req)) || "{}") as Partial<DemoMedicine>;
      const nextId = Math.max(0, ...demoMedicines.map((medicine) => medicine.id)) + 1;
      const medicine: DemoMedicine = {
        id: nextId,
        name: payload.name ?? "New Medicine",
        unitCost: Number(payload.unitCost ?? 0),
      };
      demoMedicines.unshift(medicine);
      return sendJson(res, 201, medicine);
    }

    if (req.method === "GET" && pathname === "/api/room-types") {
      return sendJson(res, 200, demoRoomTypes);
    }

    if (req.method === "POST" && pathname === "/api/room-types") {
      const payload = JSON.parse((await readBody(req)) || "{}") as Partial<DemoRoomType>;
      const nextId = Math.max(0, ...demoRoomTypes.map((room) => room.id)) + 1;
      const roomType: DemoRoomType = {
        id: nextId,
        name: payload.name ?? "New Room Type",
        dailyCharge: Number(payload.dailyCharge ?? 0),
        nursingCharge: Number(payload.nursingCharge ?? 0),
        rmoCharge: Number(payload.rmoCharge ?? 0),
        visitCharge: Number(payload.visitCharge ?? 0),
      };
      demoRoomTypes.unshift(roomType);
      return sendJson(res, 201, roomType);
    }

    if (req.method === "GET" && pathname === "/api/admin/users") {
      if (sessionUser.role !== "ADMIN") return forbidden(res);
      return sendJson(
        res,
        200,
        demoUsers.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        })),
      );
    }

    if (req.method === "POST" && pathname === "/api/auth/register") {
      if (sessionUser.role !== "ADMIN") return forbidden(res);
      const payload = JSON.parse((await readBody(req)) || "{}") as Partial<DemoUser>;
      const nextId = Math.max(0, ...demoUsers.map((user) => user.id)) + 1;
      const user: DemoUser = {
        id: nextId,
        name: payload.name ?? "New User",
        email: payload.email ?? `user${nextId}@test.com`,
        password: payload.password ?? "password123",
        role: (payload.role as DemoRole | undefined) ?? "DOCTOR",
      };
      demoUsers.push(user);
      return sendJson(res, 201, toPublicUser(user));
    }

    return sendJson(res, 501, {
      message: `Preview mode does not implement ${req.method} ${pathname} yet.`,
    });
  };
}

export function previewLocalApiPlugin(): Plugin {
  return {
    name: "criticare-preview-local-api",
    configureServer(server) {
      server.middlewares.use(createPreviewMiddleware());
    },
  };
}
