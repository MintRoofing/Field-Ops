import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function useTimeCardStatus() {
  return useQuery({
    queryKey: ["/api/time-cards/status"],
  });
}

export function useTimeCardsList() {
  return useQuery({
    queryKey: ["/api/time-cards"],
  });
}

export function useClockIn() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/time-cards/clock-in", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-cards/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-cards"] });
      toast({ title: "Clocked In" });
    },
  });
}

export function useClockOut() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/time-cards/clock-out", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-cards/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-cards"] });
      toast({ title: "Clocked Out" });
    },
  });
}
