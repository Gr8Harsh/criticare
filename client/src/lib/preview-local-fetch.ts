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

type DemoRoomNumber = {
  id: number;
  roomTypeId: number;
  number: string;
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
  advanceAmount: number;
  discharged: boolean;
  createdAt: string;
  assignedDoctorIds: number[];
};

type DemoMedicine = {
  id: number;
  name: string;
  unitCost: number;
};

const SESSION_KEY = "criticare-preview-session-email";

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

const demoRoomNumbers: DemoRoomNumber[] = [
  { id: 1, roomTypeId: 1, number: "GW-01" },
  { id: 2, roomTypeId: 1, number: "GW-02" },
  { id: 3, roomTypeId: 2, number: "SP-07" },
  { id: 4, roomTypeId: 3, number: "P-12" },
  { id: 5, roomTypeId: 4, number: "ICU-04" },
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
    advanceAmount: 5000,
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
    advanceAmount: 2500,
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
    advanceAmount: 1000,
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
  { id: 2, name: "Stent", category: "PROSTHESIS", defaultAmount: 0 },
  { id: 3, name: "CBC", category: "PATHOLOGY", defaultAmount: 450 },
  { id: 4, name: "CT Scan", category: "RADIOLOGY", defaultAmount: 2200 },
];

const doctorStatsByUserId: Record<number, { visitCount: number; revenueGenerated: number }> = {
  3: { visitCount: 18, revenueGenerated: 7200 },
  4: { visitCount: 11, revenueGenerated: 6050 },
  5: { visitCount: 9, revenueGenerated: 5850 },
};

let installed = false;

function jsonResponse(status: number, body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function nowIso() {
  return new Date().toISOString();
}

function getSessionUser() {
  const email = window.sessionStorage.getItem(SESSION_KEY);
  return demoUsers.find((user) => user.email === email) ?? null;
}

function toPublicUser(user: DemoUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
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
    .filter((charge) => charge.type !== "NURSING")
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
  const grandTotal =
    roomCharge +
    roomNursingCharges +
    rmoCharges +
    visitCharges +
    doctorCharges +
    medicineCharges +
    nursingCharges +
    otherCharges +
    procedureCharges +
    surgeryCharges;
  const advanceAmount = patient.advanceAmount ?? 0;

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
    grandTotal,
    advanceAmount,
    finalAmount: grandTotal - advanceAmount,
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

async function readJsonBody(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.body && typeof init.body === "string") {
    return JSON.parse(init.body);
  }
  if (input instanceof Request) {
    const text = await input.clone().text();
    return text ? JSON.parse(text) : {};
  }
  return {};
}

async function handlePreviewApi(input: RequestInfo | URL, init?: RequestInit) {
  const url = new URL(
    typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url,
    window.location.origin,
  );
  const pathname = url.pathname;
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();

  if (!pathname.startsWith("/api/")) {
    return null;
  }

  if (method === "POST" && pathname === "/api/auth/login") {
    const payload = (await readJsonBody(input, init)) as { email?: string; password?: string };
    const user = demoUsers.find(
      (entry) => entry.email === payload.email && entry.password === payload.password,
    );
    if (!user) {
      return jsonResponse(401, { message: "Invalid credentials" });
    }
    window.sessionStorage.setItem(SESSION_KEY, user.email);
    return jsonResponse(200, toPublicUser(user));
  }

  if (method === "POST" && pathname === "/api/auth/logout") {
    window.sessionStorage.removeItem(SESSION_KEY);
    return jsonResponse(200, { message: "Logged out successfully" });
  }

  const sessionUser = getSessionUser();

  if (method === "GET" && pathname === "/api/auth/me") {
    if (!sessionUser) {
      return jsonResponse(401, { message: "Not authenticated" });
    }
    return jsonResponse(200, toPublicUser(sessionUser));
  }

  if (!sessionUser) {
    return jsonResponse(401, { message: "Not authenticated" });
  }

  if (method === "GET" && pathname === "/api/dashboard/overview") {
    return jsonResponse(200, getDashboardOverview());
  }

  if (method === "GET" && pathname === "/api/patients") {
    return jsonResponse(200, demoPatients);
  }

  if (method === "GET" && /^\/api\/patients\/\d+\/bill$/.test(pathname)) {
    const patientId = Number(pathname.split("/")[3]);
    const bill = getPatientBill(patientId);
    return bill
      ? jsonResponse(200, bill)
      : jsonResponse(404, { message: "Patient not found" });
  }

  if (method === "GET" && /^\/api\/patients\/\d+\/doctors$/.test(pathname)) {
    const patientId = Number(pathname.split("/")[3]);
    const patient = demoPatients.find((entry) => entry.id === patientId);
    if (!patient) {
      return jsonResponse(404, { message: "Patient not found" });
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
    return jsonResponse(200, assignedDoctors);
  }

  if (method === "POST" && pathname === "/api/patients") {
    const payload = (await readJsonBody(input, init)) as Partial<DemoPatient>;
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
      admissionDate: nowIso(),
      expectedDischargeDate: null,
      roomTypeId: Number(payload.roomTypeId ?? 1),
      bedNumber: payload.bedNumber ?? `B-${nextId}`,
      advanceAmount: Number(payload.advanceAmount ?? 0),
      discharged: false,
      createdAt: nowIso(),
      assignedDoctorIds: payload.assignedDoctorIds ?? [],
    };
    demoPatients.unshift(patient);
    return jsonResponse(201, patient);
  }

  if (method === "GET" && /^\/api\/patients\/\d+$/.test(pathname)) {
    const patientId = Number(pathname.split("/").at(-1));
    const patient = demoPatients.find((entry) => entry.id === patientId);
    return patient
      ? jsonResponse(200, patient)
      : jsonResponse(404, { message: "Patient not found" });
  }

  if (method === "PUT" && /^\/api\/patients\/\d+$/.test(pathname)) {
    const patientId = Number(pathname.split("/").at(-1));
    const patient = demoPatients.find((entry) => entry.id === patientId);
    if (!patient) return jsonResponse(404, { message: "Patient not found" });

    const payload = (await readJsonBody(input, init)) as Partial<DemoPatient>;
    Object.assign(patient, {
      ...payload,
      roomTypeId: payload.roomTypeId !== undefined ? Number(payload.roomTypeId) : patient.roomTypeId,
      advanceAmount: payload.advanceAmount !== undefined ? Number(payload.advanceAmount) : patient.advanceAmount,
    });
    return jsonResponse(200, patient);
  }

  if (method === "GET" && pathname === "/api/doctors") {
    return jsonResponse(200, demoDoctors);
  }

  if (method === "GET" && /^\/api\/doctors\/\d+\/stats$/.test(pathname)) {
    const userId = Number(pathname.split("/")[3]);
    return jsonResponse(200, doctorStatsByUserId[userId] ?? { visitCount: 0, revenueGenerated: 0 });
  }

  if (method === "GET" && /^\/api\/doctors\/\d+\/patients$/.test(pathname)) {
    const userId = Number(pathname.split("/")[3]);
    const doctor = demoDoctors.find((entry) => entry.userId === userId);
    const patients = doctor
      ? demoPatients.filter((patient) => patient.assignedDoctorIds.includes(doctor.id))
      : [];
    return jsonResponse(200, patients);
  }

  if (method === "GET" && pathname === "/api/medicines") {
    return jsonResponse(200, demoMedicines);
  }

  if (method === "GET" && pathname === "/api/procedure-catalog") {
    return jsonResponse(200, demoProcedureCatalog);
  }

  if (method === "POST" && pathname === "/api/procedure-catalog") {
    const payload = await readJsonBody(input, init) as { name?: string; description?: string | null; cost?: number };
    const nextId = Math.max(0, ...demoProcedureCatalog.map((item) => item.id)) + 1;
    const item = {
      id: nextId,
      name: payload.name ?? "New Procedure",
      description: payload.description ?? "",
      cost: Number(payload.cost ?? 0),
    };
    demoProcedureCatalog.unshift(item);
    return jsonResponse(201, item);
  }

  if (method === "PUT" && /^\/api\/procedure-catalog\/\d+$/.test(pathname)) {
    const id = Number(pathname.split("/").at(-1));
    const payload = await readJsonBody(input, init) as { name?: string; description?: string | null; cost?: number };
    const item = demoProcedureCatalog.find((entry) => entry.id === id);
    if (!item) return jsonResponse(404, { message: "Procedure not found" });
    if (payload.name !== undefined) item.name = payload.name;
    if (payload.description !== undefined) item.description = payload.description ?? "";
    if (payload.cost !== undefined) item.cost = Number(payload.cost);
    return jsonResponse(200, item);
  }

  if (method === "DELETE" && /^\/api\/procedure-catalog\/\d+$/.test(pathname)) {
    const id = Number(pathname.split("/").at(-1));
    const index = demoProcedureCatalog.findIndex((entry) => entry.id === id);
    if (index >= 0) demoProcedureCatalog.splice(index, 1);
    return jsonResponse(204, {});
  }

  if (method === "GET" && pathname === "/api/surgery-names") {
    return jsonResponse(200, demoSurgeryNames);
  }

  if (method === "POST" && pathname === "/api/surgery-names") {
    const payload = await readJsonBody(input, init) as { name?: string };
    const nextId = Math.max(0, ...demoSurgeryNames.map((item) => item.id)) + 1;
    const item = { id: nextId, name: payload.name ?? "New Surgery" };
    demoSurgeryNames.unshift(item);
    return jsonResponse(201, item);
  }

  if (method === "PUT" && /^\/api\/surgery-names\/\d+$/.test(pathname)) {
    const id = Number(pathname.split("/").at(-1));
    const payload = await readJsonBody(input, init) as { name?: string };
    const item = demoSurgeryNames.find((entry) => entry.id === id);
    if (!item) return jsonResponse(404, { message: "Surgery name not found" });
    if (payload.name !== undefined) item.name = payload.name;
    return jsonResponse(200, item);
  }

  if (method === "DELETE" && /^\/api\/surgery-names\/\d+$/.test(pathname)) {
    const id = Number(pathname.split("/").at(-1));
    const index = demoSurgeryNames.findIndex((entry) => entry.id === id);
    if (index >= 0) demoSurgeryNames.splice(index, 1);
    return jsonResponse(204, {});
  }

  if (method === "GET" && pathname === "/api/surgery-catalog") {
    return jsonResponse(200, demoSurgeryCatalog);
  }

  if (method === "POST" && pathname === "/api/surgery-catalog") {
    const payload = await readJsonBody(input, init) as { name?: string; category?: string; cost?: number };
    const nextId = Math.max(0, ...demoSurgeryCatalog.map((item) => item.id)) + 1;
    const item = {
      id: nextId,
      name: payload.name ?? "New Surgery Catalog Entry",
      category: payload.category ?? "SURGERY",
      cost: Number(payload.cost ?? 0),
    };
    demoSurgeryCatalog.unshift(item);
    return jsonResponse(201, item);
  }

  if (method === "PUT" && /^\/api\/surgery-catalog\/\d+$/.test(pathname)) {
    const id = Number(pathname.split("/").at(-1));
    const payload = await readJsonBody(input, init) as { name?: string; category?: string; cost?: number };
    const item = demoSurgeryCatalog.find((entry) => entry.id === id);
    if (!item) return jsonResponse(404, { message: "Surgery catalog item not found" });
    if (payload.name !== undefined) item.name = payload.name;
    if (payload.category !== undefined) item.category = payload.category;
    if (payload.cost !== undefined) item.cost = Number(payload.cost);
    return jsonResponse(200, item);
  }

  if (method === "DELETE" && /^\/api\/surgery-catalog\/\d+$/.test(pathname)) {
    const id = Number(pathname.split("/").at(-1));
    const index = demoSurgeryCatalog.findIndex((entry) => entry.id === id);
    if (index >= 0) demoSurgeryCatalog.splice(index, 1);
    return jsonResponse(204, {});
  }

  if (method === "GET" && pathname === "/api/other-charge-catalog") {
    return jsonResponse(200, demoOtherChargeCatalog);
  }

  if (method === "POST" && pathname === "/api/other-charge-catalog") {
    const payload = await readJsonBody(input, init) as { name?: string; category?: string; defaultAmount?: number };
    const nextId = Math.max(0, ...demoOtherChargeCatalog.map((item) => item.id)) + 1;
    const item = {
      id: nextId,
      name: payload.name ?? "New Charge",
      category: payload.category ?? "OTHER",
      defaultAmount: payload.category === "PROSTHESIS" ? 0 : Number(payload.defaultAmount ?? 0),
    };
    demoOtherChargeCatalog.unshift(item);
    return jsonResponse(201, item);
  }

  if (method === "PUT" && /^\/api\/other-charge-catalog\/\d+$/.test(pathname)) {
    const id = Number(pathname.split("/").at(-1));
    const payload = await readJsonBody(input, init) as { name?: string; category?: string; defaultAmount?: number };
    const item = demoOtherChargeCatalog.find((entry) => entry.id === id);
    if (!item) return jsonResponse(404, { message: "Catalog item not found" });
    if (payload.name !== undefined) item.name = payload.name;
    if (payload.category !== undefined) item.category = payload.category;
    if (payload.defaultAmount !== undefined) item.defaultAmount = Number(payload.defaultAmount);
    if (item.category === "PROSTHESIS") item.defaultAmount = 0;
    return jsonResponse(200, item);
  }

  if (method === "DELETE" && /^\/api\/other-charge-catalog\/\d+$/.test(pathname)) {
    const id = Number(pathname.split("/").at(-1));
    const index = demoOtherChargeCatalog.findIndex((entry) => entry.id === id);
    if (index >= 0) demoOtherChargeCatalog.splice(index, 1);
    return jsonResponse(204, {});
  }

  if (method === "GET" && pathname === "/api/room-types") {
    return jsonResponse(200, demoRoomTypes);
  }

  if (method === "POST" && pathname === "/api/room-types") {
    const payload = await readJsonBody(input, init) as Partial<DemoRoomType>;
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
    return jsonResponse(201, roomType);
  }

  if (method === "GET" && pathname === "/api/room-numbers") {
    return jsonResponse(200, demoRoomNumbers);
  }

  if (method === "POST" && pathname === "/api/room-numbers") {
    const payload = await readJsonBody(input, init) as Partial<DemoRoomNumber>;
    const roomTypeId = Number(payload.roomTypeId ?? 0);
    const number = payload.number?.trim() ?? "";

    if (sessionUser.role !== "ADMIN" && sessionUser.role !== "MANAGER") {
      return jsonResponse(403, { message: "Manager access required" });
    }

    if (!roomTypeId || !number) {
      return jsonResponse(400, { message: "Room type and room number are required" });
    }

    const duplicate = demoRoomNumbers.find(
      (room) => room.roomTypeId === roomTypeId && room.number.toLowerCase() === number.toLowerCase(),
    );
    if (duplicate) {
      return jsonResponse(400, { message: "Room number already exists for this room type" });
    }

    const nextId = Math.max(0, ...demoRoomNumbers.map((room) => room.id)) + 1;
    const roomNumber: DemoRoomNumber = { id: nextId, roomTypeId, number };
    demoRoomNumbers.unshift(roomNumber);
    return jsonResponse(201, roomNumber);
  }

  if (method === "DELETE" && /^\/api\/room-numbers\/\d+$/.test(pathname)) {
    if (sessionUser.role !== "ADMIN" && sessionUser.role !== "MANAGER") {
      return jsonResponse(403, { message: "Manager access required" });
    }

    const id = Number(pathname.split("/").at(-1));
    const index = demoRoomNumbers.findIndex((room) => room.id === id);
    if (index >= 0) demoRoomNumbers.splice(index, 1);
    return jsonResponse(204, {});
  }

  if (method === "GET" && pathname === "/api/admin/users") {
    if (sessionUser.role !== "ADMIN") {
      return jsonResponse(403, { message: "Admin access required" });
    }
    return jsonResponse(
      200,
      demoUsers.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      })),
    );
  }

  if (method === "POST" && pathname === "/api/auth/register") {
    if (sessionUser.role !== "ADMIN") {
      return jsonResponse(403, { message: "Admin access required" });
    }
    const payload = (await readJsonBody(input, init)) as Partial<DemoUser>;
    const nextId = Math.max(0, ...demoUsers.map((user) => user.id)) + 1;
    const user: DemoUser = {
      id: nextId,
      name: payload.name ?? "New User",
      email: payload.email ?? `user${nextId}@test.com`,
      password: payload.password ?? "password123",
      role: payload.role ?? "DOCTOR",
    };
    demoUsers.push(user);
    return jsonResponse(201, toPublicUser(user));
  }

  return jsonResponse(501, {
    message: `Preview mode does not implement ${method} ${pathname} yet.`,
  });
}

export function installPreviewLocalFetchMock() {
  if (installed) return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const mockedResponse = await handlePreviewApi(input, init);
    if (mockedResponse) {
      return mockedResponse;
    }
    return originalFetch(input, init);
  };
}
