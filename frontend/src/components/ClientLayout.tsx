"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  Menu,
  Bell,
  HelpCircle,
  Sparkles,
  ChevronDown,
  ArrowLeft,
  FileText,
  LogOut,
  Settings,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "./Sidebar";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchCurrentUser, initTokenFromStorage, logout } from "@/store/slices/authSlice";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import { useToast } from "@/components/ui/Toast";

const publicPaths = ["/", "/login", "/signup"];

/* Inner layout — needs SidebarContext */
function InnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, token, loading } = useAppSelector((state) => state.auth);
  const { setMobileOpen } = useSidebar();
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    dispatch(logout());
    showToast("Signed out successfully", "success");
    router.push("/login");
  };

  const isPublicPage = publicPaths.includes(pathname);

  /* Public pages — no shell */
  if (isPublicPage) {
    return (
      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-[#F5F4F0]">
        {children}
      </main>
    );
  }

  /* SSR or Initial mount loading placeholder */
  if (!mounted || loading || (!user && token)) {
    return (
      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden flex items-center justify-center bg-[#F5F4F0]">
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
    .map((n) => n[0]?.toUpperCase())
    .join("") || "U";

  return (
    <>
      <Sidebar />

      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden flex flex-col bg-[#F5F4F0]">

        {/* ── Top Header Bar (White Background with Border Radius) ── */}
        <div className="sticky top-0 z-30 px-3 sm:px-5 pt-3 shrink-0">
          <header className="bg-white border border-[#E5E4DF] rounded-2xl px-4 sm:px-6 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between h-13 sm:h-14">

            {/* ── Left: Back Button + Page Title / Breadcrumb ── */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Back button */}
              <button
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#1A1A1A] hover:bg-[#F5F4F0] transition-colors shrink-0 cursor-pointer"
                onClick={() => router.back()}
                aria-label="Go back"
                title="Go back"
              >
                <ArrowLeft className="w-4 h-4 text-[#1A1A1A]" strokeWidth="2.2" />
              </button>

              {/* Page Breadcrumb Title */}
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-[#9CA3AF]" />
                <span className="font-semibold text-[#1A1A1A] text-[14.5px]">
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
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#F5F4F0] hover:bg-[#ECEAE4] flex items-center justify-center text-[#1A1A1A] transition-colors shrink-0 shadow-sm cursor-pointer"
              >
                <HelpCircle className="w-5 h-5 text-[#1A1A1A]" strokeWidth="2" />
              </button>

              {/* Notifications Button (Circular with dot) */}
              <button
                aria-label="Notifications"
                className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#F5F4F0] hover:bg-[#ECEAE4] flex items-center justify-center text-[#1A1A1A] transition-colors shrink-0 shadow-sm cursor-pointer"
              >
                <Bell className="w-5 h-5 text-[#1A1A1A]" strokeWidth="2" />
                {/* Vibrant notification dot */}
                <span className="absolute top-1 right-1.5 w-2.5 h-2.5 rounded-full bg-[#FF4500] border-2 border-white" />
              </button>

              {/* AI Sparkle Star Button (Circular) */}
              <button
                aria-label="AI Features"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#F5F4F0] hover:bg-[#ECEAE4] flex items-center justify-center text-[#1A1A1A] transition-colors shrink-0 shadow-sm cursor-pointer"
              >
                <svg className="w-4 h-4 text-[#1A1A1A] fill-[#1A1A1A]" viewBox="0 0 24 24">
                  <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
                </svg>
              </button>

              {/* User avatar + name dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 pl-1.5 pr-2 py-1 rounded-full hover:bg-[#F5F4F0] transition-colors group cursor-pointer"
                  aria-label="User menu"
                  aria-expanded={dropdownOpen}
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
                  <span className="hidden sm:inline-block text-[14px] font-semibold text-[#1A1A1A] max-w-[130px] truncate">
                    {user?.name || "Madhur Rastogi"}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#1A1A1A] transition-transform duration-200 ${
                      dropdownOpen ? "rotate-180" : ""
                    }`}
                    strokeWidth="2.2"
                  />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[#E5E4DF] shadow-[0_12px_32px_rgba(0,0,0,0.12)] p-2 z-50 overflow-hidden"
                    >
                      {/* User details header */}
                      <div className="px-3 py-2.5 bg-[#FAF9F6] rounded-xl mb-1 border border-[#E5E4DF]/50">
                        <p className="text-[13.5px] font-bold text-[#1A1A1A] truncate leading-tight">
                          {user?.name || "Madhur Rastogi"}
                        </p>
                        <p className="text-xs text-[#6B7280] truncate mt-0.5 font-medium">
                          {user?.email || "teacher@veda.ai"}
                        </p>
                      </div>

                      {/* Settings / Profile link */}
                      <Link
                        href="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13.5px] font-medium text-[#1A1A1A] hover:bg-[#F5F4F0] transition-colors cursor-pointer"
                      >
                        <Settings className="w-4 h-4 text-[#6B7280]" />
                        <span>Settings & Profile</span>
                      </Link>

                      {/* Divider */}
                      <div className="h-px bg-[#E5E4DF] my-1" />

                      {/* Logout option */}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13.5px] font-semibold text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer text-left"
                      >
                        <LogOut className="w-4 h-4 text-[#DC2626]" />
                        <span>Log Out</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

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
      </div>

        {/* ── Page content ── */}
        <div className="flex-1 flex flex-col min-h-0">
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
