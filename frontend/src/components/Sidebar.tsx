"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Settings,
  X,
  Sparkles,
  ChevronsRight,
  ChevronsLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/slices/authSlice";
import { useSidebar } from "@/contexts/SidebarContext";

/* ── Pixel-Perfect Custom Nav Icons ── */

function HomeIcon({ className = "w-5 h-5", active = false }: { className?: string; active?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="14" y="3.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="14" y="14" width="6.5" height="6.5" rx="1.5" />
      <rect x="3.5" y="14" width="6.5" height="6.5" rx="1.5" />
    </svg>
  );
}

function ClassroomIcon({ className = "w-5 h-5", active = false }: { className?: string; active?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.5 4.5C3.84315 4.5 2.5 5.84315 2.5 7.5V16.5C2.5 18.1569 3.84315 19.5 5.5 19.5H18.5C20.1569 19.5 21.5 18.1569 21.5 16.5V7.5C21.5 5.84315 20.1569 4.5 18.5 4.5H5.5ZM7.8 6.5C6.69543 6.5 5.8 7.39543 5.8 8.5C5.8 9.60457 6.69543 10.5 7.8 10.5C8.90457 10.5 9.8 9.60457 9.8 8.5C9.8 7.39543 8.90457 6.5 7.8 6.5ZM4.5 17.5V17C4.5 14.8 6.2 13.2 8.2 13.2C9.8 13.2 11.2 14.2 11.7 15.6L14.8 12.5C15.3 12 16.2 12.3 15.9 13L13.2 17.2C13 17.4 12.6 17.5 12.2 17.5H4.5Z"
      />
    </svg>
  );
}

function AssignmentsIcon({ className = "w-5 h-5", active = false }: { className?: string; active?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2.5H6.5C5.39543 2.5 4.5 3.39543 4.5 4.5V19.5C4.5 20.6046 5.39543 21.5 6.5 21.5H17.5C18.6046 21.5 19.5 20.6046 19.5 19.5V8L14 2.5Z" />
      <path d="M14 2.5V8H19.5" />
      <line x1="8.5" y1="12.5" x2="15.5" y2="12.5" />
      <line x1="8.5" y1="16.5" x2="13.5" y2="16.5" />
    </svg>
  );
}

function ExamsIcon({ className = "w-5 h-5", active = false }: { className?: string; active?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4.5" y="4.5" width="15" height="17" rx="3" />
      <path d="M9 4.5V3C9 2.44772 9.44772 2 10 2H14C14.5523 2 15 2.44772 15 3V4.5" />
    </svg>
  );
}

function LibraryIcon({ className = "w-5 h-5", active = false }: { className?: string; active?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12A9 9 0 1 1 12 3V12H21Z" />
    </svg>
  );
}

const allNavItems = [
  { href: "/dashboard",   label: "Home",           Icon: HomeIcon,        roles: ["teacher", "super_admin", "student"] },
  { href: "/classroom",   label: "My Classroom",   Icon: ClassroomIcon,   roles: ["teacher", "super_admin"] },
  { href: "/assignments", label: "Assignments",     Icon: AssignmentsIcon, roles: ["teacher", "super_admin"] },
  { href: "/dashboard",   label: "Exams",           Icon: ExamsIcon,       roles: ["teacher", "super_admin", "student"] },
  { href: "/library",     label: "My Library",      Icon: LibraryIcon,     roles: ["teacher", "super_admin", "student"] },
];

/* ── VedaAI Logo ── */
function VedaLogo({ size = 38 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-[10px] shrink-0 select-none overflow-hidden"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/veda-ai-logo.png"
        alt="VedaAI Logo"
        className="w-full h-full object-contain select-none pointer-events-none"
      />
    </div>
  );
}

/* ── Helper to extract 2-3 letter initials for Monogram ── */
function getSchoolInitials(name: string) {
  if (!name) return "DPS";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + (parts[1] ? parts[1][0] : "") + (parts[2] ? parts[2][0] : "")).toUpperCase().slice(0, 3);
}

/* ── Dynamic School Crest Emblem ── */
function DynamicSchoolEmblem({
  schoolName = "Delhi Public School",
  size = 42,
}: {
  schoolName?: string;
  size?: number;
}) {
  const initials = getSchoolInitials(schoolName);

  return (
    <div
      className="rounded-xl bg-white flex items-center justify-center shrink-0 p-1 shadow-sm border border-[#E5E4DF] relative overflow-hidden"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 60 60" fill="none" className="w-full h-full">
        {/* Scalloped outer crest / shield */}
        <path
          d="M30 4C18 4 10 10 10 20C10 34 22 48 30 54C38 48 50 34 50 20C50 10 42 4 30 4Z"
          fill="#F0F7F3"
          stroke="#1E6B38"
          strokeWidth="2"
        />
        {/* Inner wreath ring */}
        <circle cx="30" cy="24" r="13" stroke="#1E6B38" strokeWidth="1.5" strokeDasharray="2 2" fill="#FFFFFF" />
        {/* Torch / Flame symbol */}
        <path d="M28 14C28 12.5 30 11 30 11C30 11 32 12.5 32 14C32 15.2 31 16 30 16C29 16 28 15.2 28 14Z" fill="#1E6B38" />
        {/* Dynamic Monogram Initials */}
        <text
          x="30"
          y="27"
          textAnchor="middle"
          fill="#1E6B38"
          fontSize={initials.length > 2 ? "9" : "11"}
          fontWeight="800"
          fontFamily="system-ui, sans-serif"
          letterSpacing="-0.5"
        >
          {initials}
        </text>
        {/* Base ribbon / book */}
        <path d="M20 38C25 36 35 36 40 38C38 41 33 42 30 42C27 42 22 41 20 38Z" fill="#1E6B38" />
        <path d="M16 46C23 44 37 44 44 46" stroke="#1E6B38" strokeWidth="1.5" strokeLinecap="round" />
        {/* School motto dots */}
        <circle cx="21" cy="24" r="1.2" fill="#1E6B38" />
        <circle cx="39" cy="24" r="1.2" fill="#1E6B38" />
      </svg>
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

  const schoolName =
    user?.school_name ||
    (typeof window !== "undefined" ? localStorage.getItem("user_school_name") : null) ||
    "Institution Name";
  const schoolCity =
    user?.city ||
    (typeof window !== "undefined" ? localStorage.getItem("user_city") : null) ||
    "Campus Location";

  /* ── Shared sidebar content ── */
  const renderContent = (isMobile: boolean) => {
    const isExpanded = isMobile || !collapsed;

    return (
      <div className="flex flex-col h-full relative justify-between py-5 px-3.5 bg-white">
        {/* ── Top Section ── */}
        <div className="space-y-6">
          {/* ── Logo row ── */}
          <div
            className={`flex items-center shrink-0 ${
              isExpanded ? "justify-between px-1" : "flex-col items-center"
            }`}
          >
            {isExpanded ? (
              <>
                <Link href="/" className="flex items-center gap-2.5 min-w-0">
                  <VedaLogo size={38} />
                  <span className="text-[20px] font-extrabold text-[#1A1A1A] tracking-tight">VedaAI</span>
                </Link>

                {/* Top Collapse Toggle Icon */}
                {!isMobile && (
                  <button
                    onClick={toggleCollapsed}
                    title="Collapse sidebar"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F5F4F0] transition-all duration-150 shrink-0 cursor-pointer"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="16" rx="3" />
                      <line x1="9" y1="4" x2="9" y2="20" />
                    </svg>
                  </button>
                )}
              </>
            ) : (
              <Link href="/">
                <VedaLogo size={38} />
              </Link>
            )}
          </div>

          {/* ── AI Teacher's Toolkit Button ── */}
          {isExpanded ? (
            <div>
              <div className="bg-gradient-to-b from-[#FF7E4A] via-[#F4672E] to-[#E2551C] p-[2.5px] rounded-full shadow-[0_4px_16px_rgba(244,103,46,0.35)] hover:shadow-[0_6px_22px_rgba(244,103,46,0.5)] transition-all duration-200 group">
                <button className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-full bg-[#26272B] hover:bg-[#2E2F34] text-white text-[14.5px] font-medium transition-all duration-200 cursor-pointer active:scale-[0.99]">
                  {/* Twin White Sparkles Icon */}
                  <svg className="w-4 h-4 text-white fill-white shrink-0" viewBox="0 0 24 24">
                    <path d="M9 2L11 7.5L16.5 9.5L11 11.5L9 17L7 11.5L1.5 9.5L7 7.5L9 2Z" fill="white" />
                    <path d="M18.5 13L19.5 15.5L22 16.5L19.5 17.5L18.5 20L17.5 17.5L15 16.5L17.5 15.5L18.5 13Z" fill="white" />
                  </svg>
                  <span className="truncate">AI Teacher&apos;s Toolkit</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="bg-gradient-to-b from-[#FF7E4A] via-[#F4672E] to-[#E2551C] p-[2.5px] rounded-full shadow-[0_4px_12px_rgba(244,103,46,0.35)]">
                <div className="w-10 h-10 rounded-full bg-[#26272B] flex items-center justify-center shadow-sm">
                  <svg className="w-4 h-4 text-white fill-white" viewBox="0 0 24 24">
                    <path d="M9 2L11 7.5L16.5 9.5L11 11.5L9 17L7 11.5L1.5 9.5L7 7.5L9 2Z" fill="white" />
                    <path d="M18.5 13L19.5 15.5L22 16.5L19.5 17.5L18.5 20L17.5 17.5L15 16.5L17.5 15.5L18.5 13Z" fill="white" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* ── Navigation Items ── */}
          <nav className="space-y-1 pt-1">
            {navItems.map((item) => {
              // Mark Exams as active on dashboard or /exams
              const isExams = item.label === "Exams";
              const isActive = isExams
                ? pathname === "/dashboard" || pathname === "/" || pathname.startsWith("/exams")
                : pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

              const Icon = item.Icon;

              if (!isExpanded) {
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    title={item.label}
                    className={`flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-[#F0EFEB] text-[#1A1A1A]"
                        : "text-[#6B7280] hover:bg-[#FAF9F6] hover:text-[#1A1A1A]"
                    }`}
                  >
                    <Icon className="w-5 h-5" active={isActive} />
                  </Link>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[14px] transition-all duration-150 group ${
                    isActive
                      ? "bg-[#F0EFEB] text-[#1A1A1A] font-bold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.03)]"
                      : "text-[#6B7280] hover:bg-[#F5F4F0] hover:text-[#1A1A1A] font-medium"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-colors ${
                      isActive ? "text-[#1A1A1A]" : "text-[#6B7280] group-hover:text-[#1A1A1A]"
                    }`}
                    active={isActive}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ── Bottom section: Settings + Dynamic School Card + Collapse Toggle Below ── */}
        <div className="space-y-3 pt-4">
          {/* Settings */}
          {isExpanded ? (
            <div>
              <Link
                href="/profile"
                className={`flex items-center gap-3.5 px-3.5 py-2 rounded-xl text-[14px] transition-all duration-150 group ${
                  pathname === "/profile"
                    ? "bg-[#F0EFEB] text-[#1A1A1A] font-bold"
                    : "text-[#6B7280] hover:bg-[#F5F4F0] hover:text-[#1A1A1A] font-medium"
                }`}
              >
                <Settings
                  className={`w-5 h-5 shrink-0 transition-colors ${
                    pathname === "/profile" ? "text-[#1A1A1A]" : "text-[#6B7280] group-hover:text-[#1A1A1A]"
                  }`}
                />
                <span>Settings</span>
              </Link>
            </div>
          ) : (
            <div className="flex justify-center">
              <Link
                href="/profile"
                title="Settings"
                className="flex items-center justify-center w-10 h-10 rounded-xl text-[#6B7280] hover:bg-[#F5F4F0] hover:text-[#1A1A1A] transition-all duration-200"
              >
                <Settings className="w-5 h-5" />
              </Link>
            </div>
          )}

          {/* Dynamic School Card */}
          {isExpanded ? (
            <div className="space-y-2">
              <div className="bg-[#F0EFEB] rounded-2xl p-3 flex items-center gap-3">
                <DynamicSchoolEmblem schoolName={schoolName} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-bold text-[#1A1A1A] truncate leading-tight">
                    {schoolName}
                  </p>
                  <p className="text-[11.5px] text-[#6B7280] truncate leading-tight mt-0.5 font-medium">
                    {schoolCity}
                  </p>
                </div>
              </div>

              {/* Collapse Button Below School Card (Desktop - Icon Only) */}
              {!isMobile && (
                <div className="pt-0.5 flex justify-end">
                  <button
                    onClick={toggleCollapsed}
                    title="Collapse sidebar"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F5F4F0] transition-all duration-150 cursor-pointer"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2.5 pb-1" title={`${schoolName} - ${schoolCity}`}>
              <DynamicSchoolEmblem schoolName={schoolName} size={36} />
              
              {/* Expand Toggle Button Below DPS / School Crest (Collapsed: >>) */}
              <button
                onClick={toggleCollapsed}
                title="Expand sidebar"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F5F4F0] transition-all cursor-pointer"
              >
                <ChevronsRight className="w-4 h-4" />
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
        animate={{ width: collapsed ? 68 : 255 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="hidden lg:flex lg:flex-col shrink-0 bg-white border-r border-[#E5E4DF] h-screen sticky top-0 overflow-visible"
        style={{ minWidth: collapsed ? 68 : 255 }}
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
