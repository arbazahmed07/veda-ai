"use client";

import { BarChart3, TrendingUp, Sparkles, Award, CheckCircle2, AlertTriangle, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function AnalyticsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1A1A1A] tracking-tight">
            Assessment Analytics
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Real-time insight on student accuracy, question difficulty, and common mistakes.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white text-xs font-bold hover:bg-[#2D2D2D] transition-colors flex items-center gap-2 shadow-sm self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#E8611A]" />
          <span>Map New Exam</span>
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-[#E5E4DF] shadow-sm">
          <p className="text-xs font-semibold text-[#6B7280]">Average Score</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-black text-[#1A1A1A]">84.2%</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              +3.4%
            </span>
          </div>
          <p className="text-xs text-[#9CA3AF] mt-2">Across 146 evaluated students</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E5E4DF] shadow-sm">
          <p className="text-xs font-semibold text-[#6B7280]">AI Mapping Accuracy</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-black text-[#15803D]">98.6%</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              High
            </span>
          </div>
          <p className="text-xs text-[#9CA3AF] mt-2">Bounding box extraction match</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E5E4DF] shadow-sm">
          <p className="text-xs font-semibold text-[#6B7280]">Hardest Question</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-black text-[#E8611A]">Q4</span>
            <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
              42% Correct
            </span>
          </div>
          <p className="text-xs text-[#9CA3AF] mt-2">Heart valve blood circulation</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E5E4DF] shadow-sm">
          <p className="text-xs font-semibold text-[#6B7280]">Easiest Question</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-black text-[#15803D]">Q1</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              96% Correct
            </span>
          </div>
          <p className="text-xs text-[#9CA3AF] mt-2">Artery vs Vein identification</p>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Question Difficulty Breakdown */}
        <div className="bg-white rounded-2xl border border-[#E5E4DF] p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-[#1A1A1A]">Question Performance Breakdown</h2>
          <div className="space-y-3">
            {[
              { q: "Q1: Blood Vessel / Heart Away", rate: 96, color: "bg-emerald-500" },
              { q: "Q2: Photosynthesis Organelle", rate: 89, color: "bg-emerald-500" },
              { q: "Q3: Chloroplast Role & Pigments", rate: 82, color: "bg-emerald-500" },
              { q: "Q4: Heart Blood Flow Valve Flow", rate: 42, color: "bg-red-500" },
              { q: "Q5: Alveolus Gas Exchange", rate: 78, color: "bg-amber-500" },
              { q: "Q6: Human Digestive System Diagram", rate: 85, color: "bg-emerald-500" },
            ].map((item, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-[#1A1A1A]">{item.q}</span>
                  <span className="text-[#6B7280]">{item.rate}%</span>
                </div>
                <div className="w-full h-2 bg-[#F5F4F0] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${item.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Pedagogical Recommendations */}
        <div className="bg-white rounded-2xl border border-[#E5E4DF] p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#E8611A]" />
            <h2 className="text-base font-bold text-[#1A1A1A]">AI Teaching Insights</h2>
          </div>
          <div className="space-y-3">
            <div className="bg-[#FAF9F6] border border-[#E5E4DF] rounded-xl p-4 space-y-1">
              <p className="text-xs font-bold text-[#1A1A1A]">Topic Revision Needed: Cardiac Valves</p>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Over 58% of students confused the bicuspid and tricuspid valve sequence in Question 4. Recommend a 10-minute recap before the next unit.
              </p>
            </div>
            <div className="bg-[#FAF9F6] border border-[#E5E4DF] rounded-xl p-4 space-y-1">
              <p className="text-xs font-bold text-[#1A1A1A]">High Concept Mastery: Photosynthesis</p>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                Students demonstrated clear understanding of light and dark reactions with 89% average score on chloroplast diagrams.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
