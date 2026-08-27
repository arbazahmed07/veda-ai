"use client";

import { useState, useRef } from "react";
import {
  Sparkles,
  UploadCloud,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/components/ui/Toast";

interface BoundingBox {
  page: number;
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

interface MappedQuestion {
  question_number: string;
  question_text: string;
  max_marks: number;
  score: number;
  status: "correct" | "partially_correct" | "incorrect" | "unanswered";
  is_answered: boolean;
  student_answer_text?: string;
  ai_feedback?: string;
  boxes?: BoundingBox[];
}

interface UnmappedAnswer {
  raw_label?: string;
  transcription?: string;
  ai_comment?: string;
  boxes?: BoundingBox[];
}

interface AssessmentPage {
  page_number: number;
  width: number;
  height: number;
  image_base64: string;
}

interface AssessmentResult {
  exam_title: string;
  subject: string;
  total_marks: number;
  summary: {
    student_name?: string;
    total_score: number;
    max_score: number;
    percentage: number;
    general_feedback?: string;
  };
  questions: MappedQuestion[];
  unmapped_answers?: UnmappedAnswer[];
  question_paper_pages: AssessmentPage[];
  answer_sheet_pages: AssessmentPage[];
}

export default function AssessmentMappingPage() {
  const { showToast } = useToast();

  // Upload States
  const [qpFile, setQpFile] = useState<File | null>(null);
  const [ansFile, setAnsFile] = useState<File | null>(null);
  const [qpDragActive, setQpDragActive] = useState(false);
  const [ansDragActive, setAnsDragActive] = useState(false);

  // Processing States
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("Extracting questions and mapping answers...");

  // Result States
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number>(0);
  const [selectedUnmappedIndex, setSelectedUnmappedIndex] = useState<number | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<{ [key: number]: boolean }>({ 0: true });
  const [allExpanded, setAllExpanded] = useState(false);

  // Answer Sheet Viewer States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [mobileTab, setMobileTab] = useState<"questions" | "answersheet">("questions");

  const qpInputRef = useRef<HTMLInputElement>(null);
  const ansInputRef = useRef<HTMLInputElement>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  // Helper formatting for file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  // Drag and drop handlers
  const handleQpDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setQpDragActive(false);
    if (e.dataTransfer.files?.[0]) setQpFile(e.dataTransfer.files[0]);
  };

  const handleAnsDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setAnsDragActive(false);
    if (e.dataTransfer.files?.[0]) setAnsFile(e.dataTransfer.files[0]);
  };

  // Submit assessment mapping
  const handleStartMapping = async () => {
    if (!qpFile || !ansFile) {
      showToast("Please upload both Question Paper and Answer Sheet.", "warning");
      return;
    }

    setIsProcessing(true);
    setProcessingStatus("Extracting questions from question paper...");

    const formData = new FormData();
    formData.append("question_paper", qpFile);
    formData.append("answer_sheet", ansFile);

    try {
      const timer1 = setTimeout(() => setProcessingStatus("Extracting handwritten answers..."), 4000);
      const timer2 = setTimeout(() => setProcessingStatus("Locating answer regions on answer sheet..."), 9000);
      const timer3 = setTimeout(() => setProcessingStatus("Grading and generating AI feedback..."), 15000);

      const res = await apiClient.post("/assessment/map", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 180000,
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      const data: AssessmentResult = res.data;
      setResult(data);
      setSelectedQuestionIndex(0);
      setSelectedUnmappedIndex(null);
      setExpandedQuestions({ 0: true });
      setCurrentPage(data.questions[0]?.boxes?.[0]?.page || 1);
      showToast("Assessment mapped and graded successfully!", "success");
    } catch (err: any) {
      console.error("Mapping error:", err);
      const msg = err.response?.data?.detail || "Failed to process assessment. Please try again.";
      showToast(msg, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Select question and focus answer region
  const handleSelectQuestion = (idx: number) => {
    setSelectedQuestionIndex(idx);
    setSelectedUnmappedIndex(null);
    setExpandedQuestions((prev) => ({ ...prev, [idx]: !prev[idx] }));

    const q = result?.questions[idx];
    if (q && q.boxes && q.boxes.length > 0) {
      const targetPage = q.boxes[0].page;
      if (targetPage) {
        setCurrentPage(targetPage);
      }
    }
  };

  // Select unmapped answer
  const handleSelectUnmapped = (idx: number) => {
    setSelectedUnmappedIndex(idx);
    setSelectedQuestionIndex(-1);
    const item = result?.unmapped_answers?.[idx];
    if (item && item.boxes && item.boxes.length > 0) {
      const targetPage = item.boxes[0].page;
      if (targetPage) {
        setCurrentPage(targetPage);
      }
    }
  };

  // Toggle expand all questions
  const handleToggleExpandAll = () => {
    if (!result) return;
    const nextState = !allExpanded;
    setAllExpanded(nextState);
    const newExpanded: { [key: number]: boolean } = {};
    result.questions.forEach((_, idx) => {
      newExpanded[idx] = nextState;
    });
    setExpandedQuestions(newExpanded);
  };

  // Reset to upload state
  const handleReset = () => {
    setResult(null);
    setQpFile(null);
    setAnsFile(null);
    setSelectedQuestionIndex(0);
    setSelectedUnmappedIndex(null);
    setZoomLevel(100);
    setCurrentPage(1);
  };

  const selectedQuestion = result?.questions[selectedQuestionIndex];
  const currentPageData = result?.answer_sheet_pages?.find((p) => p.page_number === currentPage);
  const totalPages = result?.answer_sheet_pages?.length || 1;

  return (
    <div className="w-full flex-1 flex flex-col bg-[#F5F4F0] min-h-[calc(100vh-3.5rem)]">
      {/* ── 1. UPLOAD VIEW (Figma 1/9, 2/9, 3/9, 4/9) ── */}
      {!isProcessing && !result && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12 max-w-5xl mx-auto w-full">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-2 mb-6"
          >
            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#1A1A1A] tracking-tight"
              style={{ fontFamily: "var(--font-bricolage, 'Bricolage Grotesque', sans-serif)" }}
            >
              Upload{" "}
              <span className="bg-[#FEF0E8] text-[#E8611A] px-3.5 py-1 rounded-2xl inline-block">
                Question Paper &amp; Answer Sheets
              </span>
            </h1>
            <p className="text-sm sm:text-base text-[#1A1A1A] font-medium">
              Upload both files to get started
            </p>
          </motion.div>

          {/* Teacher Avatar Illustration */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-8 select-none"
          >
            <div className="relative w-44 h-44 sm:w-52 sm:h-52 md:w-56 md:h-56 flex items-center justify-center mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/image.png"
                alt="Teacher Illustration"
                className="w-full h-full object-contain pointer-events-none drop-shadow-sm select-none"
              />

              {/* Orbiting Orange Icon Badge 1: Document (Left ~9:00) */}
              <div className="absolute left-0 top-[48%] -translate-y-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#E8611A] text-white flex items-center justify-center shadow-md z-20">
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="3" width="16" height="18" rx="2" />
                  <line x1="8" y1="8" x2="16" y2="8" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                  <line x1="8" y1="16" x2="12" y2="16" />
                </svg>
              </div>

              {/* Orbiting Orange Icon Badge 2: Clock (Top Right ~1:30) */}
              <div className="absolute right-7 sm:right-9 top-2 sm:top-3 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#E8611A] text-white flex items-center justify-center shadow-md z-20">
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <polyline points="12 7 12 12 15 14" />
                </svg>
              </div>

              {/* Orbiting Orange Icon Badge 3: Cloud Upload (Mid Right ~4:00) */}
              <div className="absolute right-1 sm:right-2 bottom-11 sm:bottom-14 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#E8611A] text-white flex items-center justify-center shadow-md z-20">
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                  <polyline points="12 13 12 9 10 11" />
                </svg>
              </div>

              {/* Orbiting Orange Icon Badge 4: Settings / Gear (Bottom ~6:00) */}
              <div className="absolute bottom-1 sm:bottom-2 left-[51%] -translate-x-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#E8611A] text-white flex items-center justify-center shadow-md z-20">
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </div>
            </div>
          </motion.div>

          {/* Two Upload Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-8">
            {/* Card 1: Question Paper */}
            <div
              onDragEnter={() => setQpDragActive(true)}
              onDragLeave={() => setQpDragActive(false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleQpDrop}
              onClick={() => !qpFile && qpInputRef.current?.click()}
              className={`rounded-[24px] border-[1.5px] border-dashed p-7 sm:p-9 flex flex-col items-center justify-center text-center transition-all min-h-[210px] bg-white ${qpDragActive
                  ? "border-[#E8611A] bg-[#FEF0E8]/40 scale-[1.01]"
                  : qpFile
                    ? "border-[#E5E4DF] bg-white"
                    : "border-[#D5D4CE] hover:border-[#E8611A] hover:bg-[#FEF0E8]/20 cursor-pointer"
                }`}
            >
              <input
                ref={qpInputRef}
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && setQpFile(e.target.files[0])}
              />

              {!qpFile ? (
                <div className="space-y-3.5 flex flex-col items-center">
                  {/* Upload Icon Box */}
                  <div className="w-12 h-12 rounded-[14px] bg-[#F5F4F0] flex items-center justify-center text-[#1A1A1A] shadow-sm">
                    <svg className="w-5 h-5 text-[#1A1A1A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                      <polyline points="7 9 12 4 17 9" />
                      <line x1="12" y1="4" x2="12" y2="16" />
                    </svg>
                  </div>
                  <div>
                    <p
                      className="text-lg sm:text-xl font-bold text-[#1A1A1A] tracking-tight"
                      style={{ fontFamily: "var(--font-bricolage, 'Bricolage Grotesque', sans-serif)" }}
                    >
                      Upload <span className="text-[#FF5722]">Question Paper</span>
                    </p>
                    <p className="text-xs text-[#9CA3AF] mt-1 font-medium">Max 10MB</p>
                  </div>
                </div>
              ) : (
                <div className="w-full flex items-center justify-between bg-[#FAF9F6] border border-[#E5E4DF] rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                      PDF
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-sm font-bold text-[#1A1A1A] truncate max-w-[200px] sm:max-w-[240px]">
                        {qpFile.name}
                      </p>
                      <p className="text-xs text-[#6B7280] mt-0.5">
                        {formatFileSize(qpFile.size)} • Document
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setQpFile(null);
                    }}
                    className="w-7 h-7 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center hover:bg-red-500 transition-colors shadow-sm cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Card 2: Answer Sheet */}
            <div
              onDragEnter={() => setAnsDragActive(true)}
              onDragLeave={() => setAnsDragActive(false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleAnsDrop}
              onClick={() => !ansFile && ansInputRef.current?.click()}
              className={`rounded-[24px] border-[1.5px] border-dashed p-7 sm:p-9 flex flex-col items-center justify-center text-center transition-all min-h-[210px] bg-white ${ansDragActive
                  ? "border-[#E8611A] bg-[#FEF0E8]/40 scale-[1.01]"
                  : ansFile
                    ? "border-[#E5E4DF] bg-white"
                    : "border-[#D5D4CE] hover:border-[#E8611A] hover:bg-[#FEF0E8]/20 cursor-pointer"
                }`}
            >
              <input
                ref={ansInputRef}
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && setAnsFile(e.target.files[0])}
              />

              {!ansFile ? (
                <div className="space-y-3.5 flex flex-col items-center">
                  {/* Upload Icon Box */}
                  <div className="w-12 h-12 rounded-[14px] bg-[#F5F4F0] flex items-center justify-center text-[#1A1A1A] shadow-sm">
                    <svg className="w-5 h-5 text-[#1A1A1A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                      <polyline points="7 9 12 4 17 9" />
                      <line x1="12" y1="4" x2="12" y2="16" />
                    </svg>
                  </div>
                  <div>
                    <p
                      className="text-lg sm:text-xl font-bold text-[#1A1A1A] tracking-tight"
                      style={{ fontFamily: "var(--font-bricolage, 'Bricolage Grotesque', sans-serif)" }}
                    >
                      Upload <span className="text-[#FF5722]">Answer Sheet</span>
                    </p>
                    <p className="text-xs text-[#9CA3AF] mt-1 font-medium">Max 10MB</p>
                  </div>
                </div>
              ) : (
                <div className="w-full flex items-center justify-between bg-[#FAF9F6] border border-[#E5E4DF] rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                      PDF
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-sm font-bold text-[#1A1A1A] truncate max-w-[200px] sm:max-w-[240px]">
                        {ansFile.name}
                      </p>
                      <p className="text-xs text-[#6B7280] mt-0.5">
                        {formatFileSize(ansFile.size)} • Document
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAnsFile(null);
                    }}
                    className="w-7 h-7 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center hover:bg-red-500 transition-colors shadow-sm cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Action CTA */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handleStartMapping}
              disabled={!qpFile || !ansFile}
              className={`px-8 py-3.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all duration-200 ${qpFile && ansFile
                  ? "bg-[#1A1A1A] text-white hover:bg-[#2D2D2D] hover:shadow-lg cursor-pointer active:scale-98"
                  : "bg-[#D1D5DB] text-[#9CA3AF] cursor-not-allowed"
                }`}
            >
              <span>Start Mapping</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-xs text-[#9CA3AF] text-center">
              Once both files are uploaded, you'll able to map answers with questions
            </p>
          </div>
        </div>
      )}

      {/* ── 2. EXTRACTING LOADING STATE (Figma 5/9) ── */}
      {isProcessing && (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-6 text-center max-w-sm"
          >
            {/* Sparkling stars icon from /icon.png */}
            <motion.div
              animate={{
                scale: [1, 1.08, 1],
                rotate: [0, 3, -3, 0],
              }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative w-28 h-28 flex items-center justify-center select-none"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/extract-icon.png"
                alt="Extracting"
                className="w-full h-full object-contain pointer-events-none drop-shadow-sm select-none"
              />
            </motion.div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-[#1A1A1A]">Extracting...</h2>
              <p className="text-sm text-[#6B7280]">This may take a while</p>
              <p className="text-xs text-[#E8611A] font-semibold mt-2">
                {processingStatus}
              </p>
            </div>

            {/* Progress line */}
            <div className="w-48 h-1.5 bg-[#E5E4DF] rounded-full overflow-hidden">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-1/2 h-full bg-[#E8611A] rounded-full"
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* ── 3. RESULTS SIDE-BY-SIDE MAPPING & HIGHLIGHTING VIEW (Figma 7/9, 8/9, 9/9) ── */}
      {!isProcessing && result && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Mobile Segmented Switcher (Figma 8/9 & 9/9) */}
          <div className="lg:hidden p-3 bg-white border-b border-[#E5E4DF] flex items-center justify-center gap-2">
            <div className="bg-[#F5F4F0] p-1 rounded-full flex w-full max-w-xs">
              <button
                onClick={() => setMobileTab("questions")}
                className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${mobileTab === "questions"
                    ? "bg-[#1A1A1A] text-white shadow-sm"
                    : "text-[#6B7280] hover:text-[#1A1A1A]"
                  }`}
              >
                Questions
              </button>
              <button
                onClick={() => setMobileTab("answersheet")}
                className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${mobileTab === "answersheet"
                    ? "bg-[#1A1A1A] text-white shadow-sm"
                    : "text-[#6B7280] hover:text-[#1A1A1A]"
                  }`}
              >
                Answer Sheet
              </button>
            </div>
          </div>

          {/* Main Desktop Split Container */}
          <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
            {/* ── LEFT COLUMN: EXTRACTED QUESTIONS (Figma 7/9) ── */}
            <div
              className={`w-full lg:w-[48%] xl:w-[45%] flex flex-col border-r border-[#E5E4DF] bg-white ${mobileTab === "questions" ? "flex" : "hidden lg:flex"
                }`}
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-[#E5E4DF] flex items-center justify-between shrink-0 bg-white">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-[#1A1A1A]">
                    Extracted Questions (from question paper)
                  </h2>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    {result.questions.length} questions extracted • Score:{" "}
                    <strong className="text-[#1A1A1A]">
                      {result.summary?.total_score ?? 0} / {result.total_marks}
                    </strong>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleExpandAll}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full border border-[#E5E4DF] hover:bg-[#F5F4F0] text-[#6B7280] transition-colors"
                  >
                    {allExpanded ? "Collapse All" : "Expand All"}
                  </button>
                  <button
                    onClick={handleReset}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#FEF0E8] text-[#E8611A] hover:bg-[#FCE4D6] transition-colors"
                    title="Upload New Assessment"
                  >
                    New Upload
                  </button>
                </div>
              </div>

              {/* Questions List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
                {/* Overall Assessment Summary Card */}
                {result.summary && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#FAF9F6] to-[#FEF0E8]/40 border border-[#E8611A]/20 shadow-sm space-y-3 mb-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-[#E8611A] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          ✦
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-[#1A1A1A]">
                            Grading &amp; AI Performance Summary
                          </h3>
                          <p className="text-[11px] text-[#6B7280]">
                            {result.summary.student_name || "Student Assessment"}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-black text-[#1A1A1A]">
                          {result.summary.total_score} <span className="text-xs text-[#6B7280] font-normal">/ {result.summary.max_score || result.total_marks}</span>
                        </div>
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8611A] text-white">
                          {result.summary.percentage ?? Math.round(((result.summary.total_score || 0) / (result.total_marks || 1)) * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-[#E5E4DF] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#E8611A] rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(0, result.summary.percentage ?? Math.round(((result.summary.total_score || 0) / (result.total_marks || 1)) * 100)))}%`,
                        }}
                      />
                    </div>

                    {/* Status Pills Breakdown */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium pt-1">
                      <span className="px-2 py-0.5 rounded-md bg-[#DCFCE7] text-[#15803D] font-bold">
                        Correct: {result.questions.filter((q) => q.status === "correct").length}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#FEF0E8] text-[#E8611A] font-bold">
                        Partial: {result.questions.filter((q) => q.status === "partially_correct").length}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#FEE2E2] text-[#B91C1C] font-bold">
                        Incorrect: {result.questions.filter((q) => q.status === "incorrect").length}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#F3F4F6] text-[#4B5563] font-bold">
                        Unanswered: {result.questions.filter((q) => q.status === "unanswered" || !q.is_answered).length}
                      </span>
                    </div>

                    {result.summary.general_feedback && (
                      <div className="text-xs text-[#4B5563] bg-white/80 border border-[#E5E4DF] rounded-xl p-3 leading-relaxed italic">
                        "{result.summary.general_feedback}"
                      </div>
                    )}
                  </motion.div>
                )}

                {result.questions.map((q, idx) => {
                  const isSelected = selectedQuestionIndex === idx;
                  const isExpanded = expandedQuestions[idx] ?? false;

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => handleSelectQuestion(idx)}
                      className={`rounded-2xl transition-all duration-200 cursor-pointer overflow-hidden border ${isSelected
                          ? "border-2 border-[#E8611A] bg-white shadow-md"
                          : "border-[#E5E4DF] bg-white hover:border-[#D1D5DB] shadow-sm"
                        }`}
                    >
                      <div className="p-4 sm:p-5">
                        <div className="flex items-start gap-3.5">
                          {/* Question Number Circle */}
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-colors ${isSelected
                                ? "bg-[#E8611A] text-white shadow-sm"
                                : "bg-[#4B5563] text-white"
                              }`}
                          >
                            {q.question_number}
                          </div>

                          {/* Question Text */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#1A1A1A] leading-relaxed">
                              {q.question_text}
                            </p>
                          </div>

                          {/* Score Badge */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-xs font-bold px-2.5 py-1 rounded-full ${q.status === "correct"
                                  ? "bg-[#DCFCE7] text-[#15803D]"
                                  : q.status === "partially_correct"
                                    ? "bg-[#FEF0E8] text-[#E8611A]"
                                    : q.status === "unanswered"
                                      ? "bg-[#F3F4F6] text-[#9CA3AF]"
                                      : "bg-[#FEE2E2] text-[#B91C1C]"
                                }`}
                            >
                              {q.is_answered
                                ? `${q.score} / ${q.max_marks}`
                                : `0 / ${q.max_marks}`}
                            </span>

                            {/* Chevron */}
                            <span className="text-[#9CA3AF]">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Expanded AI Feedback Section */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-4 pt-3.5 border-t border-[#E5E4DF]/60 space-y-3"
                            >
                              {/* AI Feedback Box */}
                              <div className="rounded-xl bg-[#F5F4F0] p-3.5 sm:p-4 space-y-1.5">
                                <p className="text-xs font-bold text-[#1A1A1A] flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-[#E8611A]" />
                                  AI Feedback
                                </p>
                                <p className="text-xs text-[#4B5563] leading-relaxed">
                                  {q.ai_feedback || "No feedback generated."}
                                </p>
                              </div>

                              {/* Student Transcribed Answer */}
                              {q.student_answer_text && (
                                <div className="space-y-1">
                                  <p className="text-[11px] font-semibold text-[#6B7280]">
                                    Student's Written Answer:
                                  </p>
                                  <p className="text-xs text-[#1A1A1A] italic bg-[#FAF9F6] border border-[#E5E4DF] rounded-lg p-2.5">
                                    "{q.student_answer_text}"
                                  </p>
                                </div>
                              )}

                              {/* Multi-page Answer Bounding Box Chips */}
                              {q.boxes && q.boxes.length > 0 && (
                                <div className="space-y-1.5 pt-1">
                                  <p className="text-[11px] font-semibold text-[#6B7280]">
                                    Answer Sheet Location ({q.boxes.length} {q.boxes.length === 1 ? "region" : "regions"}):
                                  </p>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {q.boxes.map((box, bIdx) => (
                                      <button
                                        key={bIdx}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedQuestionIndex(idx);
                                          setSelectedUnmappedIndex(null);
                                          setCurrentPage(box.page);
                                          setMobileTab("answersheet");
                                        }}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${currentPage === box.page && isSelected
                                            ? "bg-[#22C55E] text-white shadow-sm"
                                            : "bg-[#F5F4F0] border border-[#E5E4DF] text-[#1A1A1A] hover:bg-[#E5E4DF]"
                                          }`}
                                      >
                                        <span>📍 Page {box.page}</span>
                                        {q.boxes!.length > 1 && <span className="text-[10px] opacity-80">(Part {bIdx + 1})</span>}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Jump to Highlight Button (Mobile) */}
                              <div className="lg:hidden pt-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMobileTab("answersheet");
                                    if (q.boxes?.[0]?.page) setCurrentPage(q.boxes[0].page);
                                  }}
                                  className="w-full py-2 rounded-xl bg-[#1A1A1A] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                                >
                                  <span>View Answer Region</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Unmapped / Extra Answers Section */}
                {result.unmapped_answers && result.unmapped_answers.length > 0 && (
                  <div className="pt-4 space-y-3 border-t border-[#E5E4DF]">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-[#E8611A] uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#E8611A]" />
                        Unmapped / Extra Answers ({result.unmapped_answers.length})
                      </h3>
                      <span className="text-[11px] text-[#6B7280]">Does not match paper questions</span>
                    </div>

                    <div className="space-y-2.5">
                      {result.unmapped_answers.map((unmapped, uIdx) => {
                        const isSelectedUnmapped = selectedUnmappedIndex === uIdx;
                        return (
                          <motion.div
                            key={uIdx}
                            onClick={() => handleSelectUnmapped(uIdx)}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${isSelectedUnmapped
                                ? "border-2 border-[#F59E0B] bg-[#FFFBEB] shadow-md"
                                : "border-[#E5E4DF] bg-white hover:border-[#D1D5DB]"
                              }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-bold text-[#D97706] bg-[#FEF3C7] px-2 py-0.5 rounded-md">
                                {unmapped.raw_label || `Extra Answer #${uIdx + 1}`}
                              </span>
                              {unmapped.boxes?.[0]?.page && (
                                <span className="text-[11px] font-semibold text-[#6B7280]">
                                  📍 Page {unmapped.boxes[0].page}
                                </span>
                              )}
                            </div>

                            {unmapped.transcription && (
                              <p className="text-xs text-[#1A1A1A] italic mt-2 bg-[#FAF9F6] p-2 rounded-lg border border-[#E5E4DF]">
                                "{unmapped.transcription}"
                              </p>
                            )}

                            {unmapped.ai_comment && (
                              <p className="text-xs text-[#6B7280] mt-1.5">
                                💡 {unmapped.ai_comment}
                              </p>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT COLUMN: ANSWER SHEET VIEWER (Figma 7/9 & 9/9) ── */}
            <div
              className={`w-full lg:w-[52%] xl:w-[55%] flex flex-col bg-[#1A1A1A] ${mobileTab === "answersheet" ? "flex" : "hidden lg:flex"
                }`}
            >
              {/* Toolbar */}
              <div className="px-5 py-3.5 bg-[#1A1A1A] border-b border-zinc-800 flex items-center justify-between text-white shrink-0">
                <span className="text-sm font-bold text-zinc-100">Answer Sheet</span>

                <div className="flex items-center gap-4">
                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1 bg-zinc-800 rounded-full px-2 py-1 text-xs text-zinc-300">
                    <button
                      onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
                      className="p-1 hover:text-white transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-1.5 font-mono text-[11px]">{zoomLevel}%</span>
                    <button
                      onClick={() => setZoomLevel((z) => Math.min(200, z + 10))}
                      className="p-1 hover:text-white transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Page Navigation */}
                  <div className="flex items-center gap-1 bg-zinc-800 rounded-full px-2 py-1 text-xs text-zinc-300">
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="p-1 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-1.5 font-medium text-[11px]">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="p-1 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Document Canvas Container */}
              <div
                ref={viewerContainerRef}
                className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center bg-[#111111]"
              >
                {currentPageData ? (
                  <div
                    className="relative bg-white shadow-2xl rounded-lg transition-transform duration-150 origin-top"
                    style={{
                      transform: `scale(${zoomLevel / 100})`,
                      maxWidth: "100%",
                    }}
                  >
                    {/* Rendered handwritten page image */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentPageData.image_base64}
                      alt={`Answer Sheet Page ${currentPage}`}
                      className="block max-w-full h-auto rounded-lg select-none pointer-events-none"
                    />

                    {/* All Bounding Boxes for all questions on this page */}
                    {result.questions.map((q, qIdx) => {
                      const boxes = q.boxes?.filter((b) => b.page === currentPage) || [];
                      const isSelected = selectedQuestionIndex === qIdx;

                      return boxes.map((box, bIdx) => {
                        const top = `${box.ymin / 10}%`;
                        const left = `${box.xmin / 10}%`;
                        const height = `${(box.ymax - box.ymin) / 10}%`;
                        const width = `${(box.xmax - box.xmin) / 10}%`;

                        return (
                          <div
                            key={`${qIdx}-${bIdx}`}
                            onClick={() => handleSelectQuestion(qIdx)}
                            style={{ top, left, width, height }}
                            className={`absolute rounded-xl transition-all duration-200 cursor-pointer ${isSelected
                                ? "border-[3px] border-[#22C55E] bg-[#22C55E]/10 ring-4 ring-[#22C55E]/20 shadow-lg z-20"
                                : "border-2 border-dashed border-[#22C55E]/60 bg-[#22C55E]/5 hover:border-[#22C55E] z-10"
                              }`}
                          >
                            {/* Question Tag Badge */}
                            <span
                              className={`absolute -top-3.5 left-2 px-2.5 py-0.5 rounded-md text-[11px] font-black shadow-md ${isSelected
                                  ? "bg-[#22C55E] text-white"
                                  : "bg-[#15803D] text-white opacity-90"
                                }`}
                            >
                              Q{q.question_number}
                            </span>
                          </div>
                        );
                      });
                    })}

                    {/* Render Unmapped Answer Bounding Boxes on current page */}
                    {result.unmapped_answers?.map((uItem, uIdx) => {
                      const uBoxes = uItem.boxes?.filter((b) => b.page === currentPage) || [];
                      const isUnmappedSelected = selectedUnmappedIndex === uIdx;

                      return uBoxes.map((box, bIdx) => {
                        const top = `${box.ymin / 10}%`;
                        const left = `${box.xmin / 10}%`;
                        const height = `${(box.ymax - box.ymin) / 10}%`;
                        const width = `${(box.xmax - box.xmin) / 10}%`;

                        return (
                          <div
                            key={`u-${uIdx}-${bIdx}`}
                            onClick={() => handleSelectUnmapped(uIdx)}
                            style={{ top, left, width, height }}
                            className={`absolute rounded-xl transition-all duration-200 cursor-pointer ${isUnmappedSelected
                                ? "border-[3px] border-[#F59E0B] bg-[#F59E0B]/20 ring-4 ring-[#F59E0B]/30 shadow-lg z-20"
                                : "border-2 border-dashed border-[#F59E0B]/70 bg-[#F59E0B]/10 hover:border-[#F59E0B] z-10"
                              }`}
                          >
                            <span
                              className={`absolute -top-3.5 left-2 px-2.5 py-0.5 rounded-md text-[11px] font-black shadow-md ${isUnmappedSelected
                                  ? "bg-[#F59E0B] text-white"
                                  : "bg-[#D97706] text-white opacity-90"
                                }`}
                            >
                              {uItem.raw_label || "Extra Answer"}
                            </span>
                          </div>
                        );
                      });
                    })}
                  </div>
                ) : (
                  <div className="text-zinc-500 text-sm">No page data available</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
