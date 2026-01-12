import { QueryClient } from "@tanstack/react-query";

export async function apiRequest(method: string, url: string, data?: unknown) {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const res = await fetch(queryKey[0] as string, { credentials: "include" });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      },
      staleTime: 1000 * 60 * 5,
      retry: false,
    },
  },
});
