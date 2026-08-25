"use client";

import Link from "next/link";
import { Award, FileText, Sparkles, Download, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function ResultsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1A1A1A] tracking-tight">
            Assessment Results Archive
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            View completed question extractions, evaluated marks, and generated report cards.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white text-xs font-bold hover:bg-[#2D2D2D] transition-colors flex items-center gap-2 shadow-sm self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#E8611A]" />
          <span>New Assessment Mapping</span>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E4DF] overflow-hidden shadow-sm">
        <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                Evaluated
              </span>
              <h3 className="text-base font-bold text-[#1A1A1A]">
                Class 10 Biology Unit Test (Photosynthesis)
              </h3>
            </div>
            <p className="text-xs text-[#6B7280]">
              Evaluated on 25 Aug 2026 • 6 Questions • Total Marks: <strong>12 / 12 (100%)</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl bg-[#1A1A1A] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#2D2D2D] transition-colors"
            >
              <span>Open in Assessment Viewer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
