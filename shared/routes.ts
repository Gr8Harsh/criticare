import { z } from 'zod';
import { 
  insertUserSchema, insertRoomTypeSchema, insertPatientSchema, 
  insertDoctorSchema, insertPatientDoctorSchema, insertMedicineSchema, 
  insertVisitSchema, insertPrescriptionSchema, insertChargeSchema, insertProcedureSchema,
  insertRoomSwitchSchema,
  users, roomTypes, patients, doctors, patientDoctors, medicines, visits, prescriptions, charges, procedures, roomSwitches
} from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
};

// Login/Auth specific
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: loginSchema,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout' as const,
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    register: {
      method: 'POST' as const,
      path: '/api/auth/register' as const,
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    }
  },
  dashboard: {
    overview: {
      method: 'GET' as const,
      path: '/api/dashboard/overview' as const,
      responses: {
        200: z.object({
          totalAdmitted: z.number(),
          totalBedsOccupied: z.number(),
          totalRevenue: z.number(),
          revenueBreakdown: z.object({
            room: z.number(),
            doctor: z.number(),
            medicine: z.number(),
            nursing: z.number(),
            other: z.number()
          }),
          activeDoctors: z.number(),
        })
      }
    }
  },
  patients: {
    list: {
      method: 'GET' as const,
      path: '/api/patients' as const,
      responses: {
        200: z.array(z.custom<typeof patients.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/patients/:id' as const,
      responses: {
        200: z.custom<typeof patients.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    getBill: {
      method: 'GET' as const,
      path: '/api/patients/:id/bill' as const,
      responses: {
        200: z.object({
          daysAdmitted: z.number(),
          roomCharge: z.number(),
          roomNursingCharges: z.number(),
          rmoCharges: z.number(),
          doctorCharges: z.number(),
          medicineCharges: z.number(),
          nursingCharges: z.number(),
          otherCharges: z.number(),
          procedureCharges: z.number(),
          surgeryCharges: z.number(),
          grandTotal: z.number(),
          visits: z.array(z.any()),
          prescriptions: z.array(z.any()),
          charges: z.array(z.any()),
          procedures: z.array(z.any()),
          surgeries: z.array(z.any()),
          roomSwitches: z.array(z.any()),
          patient: z.custom<typeof patients.$inferSelect>(),
        }),
        404: errorSchemas.notFound,
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/patients' as const,
      input: insertPatientSchema.extend({
        roomTypeId: z.coerce.number()
      }),
      responses: {
        201: z.custom<typeof patients.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/patients/:id' as const,
      input: insertPatientSchema.partial(),
      responses: {
        200: z.custom<typeof patients.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    discharge: {
      method: 'POST' as const,
      path: '/api/patients/:id/discharge' as const,
      responses: {
        200: z.custom<typeof patients.$inferSelect>(),
        404: errorSchemas.notFound,
      }
    },
    assignDoctor: {
      method: 'POST' as const,
      path: '/api/patients/:id/assign-doctor' as const,
      input: z.object({ doctorId: z.coerce.number() }),
      responses: {
        201: z.custom<typeof patientDoctors.$inferSelect>(),
      }
    },
    getRoomSwitches: {
      method: 'GET' as const,
      path: '/api/patients/:id/room-switches' as const,
      responses: {
        200: z.array(z.custom<typeof roomSwitches.$inferSelect>()),
      }
    },
    createRoomSwitch: {
      method: 'POST' as const,
      path: '/api/patients/:id/room-switch' as const,
      input: insertRoomSwitchSchema.omit({ patientId: true, fromRoomTypeId: true }).extend({
        toRoomTypeId: z.coerce.number(),
        isHalfDay: z.boolean().default(true),
        notes: z.string().optional(),
      }),
      responses: {
        201: z.custom<typeof roomSwitches.$inferSelect>(),
      }
    },
  },
  doctors: {
    list: {
      method: 'GET' as const,
      path: '/api/doctors' as const,
      responses: {
        200: z.array(z.custom<typeof doctors.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/doctors' as const,
      input: insertDoctorSchema.extend({ visitCharge: z.coerce.number(), userId: z.coerce.number(), isSurgeon: z.boolean().optional().default(false), isAssistantSurgeon: z.boolean().optional().default(false), isOtAssistant: z.boolean().optional().default(false) }),
      responses: {
        201: z.custom<typeof doctors.$inferSelect>(),
      },
    },
    assignedPatients: {
      method: 'GET' as const,
      path: '/api/doctors/:id/patients' as const,
      responses: {
        200: z.array(z.custom<typeof patients.$inferSelect>()),
      }
    },
    stats: {
      method: 'GET' as const,
      path: '/api/doctors/:id/stats' as const,
      responses: {
        200: z.object({
          visitCount: z.number(),
          revenueGenerated: z.number()
        })
      }
    }
  },
  medicines: {
    list: {
      method: 'GET' as const,
      path: '/api/medicines' as const,
      responses: {
        200: z.array(z.custom<typeof medicines.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/medicines' as const,
      input: insertMedicineSchema.extend({ unitCost: z.coerce.number() }),
      responses: {
        201: z.custom<typeof medicines.$inferSelect>(),
      },
    }
  },
  roomTypes: {
    list: {
      method: 'GET' as const,
      path: '/api/room-types' as const,
      responses: {
        200: z.array(z.custom<typeof roomTypes.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/room-types' as const,
      input: insertRoomTypeSchema.extend({
        dailyCharge: z.coerce.number(),
        nursingCharge: z.coerce.number().default(0),
        rmoCharge: z.coerce.number().default(0),
      }),
      responses: {
        201: z.custom<typeof roomTypes.$inferSelect>(),
      }
    }
  },
  visits: {
    list: {
      method: 'GET' as const,
      path: '/api/visits' as const,
      responses: {
        200: z.array(z.custom<typeof visits.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/visits' as const,
      input: insertVisitSchema.extend({ patientId: z.coerce.number(), doctorId: z.coerce.number(), charge: z.coerce.number() }),
      responses: {
        201: z.custom<typeof visits.$inferSelect>(),
      }
    }
  },
  prescriptions: {
    create: {
      method: 'POST' as const,
      path: '/api/prescriptions' as const,
      input: insertPrescriptionSchema.extend({ patientId: z.coerce.number(), medicineId: z.coerce.number(), quantity: z.coerce.number(), totalCost: z.coerce.number() }),
      responses: {
        201: z.custom<typeof prescriptions.$inferSelect>(),
      }
    }
  },
  charges: {
    create: {
      method: 'POST' as const,
      path: '/api/charges' as const,
      input: insertChargeSchema.extend({ patientId: z.coerce.number(), amount: z.coerce.number() }),
      responses: {
        201: z.custom<typeof charges.$inferSelect>(),
      }
    }
  },
  procedures: {
    create: {
      method: 'POST' as const,
      path: '/api/procedures' as const,
      input: insertProcedureSchema.extend({ patientId: z.coerce.number(), cost: z.coerce.number() }),
      responses: {
        201: z.custom<typeof procedures.$inferSelect>(),
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}