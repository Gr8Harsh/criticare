import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

export function useMedicines() {
  return useQuery({
    queryKey: [api.medicines.list.path],
    queryFn: async () => {
      const res = await fetch(api.medicines.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch medicines");
      return api.medicines.list.responses[200].parse(await res.json());
    },
  });
}

type CreateMedicineInput = z.infer<typeof api.medicines.create.input>;
export function useCreateMedicine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateMedicineInput) => {
      const res = await fetch(api.medicines.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create medicine");
      return api.medicines.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.medicines.list.path] }),
  });
}
