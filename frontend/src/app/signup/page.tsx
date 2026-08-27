"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, UserPlus, Mail, Lock, User } from "lucide-react";
import { motion } from "framer-motion";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { signup, clearAuthError } from "@/store/slices/authSlice";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { loading, error, user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await dispatch(signup({ name, email, password }));
    if (signup.fulfilled.match(result)) {
      router.push("/dashboard");
    }
  };

  const inputCls =
    "w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-[#E5E4DF] text-[#1A1A1A] text-sm placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#E8611A] focus:ring-2 focus:ring-[#E8611A]/10 transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F4F0] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/veda-ai-logo.png"
              alt="VedaAI Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A]">
            Create Account
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Register as a teacher to get started with VedaAI
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[#E5E4DF] bg-white shadow-sm p-6 sm:p-8 space-y-5"
        >
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-semibold text-[#6B7280]">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                placeholder="Your full name"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-semibold text-[#6B7280]">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-semibold text-[#6B7280]">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                placeholder="Min 6 characters"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#E8611A] hover:bg-[#D4530F] disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF] disabled:cursor-not-allowed text-white text-sm font-semibold py-3.5 transition-all hover:shadow-md hover:shadow-[#E8611A]/25 active:scale-[0.98]"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            {loading ? "Creating account…" : "Create Account"}
          </button>

          <p className="text-center text-sm text-[#9CA3AF]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[#E8611A] hover:text-[#D4530F] font-semibold transition-colors"
            >
              Sign in
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
