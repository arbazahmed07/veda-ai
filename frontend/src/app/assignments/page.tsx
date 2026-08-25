"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Sparkles,
  ArrowRight,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
} from "lucide-react";
import { motion } from "framer-motion";

const initialAssignments = [
  {
    id: "asg-1",
    title: "Class 10 Unit Test 3: Photosynthesis & Respiration",
    class: "Class 10 - Section A",
    dueDate: "28 Aug 2026",
    submissions: "34 / 38",
    status: "active",
    statusLabel: "In Grading",
    scoreAvg: "17.4 / 20",
  },
  {
    id: "asg-2",
    title: "Class 12 Mid-Term: Human Anatomy & Circulation",
    class: "Class 12 - Section A",
    dueDate: "24 Aug 2026",
    submissions: "32 / 32",
    status: "completed",
    statusLabel: "Completed",
    scoreAvg: "44.2 / 50",
  },
  {
    id: "asg-3",
    title: "Class 9 Weekly Quiz: Cell Structure & Functions",
    class: "Class 9 - Section C",
    dueDate: "30 Aug 2026",
    submissions: "22 / 40",
    status: "pending",
    statusLabel: "Collecting",
    scoreAvg: "--",
  },
];

export default function AssignmentsPage() {
  const [filter, setFilter] = useState("all");

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1A1A1A] tracking-tight">
            Assignments
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Track student submissions, automated AI grading, and assessment feedback.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white text-xs font-bold hover:bg-[#2D2D2D] transition-colors flex items-center gap-2 shadow-sm self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#E8611A]" />
          <span>Upload New Assessment</span>
        </Link>
      </div>

      {/* Assignment List */}
      <div className="bg-white rounded-2xl border border-[#E5E4DF] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#E5E4DF] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#1A1A1A]">All Assignments</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#FEF0E8] text-[#E8611A] font-semibold">
              {initialAssignments.length}
            </span>
          </div>
        </div>

        <div className="divide-y divide-[#E5E4DF]">
          {initialAssignments.map((asg, idx) => (
            <motion.div
              key={asg.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#FAF9F6] transition-colors"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-sm sm:text-base font-bold text-[#1A1A1A]">{asg.title}</h3>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                      asg.status === "completed"
                        ? "bg-emerald-50 text-emerald-700"
                        : asg.status === "active"
                        ? "bg-[#FEF0E8] text-[#E8611A]"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {asg.statusLabel}
                  </span>
                </div>
                <p className="text-xs text-[#6B7280]">
                  {asg.class} • Due {asg.dueDate} • Submissions: <strong>{asg.submissions}</strong>
                </p>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                {asg.scoreAvg !== "--" && (
                  <div className="text-right hidden sm:block">
                    <p className="text-[11px] text-[#6B7280]">Class Avg</p>
                    <p className="text-sm font-bold text-[#1A1A1A]">{asg.scoreAvg}</p>
                  </div>
                )}
                <Link
                  href="/dashboard"
                  className="px-4 py-2 rounded-xl bg-[#F5F4F0] hover:bg-[#E5E4DF] text-xs font-bold text-[#1A1A1A] flex items-center gap-1.5 transition-colors"
                >
                  <span>Grade / Map</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
