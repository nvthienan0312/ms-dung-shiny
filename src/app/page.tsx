"use client";

import { useState, useEffect, useMemo } from "react";
import { UserRole, MOCK_USERS } from "@/types/auth";
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
    currentUserAccount,
    logout,
    isZaloSessionValid,
    cloudSyncStatus,
    lastCloudSyncAt,
    triggerCloudSync
  } = useCenter();
  const [activeRole, setActiveRole] = useState<UserRole>("ADMIN");
  const [adminTab, setAdminTab] = useState<"TIMETABLE" | "CLASSES" | "STUDENTS" | "STAFF" | "ROOMS" | "COURSES" | "ATTENDANCE" | "LOGS" | "PAYROLL" | "TUITION" | "MAKEUP_CLASSES">("TIMETABLE");
  const [teacherTab, setTeacherTab] = useState<"TIMETABLE" | "ATTENDANCE" | "CLASS_LOGS" | "HOMEWORK_TRACKING" | "MONTHLY_EXAM" | "INCIDENT_NOTES" | "PAYROLL">("ATTENDANCE");
  const [assistantTab, setAssistantTab] = useState<"TIMETABLE" | "ATTENDANCE" | "WORKBOOK" | "HOMEWORK_GRADING" | "INCIDENT_NOTES" | "PAYROLL">("ATTENDANCE");
  const [isAdminChangePasswordOpen, setIsAdminChangePasswordOpen] = useState<boolean>(false);
  const [isZaloTemplatesOpen, setIsZaloTemplatesOpen] = useState<boolean>(false);
  const [isZaloSessionOpen, setIsZaloSessionOpen] = useState<boolean>(false);

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

  // Xác định thông tin SĐT và Tên phù hợp với vai trò Zalo (Đặt trước early return)
  const activeZaloStaffInfo = useMemo(() => {
    if (activeRole === "ADMIN") {
      return {
        name: "Ms. Dung Shiny (Hotline)",
        phone: "0964645174",
      };
    }
    if (activeRole === "TEACHER") {
      return {
        name: currentTeacherStaff?.fullName || currentUserAccount?.name || "Giáo Viên",
        phone: currentTeacherStaff?.phone || currentUserAccount?.phone || "",
      };
    }
    if (activeRole === "ASSISTANT") {
      return {
        name: currentAssistantStaff?.fullName || currentUserAccount?.name || "Trợ Giảng",
        phone: currentAssistantStaff?.phone || currentUserAccount?.phone || "",
      };
    }
    return {
      name: currentUserAccount?.name || "Phụ huynh",
      phone: currentUserAccount?.phone || "",
    };
  }, [activeRole, currentTeacherStaff, currentAssistantStaff, currentUserAccount]);

  // If not logged in, render the secure Login View
  if (!currentUserAccount) {
    return <LoginView onLoginSuccess={(user) => setActiveRole(user.role)} />;
  }

  // Check if current logged-in user is Admin
  const isAdminUser = 
    currentUserAccount.role === "ADMIN" || 
    currentUserAccount.phone === "0964645174" || 
    currentUserAccount.id === "user-admin-1" ||
    Boolean(currentUserAccount.name?.includes("Dung"));

  const currentUser = {
    id: currentUserAccount.id,
    name: isAdminUser ? "Ms. Dung (Chủ trung tâm)" : currentUserAccount.name,
    email: isAdminUser 
      ? "dung.shiny@center.edu.vn" 
      : (currentUserAccount.staffId 
        ? staff.find((s) => s.id === currentUserAccount.staffId)?.email || "staff@center.edu.vn" 
        : "phuhuynh@gmail.com"),
    role: activeRole,
    avatarUrl: currentUserAccount.avatarUrl || MOCK_USERS[activeRole]?.avatarUrl || "",
    title: activeRole === "ADMIN"
      ? "Giám đốc Trung tâm / Quản trị viên"
      : (activeRole === "TEACHER"
        ? (currentTeacherStaff?.fullName || "Giáo viên Trung tâm Ms. Dung Shiny")
        : (activeRole === "ASSISTANT"
          ? (currentAssistantStaff?.fullName || "Trợ giảng (TA) Trung tâm")
          : "Phụ huynh học sinh")),
    phone: currentUserAccount.phone,
  };

  const totalStudents = students.length;
  const activeClassesCount = classes.length;
  const teachersCount = staff.filter((s) => s.role === "TEACHER").length;
  const assistantsCount = staff.filter((s) => s.role === "ASSISTANT").length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 px-3 sm:px-4 lg:px-6 py-2.5 flex items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-md shadow-amber-200 shrink-0">
            ✨
          </div>
          <div className="shrink-0">
            <h1 className="font-bold text-base sm:text-lg text-slate-900 leading-tight">Ms. Dung Shiny</h1>
            <p className="text-[11px] sm:text-xs text-amber-600 font-medium hidden sm:block">English Center Management System</p>
          </div>
        </div>

        {/* Header Right: Zalo Handshake, Admin Actions & Current User */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Cloud Database (Supabase PostgreSQL) Status */}
          <button
            onClick={() => triggerCloudSync()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-xs cursor-pointer ${
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
            <span>
              {cloudSyncStatus === "SYNCED"
                ? "Đã Kết Nối"
                : cloudSyncStatus === "SYNCING"
                ? "Đang Lưu..."
                : cloudSyncStatus === "ERROR"
                ? "Thử Lại"
                : "Đang Chờ"}
            </span>
          </button>

          {/* Zalo Status & Account Modal */}
          {activeRole !== "PARENT" && (
            <button
              onClick={() => setIsZaloSessionOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-xs cursor-pointer ${
                isZaloSessionValid(activeRole as any)
                  ? "border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900"
                  : "border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900"
              }`}
              title="Đăng nhập Zalo, quét mã QR và đổi tài khoản"
            >
              <span className={`w-2 h-2 rounded-full ${
                isZaloSessionValid(activeRole as any) ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`} />
              <span className="hidden sm:inline">Zalo Bot:</span>
              <span>{isZaloSessionValid(activeRole as any) ? "Đã Kết Nối" : "Chưa Kết Nối (Quét QR)"}</span>
            </button>
          )}

          {/* Admin Message Templates Config (Task 3 - Admin độc quyền) */}
          {currentUserAccount.role === "ADMIN" && (
            <button
              onClick={() => setIsZaloTemplatesOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 transition shadow-xs text-xs font-bold cursor-pointer"
              title="Quản trị viên cấu hình mẫu tin nhắn tự động toàn hệ thống"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">Mẫu Tin Nhắn</span>
            </button>
          )}

          {/* Admin Change Password Button (Only Admin has permission to change password) */}
          {currentUserAccount.role === "ADMIN" && (
            <button
              onClick={() => setIsAdminChangePasswordOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 transition shadow-xs text-xs font-bold"
              title="Đổi mật khẩu tài khoản Quản trị viên"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden md:inline">Đổi MK Admin</span>
            </button>
          )}

          {/* Current Active User Indicator */}
          <div className="flex items-center gap-2 sm:gap-3 pl-2 border-l border-slate-200">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-900">{currentUser.name}</span>
              <span className="text-[10px] text-slate-500 font-mono">{currentUser.phone || currentUser.title}</span>
            </div>
            <img 
              src={currentUser.avatarUrl} 
              alt={currentUser.name} 
              className="w-9 h-9 rounded-full bg-slate-100 border border-amber-200 ring-2 ring-amber-100" 
            />

            {/* Logout Button */}
            <button
              onClick={logout}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition shadow-xs text-xs font-bold"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Đăng Xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* THANH TOP BAR ZALO RIÊNG BIỆT - HIỂN THỊ ĐẦY ĐỦ 100% THÔNG TIN & THAO TÁC */}
      <ZaloTopBarBanner
        activeRole={activeRole as any}
        staffName={activeZaloStaffInfo.name}
        staffPhone={activeZaloStaffInfo.phone}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl 2xl:max-w-[1500px] mx-auto px-3 sm:px-4 lg:px-6 py-5 space-y-5">
        
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
                Điểm danh 1-chạm, kiểm tra sách Workbook, chấm BTVN online trực tiếp và điểm danh ca học bù
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

              {/* Admin Subtabs */}
              <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl overflow-x-auto max-w-full scrollbar-thin">
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

              {/* Subtabs for Teacher */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
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
                  Trợ giảng: <span className="font-semibold text-slate-800">{currentAssistantStaff?.fullName || currentUser.name}</span> • Điểm danh, kiểm tra sách bài tập, chấm BTVN online &amp; xác nhận lương
                </p>
              </div>

              {/* Step tabs for TA */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
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
                  <BookCheck className="w-3.5 h-3.5 text-indigo-700" /> Kiểm Tra Sách Workbook
                </button>
                <button
                  onClick={() => setAssistantTab("HOMEWORK_GRADING")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    assistantTab === "HOMEWORK_GRADING"
                      ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileCheck className="w-3.5 h-3.5 text-amber-700" /> Chấm BTVN Online
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

            {assistantTab === "TIMETABLE" && <TimetableManager userRole="ASSISTANT" />}
            {assistantTab === "ATTENDANCE" && <AttendanceManager userRole="ASSISTANT" currentStaffId={currentStaffId} />}
            {assistantTab === "WORKBOOK" && <WorkbookCheckManager currentStaffId={currentStaffId} />}
            {assistantTab === "HOMEWORK_GRADING" && <HomeworkGradingManager userRole="ASSISTANT" currentStaffId={currentStaffId} />}
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
          staffName={activeZaloStaffInfo.name}
          staffPhone={activeZaloStaffInfo.phone}
        />

      </main>
    </div>
  );
}
