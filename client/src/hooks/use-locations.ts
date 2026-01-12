import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect } from "react";

export function useLiveLocations() {
  return useQuery({
    queryKey: ["/api/locations/live"],
    refetchInterval: 10000,
  });
}

export function useUpdateLocation() {
  return useMutation({
    mutationFn: async (coords: { lat: number; lng: number }) => {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coords),
      });
      if (!res.ok) throw new Error("Failed to update location");
      return res.json();
    },
  });
}

export function useLocationSync(isActive: boolean) {
  const { mutate } = useUpdateLocation();

  useEffect(() => {
    if (!isActive || !("geolocation" in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        mutate({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      (error) => console.error("Location error:", error),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 27000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isActive, mutate]);
}
