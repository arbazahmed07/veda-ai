"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, AlertTriangle, Sparkles, CheckCircle2, Search, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function PlagiarismPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1A1A1A] tracking-tight">
            AI &amp; Academic Integrity Checker
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Detect cross-student peer similarity, uncredited text copying, and AI-generated answers.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white text-xs font-bold hover:bg-[#2D2D2D] transition-colors flex items-center gap-2 shadow-sm self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#E8611A]" />
          <span>Upload Assessment Scan</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-[#E5E4DF] shadow-sm">
          <p className="text-xs font-semibold text-[#6B7280]">Average Originality</p>
          <p className="text-3xl font-black text-[#15803D] mt-2">97.2%</p>
          <p className="text-xs text-[#9CA3AF] mt-1">Across 146 answer sheets</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-[#E5E4DF] shadow-sm">
          <p className="text-xs font-semibold text-[#6B7280]">Flagged Matches</p>
          <p className="text-3xl font-black text-[#E8611A] mt-2">2</p>
          <p className="text-xs text-[#9CA3AF] mt-1">Over 40% similarity</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-[#E5E4DF] shadow-sm">
          <p className="text-xs font-semibold text-[#6B7280]">Integrity Status</p>
          <p className="text-3xl font-black text-[#1A1A1A] mt-2">Secure</p>
          <p className="text-xs text-[#9CA3AF] mt-1">No systemic leak detected</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E4DF] p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-[#1A1A1A]">Recent Exam Scans</h2>
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E5E4DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#1A1A1A]">Class 10 Unit Test 3 (Photosynthesis &amp; Respiration)</p>
              <p className="text-xs text-[#6B7280] mt-0.5">38 Answer sheets checked • 0 cross-student copy detected</p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full self-start sm:self-auto">
              100% Original
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
