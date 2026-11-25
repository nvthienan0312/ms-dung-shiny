"use client";

import { useState } from "react";
import { UserRole, UserAccount } from "@/types/auth";
import { useCenter } from "@/context/CenterContext";
import { 
  ShieldCheck, 
  GraduationCap, 
  UserCheck, 
  Users, 
  Lock, 
  Phone, 
  Eye, 
  EyeOff, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight
} from "lucide-react";

interface LoginViewProps {
  onLoginSuccess?: (user: UserAccount) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const { login } = useCenter();
  const [selectedRole, setSelectedRole] = useState<UserRole>("ADMIN");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
    setSuccessMessage(null);
    // Xóa mật khẩu khi chuyển sang Phụ Huynh hoặc vai trò khác để đảm bảo bảo mật
    if (role === "PARENT") {
      setPassword("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = login(phone, password, selectedRole);
      setIsLoading(false);

      if (!res.success) {
        setErrorMessage(res.message);
      } else {
        setSuccessMessage(res.message);
        if (res.user && onLoginSuccess) {
          onLoginSuccess(res.user);
        }
      }
    }, 250);
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex flex-col justify-center items-center p-3 sm:p-5">
      {/* Branding Header */}
      <div className="text-center mb-4 max-w-md">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[11px] font-semibold mb-2">
          <Sparkles className="w-3 h-3" />
          Hệ Thống Đăng Nhập & Phân Quyền Bảo Mật
        </div>
        <div className="flex items-center justify-center gap-2.5 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-amber-500/20">
            ✨
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Ms. Dung Shiny
          </h1>
        </div>
        <p className="text-slate-300 text-xs">
          Hệ thống Quản lý Trung tâm Tiếng Anh & Cổng Học Tập Điện Tử
        </p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100/30 overflow-hidden">
        
        {/* Role Selector Bar */}
        <div className="p-3.5 sm:p-4 bg-slate-50/80 border-b border-slate-200/80">
          <div className="text-[11px] font-bold text-slate-600 mb-2 text-center uppercase tracking-wider">
            Chọn vai trò đăng nhập
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handleRoleChange("ADMIN")}
              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                selectedRole === "ADMIN"
                  ? "bg-amber-500 text-slate-950 border-amber-600 shadow-sm ring-2 ring-amber-400/50"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Quản Trị Viên</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleChange("TEACHER")}
              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                selectedRole === "TEACHER"
                  ? "bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-400/50"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Giáo Viên</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleChange("ASSISTANT")}
              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                selectedRole === "ASSISTANT"
                  ? "bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-400/50"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Trợ Giảng (TA)</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleChange("PARENT")}
              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                selectedRole === "PARENT"
                  ? "bg-purple-600 text-white border-purple-700 shadow-sm ring-2 ring-purple-400/50"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Phụ Huynh</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-3.5">
          
          {/* Notification Messages */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div className="font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <div className="font-semibold">{successMessage}</div>
            </div>
          )}

          {/* Phone Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {selectedRole === "PARENT" ? "Số Điện Thoại Phụ Huynh" : "Số Điện Thoại Tài Khoản"} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={selectedRole === "PARENT" ? "Nhập số điện thoại đã đăng ký..." : "Nhập số điện thoại đăng nhập..."}
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                required
              />
            </div>
          </div>

          {/* Password Field (Hidden for PARENT) */}
          {selectedRole === "PARENT" ? (
            <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
              <span>Phụ huynh đăng nhập nhanh bằng số điện thoại (không cần mật khẩu)</span>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Mật Khẩu <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="w-full pl-10 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 sm:py-3.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
              selectedRole === "ADMIN"
                ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25"
                : selectedRole === "TEACHER"
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25"
                : selectedRole === "ASSISTANT"
                ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25"
                : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/25"
            }`}
          >
            {isLoading ? (
              <span>Đang kiểm tra xác thực...</span>
            ) : (
              <>
                <span>Đăng Nhập Với Vai Trò {selectedRole === "ADMIN" ? "Quản Trị Viên" : (selectedRole === "TEACHER" ? "Giáo Viên" : (selectedRole === "ASSISTANT" ? "Trợ Giảng" : "Phụ Huynh"))}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer Info */}
      <div className="mt-6 text-center text-xs text-slate-400">
        Trung Tâm Tiếng Anh Ms. Dung Shiny • Bảo Mật & Xác Thực Đăng Nhập
      </div>
    </div>
  );
}
