import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

export function useDoctors() {
  return useQuery({
    queryKey: [api.doctors.list.path],
    queryFn: async () => {
      const res = await fetch(api.doctors.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch doctors");
      return api.doctors.list.responses[200].parse(await res.json());
    },
  });
}

export function useDoctorStats(id: number) {
  return useQuery({
    queryKey: [api.doctors.stats.path, id],
    queryFn: async () => {
      const url = buildUrl(api.doctors.stats.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch doctor stats");
      return api.doctors.stats.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useDoctorAssignedPatients(id: number) {
  return useQuery({
    queryKey: [api.doctors.assignedPatients.path, id],
    queryFn: async () => {
      const url = buildUrl(api.doctors.assignedPatients.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch assigned patients");
      return api.doctors.assignedPatients.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}
