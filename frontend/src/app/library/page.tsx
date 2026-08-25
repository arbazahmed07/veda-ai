"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Library,
  FileText,
  Search,
  Download,
  ExternalLink,
  BookOpen,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";

const initialDocs = [
  {
    id: "doc-1",
    title: "Class 10 Biology Question Paper — Standard Term 1",
    type: "Question Paper",
    pages: 2,
    size: "2.1 MB",
    date: "Aug 2026",
    subject: "Biology",
  },
  {
    id: "doc-2",
    title: "Class 10 Biology Standard Answer Key & Marking Scheme",
    type: "Marking Scheme",
    pages: 3,
    size: "1.4 MB",
    date: "Aug 2026",
    subject: "Biology",
  },
  {
    id: "doc-3",
    title: "Class 12 Human Physiology Test Blueprint",
    type: "Blueprint",
    pages: 4,
    size: "3.2 MB",
    date: "Jul 2026",
    subject: "Physiology",
  },
  {
    id: "doc-4",
    title: "Class 9 General Science Mid-Term Question Paper",
    type: "Question Paper",
    pages: 2,
    size: "1.8 MB",
    date: "Jun 2026",
    subject: "Science",
  },
];

export default function LibraryPage() {
  const [search, setSearch] = useState("");
  const filtered = initialDocs.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1A1A1A] tracking-tight">
            My Library
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Browse stored question papers, marking rubrics, and exam templates.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white text-xs font-bold hover:bg-[#2D2D2D] transition-colors flex items-center gap-2 shadow-sm self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#E8611A]" />
          <span>Upload Assessment</span>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search question papers, answer keys, or rubrics..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E4DF] bg-white text-sm text-[#1A1A1A] focus:outline-none focus:border-[#E8611A] shadow-sm"
        />
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((doc, idx) => (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
            className="bg-white rounded-2xl border border-[#E5E4DF] p-5 shadow-sm hover:border-[#D1D5DB] transition-all flex flex-col justify-between"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#FEF0E8] text-[#E8611A] flex items-center justify-center font-bold text-xs shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#E8611A] bg-[#FEF0E8] px-2 py-0.5 rounded-full">
                  {doc.type}
                </span>
                <h3 className="text-sm font-bold text-[#1A1A1A] mt-1.5 leading-snug">
                  {doc.title}
                </h3>
                <p className="text-xs text-[#6B7280] mt-1">
                  {doc.pages} Pages • {doc.size} • {doc.date}
                </p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[#E5E4DF]/60 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6B7280]">
                {doc.subject}
              </span>
              <Link
                href="/dashboard"
                className="text-xs font-bold text-[#1A1A1A] hover:text-[#E8611A] flex items-center gap-1.5 transition-colors"
              >
                <span>Use for Mapping</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
