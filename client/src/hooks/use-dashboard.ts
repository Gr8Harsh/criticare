import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useDashboardOverview() {
  return useQuery({
    queryKey: [api.dashboard.overview.path],
    queryFn: async () => {
      const res = await fetch(api.dashboard.overview.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch dashboard overview");
      return api.dashboard.overview.responses[200].parse(await res.json());
    },
  });
}
