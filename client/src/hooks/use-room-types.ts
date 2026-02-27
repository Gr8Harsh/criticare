import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

export function useRoomTypes() {
  return useQuery({
    queryKey: [api.roomTypes.list.path],
    queryFn: async () => {
      const res = await fetch(api.roomTypes.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch room types");
      return api.roomTypes.list.responses[200].parse(await res.json());
    },
  });
}

type CreateRoomTypeInput = z.infer<typeof api.roomTypes.create.input>;
export function useCreateRoomType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateRoomTypeInput) => {
      const res = await fetch(api.roomTypes.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create room type");
      return api.roomTypes.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.roomTypes.list.path] }),
  });
}
