"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Search, Sparkles, ArrowRight, Award, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const initialStudents = [
  { id: "std-1", name: "Aarav Sharma", rollNo: "10A-01", class: "Class 10 - Section A", avgScore: "92%", lastSubmitted: "Class 10 Unit Test 3", status: "Evaluated" },
  { id: "std-2", name: "Diya Patel", rollNo: "10A-02", class: "Class 10 - Section A", avgScore: "88%", lastSubmitted: "Class 10 Unit Test 3", status: "Evaluated" },
  { id: "std-3", name: "Rohan Gupta", rollNo: "10A-03", class: "Class 10 - Section A", avgScore: "74%", lastSubmitted: "Class 10 Unit Test 3", status: "Evaluated" },
  { id: "std-4", name: "Ananya Iyer", rollNo: "10A-04", class: "Class 10 - Section A", avgScore: "95%", lastSubmitted: "Class 10 Unit Test 3", status: "Evaluated" },
  { id: "std-5", name: "Kabir Mehta", rollNo: "10A-05", class: "Class 10 - Section A", avgScore: "68%", lastSubmitted: "Class 10 Unit Test 3", status: "Needs Review" },
];

export default function StudentsPage() {
  const [search, setSearch] = useState("");
  const filtered = initialStudents.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.rollNo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1A1A1A] tracking-tight">
            Students Directory
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Track individual student answer sheets, question-by-question marks, and AI progress feedback.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white text-xs font-bold hover:bg-[#2D2D2D] transition-colors flex items-center gap-2 shadow-sm self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#E8611A]" />
          <span>Upload Student Answer Sheet</span>
        </Link>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by student name or roll number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E4DF] bg-white text-sm text-[#1A1A1A] focus:outline-none focus:border-[#E8611A] shadow-sm"
        />
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E4DF] overflow-hidden shadow-sm">
        <div className="divide-y divide-[#E5E4DF]">
          {filtered.map((s, idx) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.04 }}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAF9F6] transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-[#FEF0E8] text-[#E8611A] flex items-center justify-center font-bold text-sm shrink-0">
                  {s.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1A1A1A]">{s.name}</h3>
                  <p className="text-xs text-[#6B7280]">
                    Roll: <strong>{s.rollNo}</strong> • {s.class}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 sm:gap-6 self-end sm:self-auto">
                <div className="text-right">
                  <p className="text-[11px] text-[#6B7280]">Avg Score</p>
                  <p className="text-sm font-black text-[#1A1A1A]">{s.avgScore}</p>
                </div>

                <Link
                  href="/dashboard"
                  className="px-3.5 py-1.5 rounded-xl bg-[#F5F4F0] hover:bg-[#E5E4DF] text-xs font-bold text-[#1A1A1A] flex items-center gap-1.5 transition-colors"
                >
                  <span>View Answers</span>
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
