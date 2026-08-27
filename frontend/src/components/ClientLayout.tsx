"use client";

import Link from "next/link";
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

            {/* ── Left: mobile back + brand / desktop breadcrumb ── */}
            <div className="flex items-center gap-2.5">
              {/* Mobile back arrow */}
              <button
                className="lg:hidden p-2 -ml-1 rounded-xl text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#ECEAE4] transition-colors shrink-0"
                onClick={() => router.back()}
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Mobile brand name */}
              <span className="lg:hidden text-[15px] font-bold text-[#1A1A1A] tracking-tight">VedaAI</span>

              {/* Desktop breadcrumb */}
              <div className="hidden lg:flex items-center gap-2 text-sm text-[#6B7280]">
                <FileText className="w-4 h-4 text-[#9CA3AF]" />
                <span className="font-semibold text-[#1A1A1A]">
                  {pathname.startsWith("/classroom")
                    ? "My Classroom"
                    : pathname.startsWith("/assignments")
                    ? "Assignments"
                    : pathname.startsWith("/library")
                    ? "My Library"
                    : pathname.startsWith("/analytics")
                    ? "Analytics"
                    : pathname.startsWith("/students")
                    ? "Students"
                    : pathname.startsWith("/results")
                    ? "Results"
                    : pathname.startsWith("/profile")
                    ? "Settings & Profile"
                    : "Exams"}
                </span>
              </div>
            </div>

            {/* ── Right: action icons + user ── */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Help Button (Circular) */}
              <button
                aria-label="Help"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#ECEAE4]/80 hover:bg-[#E2DFD7] flex items-center justify-center text-[#1A1A1A] transition-colors shrink-0 shadow-sm"
              >
                <HelpCircle className="w-5 h-5 text-[#1A1A1A]" strokeWidth="2" />
              </button>

              {/* Notifications Button (Circular with dot) */}
              <button
                aria-label="Notifications"
                className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#ECEAE4]/80 hover:bg-[#E2DFD7] flex items-center justify-center text-[#1A1A1A] transition-colors shrink-0 shadow-sm"
              >
                <Bell className="w-5 h-5 text-[#1A1A1A]" strokeWidth="2" />
                {/* Vibrant notification dot */}
                <span className="absolute top-1 right-1.5 w-2.5 h-2.5 rounded-full bg-[#FF4500] border-2 border-white" />
              </button>

              {/* AI Sparkle Star Button (Circular) */}
              <button
                aria-label="AI Features"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#ECEAE4]/80 hover:bg-[#E2DFD7] flex items-center justify-center text-[#1A1A1A] transition-colors shrink-0 shadow-sm"
              >
                <svg className="w-4 h-4 text-[#1A1A1A] fill-[#1A1A1A]" viewBox="0 0 24 24">
                  <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
                </svg>
              </button>

              {/* User avatar + name dropdown (desktop) */}
              <Link
                href="/profile"
                className="hidden sm:flex items-center gap-2.5 pl-1.5 pr-2 py-1 rounded-full hover:bg-[#ECEAE4]/80 transition-colors group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1A1A1A] via-[#333333] to-[#E8611A] flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm overflow-hidden border border-black/10">
                  {user?.name ? (
                    <span className="font-semibold text-xs tracking-wider">
                      {initials}
                    </span>
                  ) : (
                    <span className="text-xs">👤</span>
                  )}
                </div>
                <span className="text-[14px] font-semibold text-[#1A1A1A] max-w-[140px] truncate">
                  {user?.name || "Madhur Rastogi"}
                </span>
                <ChevronDown className="w-4 h-4 text-[#1A1A1A] group-hover:translate-y-0.5 transition-transform" strokeWidth="2.2" />
              </Link>

              {/* User avatar (mobile only) */}
              <Link
                href="/profile"
                className="sm:hidden relative p-0.5 rounded-full"
                aria-label="Account"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1A1A1A] via-[#333333] to-[#E8611A] flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {initials}
                </div>
              </Link>

              {/* Mobile hamburger */}
              <button
                className="lg:hidden p-2 rounded-xl text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#ECEAE4] transition-colors shrink-0"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="w-5 h-5" />
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
