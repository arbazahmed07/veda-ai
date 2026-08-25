"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F4F0]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#E5E4DF] border-t-[#E8611A] animate-spin" />
        <p className="text-sm font-semibold text-[#6B7280]">Loading VedaAI...</p>
      </div>
    </div>
  );
}