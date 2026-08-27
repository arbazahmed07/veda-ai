"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  BookOpen,
  ClipboardList,
  LayoutGrid,
  Library,
  Settings,
  X,
  PanelLeft,
  PanelLeftClose,
  Sparkles,
  LogOut,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/slices/authSlice";
import { useSidebar } from "@/contexts/SidebarContext";

const allNavItems = [
  { href: "/dashboard",   label: "Home",           icon: Home,          roles: ["teacher", "super_admin", "student"] },
  { href: "/classroom",   label: "My Classroom",   icon: LayoutGrid,    roles: ["teacher", "super_admin"] },
  { href: "/assignments", label: "Assignments",     icon: ClipboardList, roles: ["teacher", "super_admin"] },
  { href: "/dashboard",   label: "Exams",           icon: BookOpen,      roles: ["teacher", "super_admin", "student"] },
  { href: "/library",     label: "My Library",      icon: Library,       roles: ["teacher", "super_admin", "student"] },
];

/* ── VedaAI Square Logo ── */
function VedaLogo({ size = 36 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-[10px] bg-[#1A1A1A] shrink-0 font-black text-white select-none"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      V
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useSidebar();

  useEffect(() => { setMobileOpen(false); }, [pathname, setMobileOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setMobileOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [setMobileOpen]);

  const role = user?.role || "";
  const navItems = allNavItems.filter((item) => role && item.roles.includes(role));

  const handleLogout = () => {
    dispatch(logout());
    router.push("/login");
  };

  /* ── Shared sidebar content ── */
  const renderContent = (isMobile: boolean) => {
    const isExpanded = isMobile || !collapsed;

    return (
      <div className="flex flex-col h-full relative">
        {/* ── Logo row ── */}
        <div
          className={`flex items-center shrink-0 px-4 pt-5 pb-4 ${
            isExpanded ? "justify-between" : "flex-col gap-3 items-center"
          }`}
        >
          {isExpanded ? (
            <>
              <Link href="/" className="flex items-center gap-2.5 min-w-0">
                <VedaLogo size={36} />
                <span className="text-[15px] font-bold text-[#1A1A1A] tracking-tight">VedaAI</span>
              </Link>

              {/* Panel collapse toggle (desktop only) */}
              {!isMobile && (
                <button
                  onClick={toggleCollapsed}
                  title="Collapse sidebar"
                  className="w-8 h-8 rounded-lg border border-[#E5E4DF] flex items-center justify-center text-[#9CA3AF] hover:text-[#1A1A1A] hover:bg-[#F5F4F0] hover:border-[#D1D5DB] transition-all duration-200 shrink-0 cursor-pointer"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              )}
            </>
          ) : (
            <>
              <Link href="/">
                <VedaLogo size={36} />
              </Link>
              <button
                onClick={toggleCollapsed}
                title="Expand sidebar"
                className="w-8 h-8 rounded-lg border border-[#E5E4DF] flex items-center justify-center text-[#9CA3AF] hover:text-[#1A1A1A] hover:bg-[#F5F4F0] hover:border-[#D1D5DB] transition-all duration-200 cursor-pointer"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* ── Divider ── */}
        <div className="mx-4 h-px bg-[#E5E4DF] mb-3 shrink-0" />

        {/* ── AI Teacher's Toolkit Button ── */}
        {isExpanded ? (
          <div className="px-3 mb-4 shrink-0">
            <button className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#1A1A1A] text-white text-sm font-semibold hover:bg-[#2D2D2D] transition-all duration-200 group">
              <Sparkles className="w-4 h-4 text-[#E8611A] shrink-0" />
              <span className="truncate">AI Teacher's Toolkit</span>
            </button>
          </div>
        ) : (
          <div className="flex justify-center mb-3 shrink-0">
            <div className="w-10 h-10 rounded-full bg-[#1A1A1A] border-2 border-[#E8611A] flex items-center justify-center text-[#E8611A] shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto min-h-0 px-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/analytics" && pathname.startsWith(item.href));
            const Icon = item.icon;

            if (!isExpanded) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  title={item.label}
                  className={`flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-[#F5F4F0] text-[#E8611A]"
                      : "text-[#6B7280] hover:bg-[#F5F4F0] hover:text-[#1A1A1A]"
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                </Link>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group ${
                  isActive
                    ? "bg-[#F5F4F0] text-[#1A1A1A] font-semibold"
                    : "text-[#6B7280] hover:bg-[#F5F4F0] hover:text-[#1A1A1A] font-medium"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? "text-[#E8611A]" : "text-[#9CA3AF] group-hover:text-[#6B7280]"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* ── Bottom section ── */}
        <div className="shrink-0">
          <div className="mx-4 h-px bg-[#E5E4DF] my-3" />

          {/* Settings */}
          {isExpanded ? (
            <div className="px-3 mb-3 space-y-0.5">
              <Link
                href="/profile"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  pathname === "/profile"
                    ? "bg-[#F5F4F0] text-[#1A1A1A]"
                    : "text-[#6B7280] hover:bg-[#F5F4F0] hover:text-[#1A1A1A]"
                }`}
              >
                <Settings
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    pathname === "/profile" ? "text-[#E8611A]" : "text-[#9CA3AF] group-hover:text-[#6B7280]"
                  }`}
                />
                <span>Settings</span>
              </Link>
            </div>
          ) : (
            <div className="flex justify-center mb-3">
              <Link
                href="/profile"
                title="Settings"
                className="flex items-center justify-center w-10 h-10 rounded-xl text-[#9CA3AF] hover:bg-[#F5F4F0] hover:text-[#6B7280] transition-all duration-200"
              >
                <Settings className="w-[18px] h-[18px]" />
              </Link>
            </div>
          )}

          {/* Logged in User card (Dynamic) */}
          {isExpanded ? (
            <div className="mx-3 mb-4">
              <div className="bg-[#F5F4F0] rounded-2xl px-3 py-2.5 flex items-center gap-3">
                {/* User Avatar */}
                <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                  {user?.name
                    ? user.name
                        .split(" ")
                        .slice(0, 2)
                        .map((w) => w.charAt(0).toUpperCase())
                        .join("")
                    : "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-[#1A1A1A] truncate leading-tight">
                    {user?.name || "Teacher"}
                  </p>
                  <p className="text-[11px] text-[#6B7280] truncate leading-tight mt-0.5">
                    {user?.email || (user?.role ? user.role.toUpperCase() : "Faculty")}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-red-500 hover:bg-red-50 transition-all duration-200 shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 pb-4 px-2">
              <div
                title={user?.name || "User"}
                className="w-9 h-9 rounded-xl bg-[#1A1A1A] text-white flex items-center justify-center text-xs font-bold shadow-sm"
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <button
                onClick={toggleCollapsed}
                title="Expand sidebar"
                className="w-8 h-8 rounded-lg border border-[#E5E4DF] flex items-center justify-center text-[#9CA3AF] hover:text-[#1A1A1A] hover:bg-[#F5F4F0] hover:border-[#D1D5DB] transition-all cursor-pointer"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 260 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="hidden lg:flex lg:flex-col shrink-0 bg-white border-r border-[#E5E4DF] h-screen sticky top-0 overflow-visible"
        style={{ minWidth: collapsed ? 64 : 260 }}
      >
        <div className="w-full h-full overflow-hidden">
          {renderContent(false)}
        </div>
      </motion.aside>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-[260px] bg-white border-r border-[#E5E4DF] flex flex-col"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 p-2 text-[#9CA3AF] hover:text-[#1A1A1A] transition-colors rounded-lg hover:bg-[#F5F4F0]"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
              {renderContent(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
