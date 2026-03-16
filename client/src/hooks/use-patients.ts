import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

export function usePatients() {
  return useQuery({
    queryKey: [api.patients.list.path],
    queryFn: async () => {
      const res = await fetch(api.patients.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch patients");
      return api.patients.list.responses[200].parse(await res.json());
    },
  });
}

export function usePatient(id: number) {
  return useQuery({
    queryKey: [api.patients.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.patients.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch patient");
      return api.patients.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function usePatientBill(id: number) {
  return useQuery({
    queryKey: [api.patients.getBill.path, id],
    queryFn: async () => {
      const url = buildUrl(api.patients.getBill.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch patient bill");
      return api.patients.getBill.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

type CreatePatientInput = z.infer<typeof api.patients.create.input>;
export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePatientInput) => {
      const res = await fetch(api.patients.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create patient");
      return api.patients.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.patients.list.path] }),
  });
}

type UpdatePatientInput = z.infer<typeof api.patients.update.input>;
export function useUpdatePatient(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdatePatientInput) => {
      const url = buildUrl(api.patients.update.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update patient");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.patients.get.path, id] });
      queryClient.invalidateQueries({ queryKey: [api.patients.getBill.path, id] });
    },
  });
}

export function useDischargePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.patients.discharge.path, { id });
      const res = await fetch(url, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed to discharge patient");
      return api.patients.discharge.responses[200].parse(await res.json());
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.patients.get.path, id] });
      queryClient.invalidateQueries({ queryKey: [api.patients.getBill.path, id] });
    },
  });
}

export function useAssignedDoctors(patientId: number) {
  return useQuery({
    queryKey: ['/api/patients', patientId, 'doctors'],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/doctors`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!patientId,
    retry: 0,
  });
}

export function useAssignDoctor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ patientId, doctorId }: { patientId: number, doctorId: number }) => {
      const url = buildUrl(api.patients.assignDoctor.path, { id: patientId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to assign doctor");
      return api.patients.assignDoctor.responses[201].parse(await res.json());
    },
    onSuccess: (_, { patientId }) => {
      queryClient.invalidateQueries({ queryKey: [api.patients.getBill.path, patientId] });
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patientId, 'doctors'] });
    },
  });
}
