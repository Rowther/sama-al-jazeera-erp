"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { Toaster } from "sonner"
import { AppLayout } from "@/components/layout/app-layout"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,
        gcTime: 30 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchInterval: 15_000,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout>{children}</AppLayout>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  )
}
