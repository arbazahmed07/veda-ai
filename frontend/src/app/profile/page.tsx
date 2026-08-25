"use client";

import { useAppSelector } from "@/store/hooks";
import { Save } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

export default function ProfilePage() {
  const { user } = useAppSelector((state) => state.auth);
  const { showToast } = useToast();
  const [model, setModel] = useState("gemini-2.5-flash");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Settings updated successfully!", "success");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#1A1A1A] tracking-tight">
          Teacher Settings &amp; Profile
        </h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Manage your credentials, school institution details, and AI evaluation preferences.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E4DF] p-6 shadow-sm space-y-6">
        {/* User Card */}
        <div className="flex items-center gap-4 pb-6 border-b border-[#E5E4DF]">
          <div className="w-14 h-14 rounded-2xl bg-[#1A1A1A] text-white flex items-center justify-center text-xl font-black shadow-sm">
            {user?.name ? user.name.charAt(0).toUpperCase() : "T"}
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">{user?.name || "Teacher User"}</h2>
            <p className="text-xs text-[#6B7280] mt-0.5">{user?.email || "teacher@example.com"}</p>
            <span className="inline-block mt-2 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#FEF0E8] text-[#E8611A]">
              {user?.role || "Faculty"}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#1A1A1A] mb-1.5">Full Name</label>
              <input
                type="text"
                defaultValue={user?.name || ""}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E4DF] text-sm text-[#1A1A1A] focus:outline-none focus:border-[#E8611A]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1A1A1A] mb-1.5">Email</label>
              <input
                type="email"
                defaultValue={user?.email || ""}
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E4DF] text-sm text-[#6B7280] bg-[#F5F4F0] cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1A1A1A] mb-1.5">Institution / School</label>
            <input
              type="text"
              defaultValue="Delhi Public School, Bokaro Steel City"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E4DF] text-sm text-[#1A1A1A] focus:outline-none focus:border-[#E8611A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1A1A1A] mb-1.5">
              AI Vision Model (for Assessment Extraction &amp; Mapping)
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E4DF] text-sm text-[#1A1A1A] focus:outline-none focus:border-[#E8611A] bg-white"
            >
              <option value="gemini-2.5-flash">Google Gemini 2.5 Flash (Recommended — High Accuracy &amp; Speed)</option>
              <option value="gemini-flash-latest">Google Gemini Flash Latest</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-full bg-[#1A1A1A] text-white text-xs font-bold hover:bg-[#2D2D2D] transition-colors flex items-center gap-2 shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Changes</span>
          </button>
        </form>
      </div>
    </div>
  );
}
