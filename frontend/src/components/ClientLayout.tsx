"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Menu,
  Bell,
  HelpCircle,
  Sparkles,
  ChevronDown,
  ArrowLeft,
  FileText,
} from "lucide-react";
import Sidebar from "./Sidebar";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchCurrentUser, initTokenFromStorage } from "@/store/slices/authSlice";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";

const publicPaths = ["/", "/login", "/signup"];

/* Inner layout — needs SidebarContext */
function InnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, token, loading } = useAppSelector((state) => state.auth);
  const { setMobileOpen } = useSidebar();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    dispatch(initTokenFromStorage());
  }, [dispatch]);

  useEffect(() => {
    if (mounted && token && !user && !loading) {
      dispatch(fetchCurrentUser());
    }
  }, [mounted, token, user, loading, dispatch]);

  useEffect(() => {
    if (mounted && !publicPaths.includes(pathname) && !token && !loading) {
      router.replace("/login");
    }
  }, [mounted, pathname, token, loading, router]);

  const isPublicPage = publicPaths.includes(pathname);

  /* Public pages — no shell */
  if (isPublicPage) {
    return (
      <main className="flex-1 min-w-0 overflow-y-auto bg-[#F5F4F0]">
        {children}
      </main>
    );
  }

  /* SSR or Initial mount loading placeholder */
  if (!mounted || loading || (!user && token)) {
    return (
      <main className="flex-1 min-w-0 overflow-y-auto flex items-center justify-center bg-[#F5F4F0]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-[#E5E4DF] border-t-[#E8611A] animate-spin" />
          <p className="text-sm text-[#9CA3AF]">Loading…</p>
        </div>
      </main>
    );
  }

  if (!user) return null;

  /* ── User initials ── */
  const initials = user.name
    ?.split(" ")
    .slice(0, 2)
    .map((w: string) => w.charAt(0).toUpperCase())
    .join("") || "?";

  return (
    <>
      <Sidebar />

      <main className="flex-1 min-w-0 overflow-y-auto flex flex-col bg-[#F5F4F0]">

        {/* ── Top Header Bar ── */}
        <header className="sticky top-0 z-30 shrink-0 bg-[#F5F4F0]/95 backdrop-blur-sm border-b border-[#E5E4DF] px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">

            {/* ── Left: mobile hamburger + breadcrumb ── */}
            <div className="flex items-center gap-2.5">
              {/* Mobile back arrow */}
              <button
                className="lg:hidden p-2 -ml-1 rounded-xl text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#ECEAE4] transition-colors shrink-0"
                onClick={() => router.back()}
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                <FileText className="w-4 h-4 text-[#9CA3AF]" />
                <span className="font-semibold text-[#1A1A1A]">Exams</span>
              </div>
            </div>

            {/* ── Right: action icons + user ── */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Help */}
              <button
                aria-label="Help"
                className="p-2 rounded-xl text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#ECEAE4] transition-colors"
              >
                <HelpCircle className="w-5 h-5" />
              </button>

              {/* Notifications */}
              <button
                aria-label="Notifications"
                className="relative p-2 rounded-xl text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#ECEAE4] transition-colors"
              >
                <Bell className="w-5 h-5" />
                {/* Notification dot */}
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#E8611A] border-2 border-[#F5F4F0]" />
              </button>

              {/* Mobile hamburger */}
              <button
                className="lg:hidden p-2 rounded-xl text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#ECEAE4] transition-colors shrink-0"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* AI Sparkle (desktop only) */}
              <button
                aria-label="AI Features"
                className="hidden sm:flex p-2 rounded-xl text-[#6B7280] hover:text-[#E8611A] hover:bg-[#FEF0E8] transition-colors"
              >
                <Sparkles className="w-5 h-5" />
              </button>

              {/* Divider */}
              <div className="hidden sm:block w-px h-6 bg-[#E5E4DF] mx-1" />

              {/* User avatar + name (desktop) */}
              <button className="hidden sm:flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-[#ECEAE4] transition-colors group">
                <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {initials}
                </div>
                <span className="text-sm font-medium text-[#1A1A1A] max-w-[120px] truncate">
                  {user.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#6B7280] transition-colors" />
              </button>

              {/* User avatar (mobile only) */}
              <button className="sm:hidden relative p-0.5 rounded-full" aria-label="Account">
                <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center text-white text-xs font-bold">
                  {initials}
                </div>
                <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-[#E8611A] border-2 border-[#F5F4F0]" />
              </button>
            </div>
          </div>
        </header>

        {/* ── Page content ── */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {children}
        </div>

      </main>
    </>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <InnerLayout>{children}</InnerLayout>
    </SidebarProvider>
  );
}
