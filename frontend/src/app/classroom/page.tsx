"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  BookOpen,
  Sparkles,
  ArrowRight,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  TrendingUp,
  FileText,
} from "lucide-react";
import { motion } from "framer-motion";

const initialClasses = [
  {
    id: "cls-1",
    name: "Class 10 - Section A",
    subject: "Biology & Life Sciences",
    studentsCount: 38,
    activeExams: 2,
    avgScore: "84%",
    lastAssessment: "Unit Test 3 — Photosynthesis",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    id: "cls-2",
    name: "Class 10 - Section B",
    subject: "Biology & Life Sciences",
    studentsCount: 36,
    activeExams: 1,
    avgScore: "78%",
    lastAssessment: "Unit Test 3 — Photosynthesis",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    id: "cls-3",
    name: "Class 12 - Section A",
    subject: "Advanced Human Physiology",
    studentsCount: 32,
    activeExams: 3,
    avgScore: "91%",
    lastAssessment: "Mid-Term Examination",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    id: "cls-4",
    name: "Class 9 - Section C",
    subject: "General Science",
    studentsCount: 40,
    activeExams: 1,
    avgScore: "82%",
    lastAssessment: "Quarterly Evaluation",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
  },
];

export default function ClassroomPage() {
  const [search, setSearch] = useState("");
  const filtered = initialClasses.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1A1A1A] tracking-tight">
            My Classroom
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Manage your enrolled classes, active exams, and batch evaluations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white text-xs font-bold hover:bg-[#2D2D2D] transition-colors flex items-center gap-2 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#E8611A]" />
            <span>Map Assessment</span>
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-[#E5E4DF] shadow-sm">
          <p className="text-xs text-[#6B7280] font-semibold">Total Students</p>
          <p className="text-2xl font-black text-[#1A1A1A] mt-1">146</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-[#E5E4DF] shadow-sm">
          <p className="text-xs text-[#6B7280] font-semibold">Active Classes</p>
          <p className="text-2xl font-black text-[#1A1A1A] mt-1">4</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-[#E5E4DF] shadow-sm">
          <p className="text-xs text-[#6B7280] font-semibold">Average Accuracy</p>
          <p className="text-2xl font-black text-[#15803D] mt-1">83.7%</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-[#E5E4DF] shadow-sm">
          <p className="text-xs text-[#6B7280] font-semibold">Pending Evaluations</p>
          <p className="text-2xl font-black text-[#E8611A] mt-1">7</p>
        </div>
      </div>

      {/* Search & filters */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by class name or subject..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E4DF] bg-white text-sm text-[#1A1A1A] focus:outline-none focus:border-[#E8611A] shadow-sm"
        />
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map((cls, idx) => (
          <motion.div
            key={cls.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white rounded-2xl border border-[#E5E4DF] p-5 shadow-sm hover:border-[#D1D5DB] transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#1A1A1A]">{cls.name}</h3>
                  <p className="text-xs text-[#6B7280] mt-0.5">{cls.subject}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${cls.badgeColor}`}>
                  {cls.avgScore} Avg
                </span>
              </div>

              <div className="bg-[#F5F4F0] rounded-xl p-3 text-xs space-y-1">
                <p className="text-[#6B7280]">Latest Assessment:</p>
                <p className="font-semibold text-[#1A1A1A]">{cls.lastAssessment}</p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[#E5E4DF]/60 flex items-center justify-between">
              <span className="text-xs text-[#6B7280] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {cls.studentsCount} Students
              </span>
              <Link
                href="/dashboard"
                className="text-xs font-bold text-[#E8611A] hover:text-[#C54E10] flex items-center gap-1"
              >
                <span>Upload Test</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
