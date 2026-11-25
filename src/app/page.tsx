"use client";

import { useState, useEffect, useMemo } from "react";
import { UserRole } from "@/types/auth";
import { useCenter } from "@/context/CenterContext";
import LoginView from "@/components/auth/LoginView";
import AdminChangePasswordModal from "@/components/auth/AdminChangePasswordModal";
import TimetableManager from "@/components/admin/TimetableManager";
import ClassesManager from "@/components/admin/ClassesManager";
import StudentsManager from "@/components/admin/StudentsManager";
import StaffManager from "@/components/admin/StaffManager";
import CoursesManager from "@/components/admin/CoursesManager";
import ClassroomsManager from "@/components/admin/ClassroomsManager";
import AttendanceManager from "@/components/operations/AttendanceManager";
import ClassLogManager from "@/components/operations/ClassLogManager";
import WorkbookCheckManager from "@/components/operations/WorkbookCheckManager";
import StudentIncidentNotesManager from "@/components/operations/StudentIncidentNotesManager";
import MonthlyExamReportManager from "@/components/operations/MonthlyExamReportManager";
import HomeworkGradingManager from "@/components/operations/HomeworkGradingManager";
import StaffTimesheetViewer from "@/components/operations/StaffTimesheetViewer";
import PayrollManager from "@/components/admin/PayrollManager";
import TuitionManager from "@/components/admin/TuitionManager";
import MakeupClassesManager from "@/components/admin/MakeupClassesManager";
import ParentPortal from "@/components/operations/ParentPortal";
import ZaloTemplatesManagerModal from "@/components/admin/ZaloTemplatesManagerModal";
import ZaloAccountModal from "@/components/common/ZaloAccountModal";
import ZaloTopBarBanner from "@/components/common/ZaloTopBarBanner";
import { 
  ShieldCheck, 
  GraduationCap, 
  UserCheck, 
  Users, 
  BookOpen, 
  Clock, 
  Calendar, 
  CalendarCheck,
  QrCode, 
  CheckCircle2, 
  XCircle,
  Eye,
  FileText, 
  Sparkles, 
  PhoneCall, 
  UserPlus,
  Coins,
  DoorOpen,
  Video,
  Mic,
  Tag,
  Send,
  Award,
  BookCheck,
  FileCheck2,
  FileCheck,
  AlertTriangle,
  Download,
  AlertCircle,
  Receipt,
  MessageSquare,
  KeyRound,
  LogOut
} from "lucide-react";

export default function HomePage() {
  const { 
    classes, 
    students, 
    staff, 
    classrooms, 
    substitutions, 
    attendance, 
    classLogs,
    workbookChecks,
    incidentNotes,
    monthlyExamReports,
    staffTimesheets,
    makeupClasses,
    userAccounts,
    currentUserAccount,
    logout,
    cloudSyncStatus,
    lastCloudSyncAt,
    triggerCloudSync
  } = useCenter();
  const [activeRole, setActiveRole] = useState<UserRole>("ADMIN");
  const [adminTab, setAdminTab] = useState<"TIMETABLE" | "CLASSES" | "STUDENTS" | "STAFF" | "ROOMS" | "COURSES" | "ATTENDANCE" | "LOGS" | "PAYROLL" | "TUITION" | "MAKEUP_CLASSES">("TIMETABLE");
  const [teacherTab, setTeacherTab] = useState<"TIMETABLE" | "ATTENDANCE" | "CLASS_LOGS" | "HOMEWORK_TRACKING" | "MONTHLY_EXAM" | "INCIDENT_NOTES" | "PAYROLL">("ATTENDANCE");
  const [assistantTab, setAssistantTab] = useState<"TIMETABLE" | "ATTENDANCE" | "WORKBOOK" | "HOMEWORK_GRADING" | "MAKEUP_CLASSES" | "INCIDENT_NOTES" | "PAYROLL">("ATTENDANCE");
  const [isAdminChangePasswordOpen, setIsAdminChangePasswordOpen] = useState<boolean>(false);
  const [isZaloTemplatesOpen, setIsZaloTemplatesOpen] = useState<boolean>(false);
  const [isZaloSessionOpen, setIsZaloSessionOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Synchronize activeRole when user logs in or switches account
  useEffect(() => {
    if (currentUserAccount) {
      setActiveRole(currentUserAccount.role);
    }
  }, [currentUserAccount]);

  // Dynamic staff identification based on logged-in user (Task 1)
  const currentStaffId = useMemo(() => {
    if (!currentUserAccount) return "";
    if (currentUserAccount.staffId) return currentUserAccount.staffId;
    const matchByPhone = staff.find((s) => s.phone === currentUserAccount.phone);
    if (matchByPhone) return matchByPhone.id;
    if (currentUserAccount.role === "TEACHER") {
      const firstTeacher = staff.find((s) => s.role === "TEACHER");
      return firstTeacher?.id || "";
    }
    if (currentUserAccount.role === "ASSISTANT") {
      const firstAssistant = staff.find((s) => s.role === "ASSISTANT");
      return firstAssistant?.id || "";
    }
    return "";
  }, [currentUserAccount, staff]);

  const currentTeacherStaff = useMemo(() => {
    return staff.find((s) => s.id === currentStaffId) || staff.find((s) => s.role === "TEACHER");
  }, [staff, currentStaffId]);

  const currentAssistantStaff = useMemo(() => {
    return staff.find((s) => s.id === currentStaffId) || staff.find((s) => s.role === "ASSISTANT");
  }, [staff, currentStaffId]);

  const adminAccount = useMemo(() => {
    return userAccounts.find((a) => a.role === "ADMIN");
  }, [userAccounts]);

  // Xác định thông tin SĐT và Tên phù hợp với vai trò Zalo (Đặt trước early return)
  const activeZaloStaffInfo = useMemo(() => {
    if (activeRole === "ADMIN") {
      return {
        staffId: undefined,
        name: currentUserAccount?.name || adminAccount?.name || "Chủ Trung Tâm",
        phone: currentUserAccount?.phone || adminAccount?.phone || "",
      };
    }
    if (activeRole === "TEACHER") {
      return {
        staffId: currentTeacherStaff?.id || currentStaffId,
        name: currentTeacherStaff?.fullName || currentUserAccount?.name || "Giáo Viên",
        phone: currentTeacherStaff?.phone || currentUserAccount?.phone || "",
      };
    }
    if (activeRole === "ASSISTANT") {
      return {
        staffId: currentAssistantStaff?.id || currentStaffId,
        name: currentAssistantStaff?.fullName || currentUserAccount?.name || "Trợ Giảng",
        phone: currentAssistantStaff?.phone || currentUserAccount?.phone || "",
      };
    }
    return {
      staffId: undefined,
      name: currentUserAccount?.name || "Phụ huynh",
      phone: currentUserAccount?.phone || "",
    };
  }, [activeRole, currentTeacherStaff, currentAssistantStaff, currentUserAccount, adminAccount, currentStaffId]);

  // If not logged in, render the secure Login View
  if (!currentUserAccount) {
    return <LoginView onLoginSuccess={(user) => setActiveRole(user.role)} />;
  }

  // Check if current logged-in user is Admin
  const isAdminUser = currentUserAccount.role === "ADMIN";

  const currentUser = {
    id: currentUserAccount.id,
    name: currentUserAccount.name || (isAdminUser ? adminAccount?.name || "Chủ Trung Tâm" : "Người dùng"),
    email: isAdminUser 
      ? "admin@center.edu.vn" 
      : (currentUserAccount.staffId 
        ? staff.find((s) => s.id === currentUserAccount.staffId)?.email || "staff@center.edu.vn" 
        : "phuhuynh@gmail.com"),
    role: activeRole,
    avatarUrl:
      currentUserAccount.avatarUrl ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUserAccount.name || currentUserAccount.id)}`,
    title: activeRole === "ADMIN"
      ? "Chủ Trung Tâm / Quản trị viên"
      : (activeRole === "TEACHER"
        ? (currentTeacherStaff?.fullName || currentUserAccount.name || "Giáo viên")
        : (activeRole === "ASSISTANT"
          ? (currentAssistantStaff?.fullName || currentUserAccount.name || "Trợ giảng (TA)")
          : "Phụ huynh học sinh")),
    phone: currentUserAccount.phone,
  };

  const totalStudents = students.length;
  const activeClassesCount = classes.length;
  const teachersCount = staff.filter((s) => s.role === "TEACHER").length;
  const assistantsCount = staff.filter((s) => s.role === "ASSISTANT").length;

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-800 flex flex-col">
      {/* Top Navigation Bar with iOS Safe-Area support */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-4 lg:px-6 pt-[max(0.6rem,env(safe-area-inset-top))] pb-2.5 flex items-center justify-between gap-1.5 sm:gap-2 shadow-xs">
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-white font-bold text-base sm:text-xl shadow-md shadow-amber-200 shrink-0">
            ✨
          </div>
          <div className="shrink-0">
            <h1 className="font-bold text-sm sm:text-lg text-slate-900 leading-tight">Ms. Dung Shiny</h1>
            <p className="text-[10px] sm:text-xs text-amber-600 font-medium hidden sm:block">English Center Management System</p>
          </div>
        </div>

        {/* Header Right: Desktop & Mobile Responsive */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Cloud Database (Supabase PostgreSQL) Status */}
          <button
            onClick={() => triggerCloudSync()}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-xs cursor-pointer active-press ${
              cloudSyncStatus === "SYNCED"
                ? "border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900"
                : cloudSyncStatus === "SYNCING"
                ? "border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-900"
                : cloudSyncStatus === "ERROR"
                ? "border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-900"
                : "border-slate-300 bg-slate-50 text-slate-800"
            }`}
            title={
              cloudSyncStatus === "SYNCED"
                ? `Cloud DB: Đã kết nối Supabase PostgreSQL. Cập nhật: ${lastCloudSyncAt ? new Date(lastCloudSyncAt).toLocaleTimeString() : "Vừa xong"}. Bấm để đồng bộ lại.`
                : cloudSyncStatus === "SYNCING"
                ? "Đang đồng bộ dữ liệu với Cloud Database (Supabase)..."
                : "Mất kết nối Cloud DB, dữ liệu lưu an toàn trên LocalStorage. Bấm để thử lại."
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                cloudSyncStatus === "SYNCED"
                  ? "bg-emerald-500"
                  : cloudSyncStatus === "SYNCING"
                  ? "bg-sky-500 animate-ping"
                  : cloudSyncStatus === "ERROR"
                  ? "bg-rose-500"
                  : "bg-slate-400"
              }`}
            />
            <span className="hidden sm:inline">Cloud DB:</span>
            <span className="text-[11px] sm:text-xs">
              {cloudSyncStatus === "SYNCED"
                ? "Cloud DB"
                : cloudSyncStatus === "SYNCING"
                ? "Lưu..."
                : cloudSyncStatus === "ERROR"
                ? "Lỗi"
                : "Chờ"}
            </span>
          </button>

          {/* Zalo Status & Account Modal */}
          {activeRole !== "PARENT" && (
            <button
              onClick={() => setIsZaloSessionOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-bold transition shadow-xs cursor-pointer active-press"
              title="Quét mã QR đăng nhập Bot Zalo riêng của tài khoản này"
            >
              <QrCode className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Zalo Cá Nhân</span>
              <span className="sm:hidden text-[11px]">Zalo</span>
            </button>
          )}

          {/* Desktop-only Admin Quick Buttons */}
          {currentUserAccount.role === "ADMIN" && (
            <>
              <button
                onClick={() => setIsZaloTemplatesOpen(true)}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 transition shadow-xs text-xs font-bold cursor-pointer active-press"
                title="Quản trị viên cấu hình mẫu tin nhắn tự động toàn hệ thống"
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                <span>Mẫu Tin Nhắn</span>
              </button>

              <button
                onClick={() => setIsAdminChangePasswordOpen(true)}
                className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 transition shadow-xs text-xs font-bold active-press cursor-pointer"
                title="Cập nhật tên, SĐT chủ trung tâm & đổi mật khẩu Admin"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                <span>Hồ Sơ &amp; MK Admin</span>
              </button>
            </>
          )}

          {/* Desktop User Info & Logout Button */}
          <div className="hidden sm:flex items-center gap-2 sm:gap-3 pl-2 border-l border-slate-200">
            <div className="flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-900">{currentUser.name}</span>
              <span className="text-[10px] text-slate-500 font-mono">{currentUser.phone || currentUser.title}</span>
            </div>
            <img 
              src={currentUser.avatarUrl} 
              alt={currentUser.name} 
              className="w-9 h-9 rounded-full bg-slate-100 border border-amber-200 ring-2 ring-amber-100 shrink-0" 
            />

            <button
              onClick={logout}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition shadow-xs text-xs font-bold active-press cursor-pointer"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span>Đăng Xuất</span>
            </button>
          </div>

          {/* Mobile User Avatar Trigger (Opens mobile user menu) */}
          <div className="relative sm:hidden">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-8 h-8 rounded-full bg-slate-100 border border-amber-400 ring-2 ring-amber-200 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer active-press shadow-xs"
              aria-label="Tài khoản cá nhân"
            >
              <img 
                src={currentUser.avatarUrl} 
                alt={currentUser.name} 
                className="w-full h-full object-cover" 
              />
            </button>

            {/* Mobile Popover Menu */}
            {isMobileMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40 bg-black/25 backdrop-blur-2xs" 
                  onClick={() => setIsMobileMenuOpen(false)} 
                />
                <div className="absolute right-0 top-10 z-50 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="pb-2 border-b border-slate-100">
                    <div className="font-bold text-xs text-slate-900 truncate">{currentUser.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">{currentUser.phone || currentUser.title}</div>
                    <div className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      {activeRole === "ADMIN" ? "Quản trị viên" : activeRole === "TEACHER" ? "Giáo viên" : activeRole === "ASSISTANT" ? "Trợ giảng" : "Phụ huynh"}
                    </div>
                  </div>

                  {currentUserAccount.role === "ADMIN" && (
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          setIsAdminChangePasswordOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer text-left"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                        <span>Hồ Sơ &amp; MK Admin</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          setIsZaloTemplatesOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer text-left"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                        <span>Cấu Hình Mẫu Tin Nhắn</span>
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition cursor-pointer active-press"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
                    <span>Đăng Xuất</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* THANH TOP BAR ZALO RIÊNG BIỆT - HIỂN THỊ ĐẦY ĐỦ 100% THÔNG TIN & THAO TÁC */}
      <ZaloTopBarBanner
        activeRole={activeRole as any}
        staffId={activeZaloStaffInfo.staffId}
        staffName={activeZaloStaffInfo.name}
        staffPhone={activeZaloStaffInfo.phone}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl 2xl:max-w-[1500px] mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5 flex-1 pb-[max(2rem,env(safe-area-inset-bottom))]">
        
        {/* Admin Dashboard Banner */}
        {currentUserAccount.role === "ADMIN" ? (
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-400 text-slate-950 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Quản Trị Viên Toàn Quyền
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    Chủ Trung Tâm
                  </span>
                </div>
                <h2 className="text-xl font-bold tracking-tight">Trung Tâm Tiếng Anh Ms. Dung Shiny</h2>
                <p className="text-slate-300 text-xs mt-1">
                  Quản lý đào tạo, thời khóa biểu, tài chính, học phí, nhân sự và phân quyền đăng nhập
                </p>
              </div>

              {/* Quick Admin Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsZaloTemplatesOpen(true)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm cursor-pointer active:scale-95"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Cấu Hình Mẫu Tin Nhắn</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsZaloSessionOpen(true)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-400/30 text-xs font-bold transition shadow-sm cursor-pointer active:scale-95"
                >
                  <span>💬</span>
                  <span>Quản Lý Zalo Bot</span>
                </button>
              </div>
            </div>
          </div>
        ) : currentUserAccount.role === "TEACHER" ? (
          <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 rounded-2xl p-5 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-400 text-slate-950 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5" /> Không Gian Làm Việc Giáo Viên
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-800 text-emerald-200 border border-emerald-700">
                  Tài khoản: {currentUserAccount.phone}
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight">Xin chào, {currentUserAccount.name}</h2>
              <p className="text-emerald-100 text-xs mt-1">
                Xem lịch dạy, viết nhật ký buổi học, giao BTVN MS Teams, theo dõi nộp bài & báo cáo bài thi tháng
              </p>
            </div>
          </div>
        ) : currentUserAccount.role === "ASSISTANT" ? (
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 rounded-2xl p-5 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-300 text-slate-950 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" /> Bàn Làm Việc Trợ Giảng (TA)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-blue-800 text-blue-200 border border-blue-700">
                  Tài khoản: {currentUserAccount.phone}
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight">Xin chào, {currentUserAccount.name}</h2>
              <p className="text-blue-100 text-xs mt-1">
                Điểm danh 1-chạm, kiểm tra BTVN tại lớp, kiểm tra &amp; nhận xét BTVN online và phụ trách lớp học bù
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-purple-900 rounded-2xl p-5 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-300 text-slate-950 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> Sổ Liên Lạc Điện Tử & Cổng Học Tập Phụ Huynh
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-purple-800 text-purple-200 border border-purple-700">
                  SĐT: {currentUserAccount.phone}
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight">Kính chào {currentUserAccount.name}</h2>
              <p className="text-purple-200 text-xs mt-1">
                Theo dõi kết quả học tập, thời khóa biểu, nộp BTVN đính kèm tệp và đóng học phí VietQR minh bạch
              </p>
            </div>
          </div>
        )}

        {/* Dynamic Role Dashboard View */}
        {activeRole === "ADMIN" && (
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Bảng Quản Trị Trung Tâm (Admin Console)</h3>
                <p className="text-xs text-slate-500">
                  Quản lý đào tạo, thời khóa biểu Tuần & Tháng, phòng học và nhân sự
                </p>
              </div>

              {/* Admin Subtabs (Optimized for Desktop & Mobile) */}
              <div className="w-full lg:w-auto space-y-2">
                {/* Mobile Dropdown Quick Switcher (Android + iOS 1-Tap) */}
                <div className="sm:hidden w-full">
                  <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-600 pl-1 shrink-0">Chuyên mục:</span>
                    <select
                      value={adminTab}
                      onChange={(e) => setAdminTab(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      <option value="TIMETABLE">📅 Thời khóa biểu</option>
                      <option value="ATTENDANCE">👁️ Giám sát điểm danh</option>
                      <option value="LOGS">📖 Nhật ký giảng dạy ({classLogs.length})</option>
                      <option value="CLASSES">📚 Lớp học ({classes.length})</option>
                      <option value="STUDENTS">👥 Học viên ({students.length})</option>
                      <option value="STAFF">🎓 Nhân sự ({staff.length})</option>
                      <option value="ROOMS">🚪 Phòng học ({classrooms.length})</option>
                      <option value="PAYROLL">💰 Bảng công & Lương</option>
                      <option value="TUITION">🧾 Quản lý học phí</option>
                      <option value="MAKEUP_CLASSES">⚡ Lớp học bù ({makeupClasses.length})</option>
                      <option value="COURSES">✨ Khóa học</option>
                    </select>
                  </div>
                </div>

                {/* Horizontal Swipeable Tabs with touch momentum */}
                <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl overflow-x-auto max-w-full no-scrollbar mobile-tabs">
                  <button
                    onClick={() => setAdminTab("TIMETABLE")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                      adminTab === "TIMETABLE" ? "bg-amber-500 text-slate-950 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" /> Thời khóa biểu
                  </button>
                  <button
                    onClick={() => setAdminTab("ATTENDANCE")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                      adminTab === "ATTENDANCE" ? "bg-amber-500 text-slate-950 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" /> Giám sát điểm danh
                  </button>
                  <button
                    onClick={() => setAdminTab("LOGS")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                      adminTab === "LOGS" ? "bg-amber-500 text-slate-950 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Nhật ký giảng dạy ({classLogs.length})
                  </button>
                  <button
                    onClick={() => setAdminTab("CLASSES")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                      adminTab === "CLASSES" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Lớp học ({classes.length})
                  </button>
                  <button
                    onClick={() => setAdminTab("STUDENTS")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                      adminTab === "STUDENTS" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" /> Học viên ({students.length})
                  </button>
                  <button
                    onClick={() => setAdminTab("STAFF")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                      adminTab === "STAFF" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5" /> Nhân sự ({staff.length})
                  </button>
                  <button
                    onClick={() => setAdminTab("ROOMS")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                      adminTab === "ROOMS" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <DoorOpen className="w-3.5 h-3.5" /> Phòng học ({classrooms.length})
                  </button>
                  <button
                    onClick={() => setAdminTab("PAYROLL")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                      adminTab === "PAYROLL" ? "bg-amber-500 text-slate-950 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5" /> Bảng công & Lương
                  </button>
                  <button
                    onClick={() => setAdminTab("TUITION")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                      adminTab === "TUITION" ? "bg-amber-500 text-slate-950 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" /> Quản lý học phí
                  </button>
                  <button
                    onClick={() => setAdminTab("MAKEUP_CLASSES")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                      adminTab === "MAKEUP_CLASSES" ? "bg-amber-500 text-slate-950 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <CalendarCheck className="w-3.5 h-3.5" /> Lớp học bù ({makeupClasses.length})
                  </button>
                  <button
                    onClick={() => setAdminTab("COURSES")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                      adminTab === "COURSES" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Khóa học
                  </button>
                </div>
              </div>
            </div>

            {/* Admin Tab Contents */}
            {adminTab === "TIMETABLE" && <TimetableManager userRole="ADMIN" />}
            {adminTab === "ATTENDANCE" && <AttendanceManager userRole="ADMIN" />}
            {adminTab === "LOGS" && <ClassLogManager userRole="ADMIN" />}
            {adminTab === "PAYROLL" && <PayrollManager />}
            {adminTab === "TUITION" && <TuitionManager />}
            {adminTab === "MAKEUP_CLASSES" && <MakeupClassesManager />}
            {adminTab === "CLASSES" && <ClassesManager />}
            {adminTab === "STUDENTS" && <StudentsManager />}
            {adminTab === "STAFF" && <StaffManager />}
            {adminTab === "ROOMS" && <ClassroomsManager />}
            {adminTab === "COURSES" && <CoursesManager />}
          </div>
        )}

        {activeRole === "TEACHER" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-amber-600" /> Bàn Làm Việc Học Thuật Giáo Viên (Teacher Hub)
                </h3>
                <p className="text-xs text-slate-500">
                  Giảng viên: <span className="font-semibold text-slate-800">{currentTeacherStaff?.fullName || currentUser.name}</span> • Phụ trách chuyên môn, giáo án, báo cáo bài thi &amp; theo dõi BTVN
                </p>
              </div>

              {/* Subtabs for Teacher (Optimized for Mobile & Desktop) */}
              <div className="w-full sm:w-auto space-y-2">
                <div className="sm:hidden w-full">
                  <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-600 pl-1 shrink-0">Chức năng:</span>
                    <select
                      value={teacherTab}
                      onChange={(e) => setTeacherTab(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      <option value="TIMETABLE">📅 Thời Khóa Biểu</option>
                      <option value="ATTENDANCE">👁️ Giám Sát Điểm Danh</option>
                      <option value="CLASS_LOGS">📖 Nhật Ký & Giao BTVN</option>
                      <option value="HOMEWORK_TRACKING">📝 Theo Dõi Nộp BTVN</option>
                      <option value="MONTHLY_EXAM">📊 Bài Thi Hàng Tháng</option>
                      <option value="INCIDENT_NOTES">⚠️ Lưu Ý Riêng Cho HS</option>
                      <option value="PAYROLL">💰 Bảng Chấm Công & Lương</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto overflow-x-auto max-w-full no-scrollbar mobile-tabs">
                  <button
                    onClick={() => setTeacherTab("TIMETABLE")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      teacherTab === "TIMETABLE"
                        ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" /> Thời Khóa Biểu
                  </button>
                  <button
                    onClick={() => setTeacherTab("ATTENDANCE")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      teacherTab === "ATTENDANCE"
                        ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" /> Giám Sát Điểm Danh
                  </button>
                  <button
                    onClick={() => setTeacherTab("CLASS_LOGS")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      teacherTab === "CLASS_LOGS"
                        ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Nhật Ký & Giao BTVN
                  </button>
                  <button
                    onClick={() => setTeacherTab("HOMEWORK_TRACKING")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      teacherTab === "HOMEWORK_TRACKING"
                        ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <FileCheck className="w-3.5 h-3.5" /> Theo Dõi Nộp BTVN
                  </button>
                  <button
                    onClick={() => setTeacherTab("MONTHLY_EXAM")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      teacherTab === "MONTHLY_EXAM"
                        ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <FileCheck2 className="w-3.5 h-3.5" /> Bài Thi Hàng Tháng
                  </button>
                  <button
                    onClick={() => setTeacherTab("INCIDENT_NOTES")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      teacherTab === "INCIDENT_NOTES"
                        ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5" /> Lưu Ý Riêng Cho HS
                  </button>
                  <button
                    onClick={() => setTeacherTab("PAYROLL")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      teacherTab === "PAYROLL"
                        ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5" /> Bảng Chấm Công & Lương
                  </button>
                </div>
              </div>
            </div>

            {teacherTab === "TIMETABLE" && <TimetableManager userRole="TEACHER" />}
            {teacherTab === "ATTENDANCE" && <AttendanceManager userRole="TEACHER" currentStaffId={currentStaffId} />}
            {teacherTab === "CLASS_LOGS" && <ClassLogManager userRole="TEACHER" currentStaffId={currentStaffId} />}
            {teacherTab === "HOMEWORK_TRACKING" && <HomeworkGradingManager userRole="TEACHER" currentStaffId={currentStaffId} />}
            {teacherTab === "MONTHLY_EXAM" && <MonthlyExamReportManager userRole="TEACHER" currentStaffId={currentStaffId} />}
            {teacherTab === "INCIDENT_NOTES" && <StudentIncidentNotesManager userRole="TEACHER" currentStaffId={currentStaffId} />}
            {teacherTab === "PAYROLL" && <StaffTimesheetViewer userRole="TEACHER" currentStaffId={currentStaffId} />}
          </div>
        )}

        {activeRole === "ASSISTANT" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-600" /> Bàn Làm Việc Vận Hành Trợ Giảng (TA Workspace)
                </h3>
                <p className="text-xs text-slate-500">
                  Trợ giảng: <span className="font-semibold text-slate-800">{currentAssistantStaff?.fullName || currentUser.name}</span> • Điểm danh, kiểm tra BTVN, lớp học bù &amp; xác nhận lương
                </p>
              </div>

              {/* Step tabs for TA (Optimized for Mobile & Desktop) */}
              <div className="w-full sm:w-auto space-y-2">
                <div className="sm:hidden w-full">
                  <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-600 pl-1 shrink-0">Nhiệm vụ:</span>
                    <select
                      value={assistantTab}
                      onChange={(e) => setAssistantTab(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      <option value="TIMETABLE">📅 Thời Khóa Biểu</option>
                      <option value="ATTENDANCE">✅ Điểm Danh Đầu Giờ</option>
                      <option value="WORKBOOK">📖 Kiểm Tra BTVN Tại Lớp</option>
                      <option value="HOMEWORK_GRADING">📝 Kiểm Tra BTVN Online</option>
                      <option value="MAKEUP_CLASSES">🔄 Lớp Học Bù</option>
                      <option value="INCIDENT_NOTES">⚠️ Lưu Ý Riêng Cho HS</option>
                      <option value="PAYROLL">💰 Bảng Chấm Công & Lương</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto overflow-x-auto max-w-full no-scrollbar mobile-tabs">
                  <button
                    onClick={() => setAssistantTab("TIMETABLE")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      assistantTab === "TIMETABLE"
                        ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" /> Thời Khóa Biểu
                  </button>
                  <button
                    onClick={() => setAssistantTab("ATTENDANCE")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      assistantTab === "ATTENDANCE"
                        ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Điểm Danh Đầu Giờ
                  </button>
                  <button
                    onClick={() => setAssistantTab("WORKBOOK")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      assistantTab === "WORKBOOK"
                        ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <BookCheck className="w-3.5 h-3.5 text-indigo-700" /> Kiểm Tra BTVN
                  </button>
                  <button
                    onClick={() => setAssistantTab("HOMEWORK_GRADING")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      assistantTab === "HOMEWORK_GRADING"
                        ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <FileCheck className="w-3.5 h-3.5 text-amber-700" /> Kiểm Tra BTVN Online
                  </button>
                  <button
                    onClick={() => setAssistantTab("MAKEUP_CLASSES")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      assistantTab === "MAKEUP_CLASSES"
                        ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <CalendarCheck className="w-3.5 h-3.5 text-purple-700" /> Lớp Học Bù
                  </button>
                  <button
                    onClick={() => setAssistantTab("INCIDENT_NOTES")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      assistantTab === "INCIDENT_NOTES"
                        ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-rose-700" /> Lưu Ý Riêng Cho HS
                  </button>
                  <button
                    onClick={() => setAssistantTab("PAYROLL")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      assistantTab === "PAYROLL"
                        ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5 text-amber-700" /> Bảng Chấm Công &amp; Lương
                  </button>
                </div>
              </div>
            </div>

            {assistantTab === "TIMETABLE" && <TimetableManager userRole="ASSISTANT" />}
            {assistantTab === "ATTENDANCE" && <AttendanceManager userRole="ASSISTANT" currentStaffId={currentStaffId} />}
            {assistantTab === "WORKBOOK" && <WorkbookCheckManager currentStaffId={currentStaffId} />}
            {assistantTab === "HOMEWORK_GRADING" && <HomeworkGradingManager userRole="ASSISTANT" currentStaffId={currentStaffId} />}
            {assistantTab === "MAKEUP_CLASSES" && <MakeupClassesManager userRole="ASSISTANT" />}
            {assistantTab === "INCIDENT_NOTES" && <StudentIncidentNotesManager userRole="ASSISTANT" currentStaffId={currentStaffId} />}
            {assistantTab === "PAYROLL" && <StaffTimesheetViewer userRole="ASSISTANT" currentStaffId={currentStaffId} />}
          </div>
        )}

        {activeRole === "PARENT" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-500" /> Sổ Liên Lạc Điện Tử (Mobile Parent Portal)
                </h3>
                <p className="text-xs text-slate-500">
                  Cổng kết nối Phụ huynh &amp; Trung tâm Ms. Dung Shiny • Thời gian thực, Minh bạch &amp; Tiện lợi
                </p>
              </div>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
                Cập Nhật Thời Gian Thực
              </span>
            </div>

            <ParentPortal />
          </div>
        )}

        {/* Admin Change Password Modal */}
        <AdminChangePasswordModal
          isOpen={isAdminChangePasswordOpen}
          onClose={() => setIsAdminChangePasswordOpen(false)}
        />

        {/* Admin Master Zalo Message Templates Manager Modal (Task 3) */}
        <ZaloTemplatesManagerModal
          isOpen={isZaloTemplatesOpen}
          onClose={() => setIsZaloTemplatesOpen(false)}
        />

        {/* Zalo Account Management Modal */}
        <ZaloAccountModal
          isOpen={isZaloSessionOpen}
          onClose={() => setIsZaloSessionOpen(false)}
          activeRole={activeRole as any}
          staffId={activeZaloStaffInfo.staffId}
          staffName={activeZaloStaffInfo.name}
          staffPhone={activeZaloStaffInfo.phone}
        />

      </main>
    </div>
  );
}
