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
  Calendar,
  CalendarCheck,
  QrCode,
  CheckCircle2,
  Eye,
  Sparkles,
  Coins,
  DoorOpen,
  BookCheck,
  FileCheck2,
  FileCheck,
  AlertCircle,
  Receipt,
  MessageSquare,
  KeyRound,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

type AdminTab =
  | "TIMETABLE"
  | "CLASSES"
  | "STUDENTS"
  | "STAFF"
  | "ROOMS"
  | "COURSES"
  | "ATTENDANCE"
  | "LOGS"
  | "PAYROLL"
  | "TUITION"
  | "MAKEUP_CLASSES";

type TeacherTab =
  | "TIMETABLE"
  | "ATTENDANCE"
  | "CLASS_LOGS"
  | "HOMEWORK_TRACKING"
  | "MONTHLY_EXAM"
  | "INCIDENT_NOTES"
  | "PAYROLL";

type AssistantTab =
  | "TIMETABLE"
  | "ATTENDANCE"
  | "WORKBOOK"
  | "HOMEWORK_GRADING"
  | "MAKEUP_CLASSES"
  | "INCIDENT_NOTES"
  | "PAYROLL";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
  group?: string;
}

export default function HomePage() {
  const {
    classes,
    students,
    staff,
    classrooms,
    classLogs,
    makeupClasses,
    userAccounts,
    currentUserAccount,
    logout,
    cloudSyncStatus,
    lastCloudSyncAt,
    triggerCloudSync,
  } = useCenter();

  const [activeRole, setActiveRole] = useState<UserRole>("ADMIN");
  const [adminTab, setAdminTab] = useState<AdminTab>("TIMETABLE");
  const [teacherTab, setTeacherTab] = useState<TeacherTab>("ATTENDANCE");
  const [assistantTab, setAssistantTab] = useState<AssistantTab>("ATTENDANCE");
  const [isAdminChangePasswordOpen, setIsAdminChangePasswordOpen] = useState<boolean>(false);
  const [isZaloTemplatesOpen, setIsZaloTemplatesOpen] = useState<boolean>(false);
  const [isZaloSessionOpen, setIsZaloSessionOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  useEffect(() => {
    if (currentUserAccount) {
      setActiveRole(currentUserAccount.role);
    }
  }, [currentUserAccount]);

  const currentStaffId = useMemo(() => {
    if (!currentUserAccount) return "";
    if (currentUserAccount.staffId) return currentUserAccount.staffId;
    const matchByPhone = staff.find((s) => s.phone === currentUserAccount.phone);
    if (matchByPhone) return matchByPhone.id;
    if (currentUserAccount.role === "TEACHER") {
      return staff.find((s) => s.role === "TEACHER")?.id || "";
    }
    if (currentUserAccount.role === "ASSISTANT") {
      return staff.find((s) => s.role === "ASSISTANT")?.id || "";
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

  const navItems: NavItem[] = useMemo(() => {
    if (activeRole === "ADMIN") {
      return [
        { id: "TIMETABLE", label: "Thời khóa biểu", icon: <Calendar className="w-4 h-4" />, group: "Vận hành" },
        { id: "ATTENDANCE", label: "Giám sát điểm danh", icon: <Eye className="w-4 h-4" />, group: "Vận hành" },
        { id: "LOGS", label: "Nhật ký giảng dạy", icon: <BookOpen className="w-4 h-4" />, badge: classLogs.length, group: "Vận hành" },
        { id: "TUITION", label: "Quản lý học phí", icon: <Receipt className="w-4 h-4" />, group: "Tài chính & Bù" },
        { id: "PAYROLL", label: "Bảng công & Lương", icon: <Coins className="w-4 h-4" />, group: "Tài chính & Bù" },
        { id: "MAKEUP_CLASSES", label: "Lớp học bù", icon: <CalendarCheck className="w-4 h-4" />, badge: makeupClasses.length, group: "Tài chính & Bù" },
        { id: "CLASSES", label: "Lớp học", icon: <BookOpen className="w-4 h-4" />, badge: classes.length, group: "Danh mục" },
        { id: "STUDENTS", label: "Học viên", icon: <Users className="w-4 h-4" />, badge: students.length, group: "Danh mục" },
        { id: "STAFF", label: "Nhân sự", icon: <GraduationCap className="w-4 h-4" />, badge: staff.length, group: "Danh mục" },
        { id: "ROOMS", label: "Phòng học", icon: <DoorOpen className="w-4 h-4" />, badge: classrooms.length, group: "Danh mục" },
        { id: "COURSES", label: "Khóa học", icon: <Sparkles className="w-4 h-4" />, group: "Danh mục" },
      ];
    }
    if (activeRole === "TEACHER") {
      return [
        { id: "TIMETABLE", label: "Thời Khóa Biểu", icon: <Calendar className="w-4 h-4" />, group: "Giảng dạy" },
        { id: "ATTENDANCE", label: "Giám Sát Điểm Danh", icon: <Eye className="w-4 h-4" />, group: "Giảng dạy" },
        { id: "CLASS_LOGS", label: "Nhật Ký & Giao BTVN", icon: <BookOpen className="w-4 h-4" />, group: "Giảng dạy" },
        { id: "HOMEWORK_TRACKING", label: "Theo Dõi Nộp BTVN", icon: <FileCheck className="w-4 h-4" />, group: "Đánh giá" },
        { id: "MONTHLY_EXAM", label: "Bài Thi Hàng Tháng", icon: <FileCheck2 className="w-4 h-4" />, group: "Đánh giá" },
        { id: "INCIDENT_NOTES", label: "Lưu Ý Riêng Cho HS", icon: <AlertCircle className="w-4 h-4" />, group: "Đánh giá" },
        { id: "PAYROLL", label: "Bảng Công & Lương", icon: <Coins className="w-4 h-4" />, group: "Cá nhân" },
      ];
    }
    if (activeRole === "ASSISTANT") {
      return [
        { id: "TIMETABLE", label: "Thời Khóa Biểu", icon: <Calendar className="w-4 h-4" />, group: "Vận hành lớp" },
        { id: "ATTENDANCE", label: "Điểm Danh Đầu Giờ", icon: <CheckCircle2 className="w-4 h-4" />, group: "Vận hành lớp" },
        { id: "WORKBOOK", label: "Kiểm Tra BTVN", icon: <BookCheck className="w-4 h-4" />, group: "Vận hành lớp" },
        { id: "HOMEWORK_GRADING", label: "Kiểm Tra BTVN Online", icon: <FileCheck className="w-4 h-4" />, group: "BTVN & Học bù" },
        { id: "MAKEUP_CLASSES", label: "Lớp Học Bù", icon: <CalendarCheck className="w-4 h-4" />, group: "BTVN & Học bù" },
        { id: "INCIDENT_NOTES", label: "Lưu Ý Riêng Cho HS", icon: <AlertCircle className="w-4 h-4" />, group: "BTVN & Học bù" },
        { id: "PAYROLL", label: "Bảng Công & Lương", icon: <Coins className="w-4 h-4" />, group: "Cá nhân" },
      ];
    }
    return [];
  }, [activeRole, classLogs.length, makeupClasses.length, classes.length, students.length, staff.length, classrooms.length]);

  const currentTabId =
    activeRole === "ADMIN" ? adminTab : activeRole === "TEACHER" ? teacherTab : assistantTab;

  const handleSelectTab = (id: string) => {
    if (activeRole === "ADMIN") setAdminTab(id as AdminTab);
    else if (activeRole === "TEACHER") setTeacherTab(id as TeacherTab);
    else if (activeRole === "ASSISTANT") setAssistantTab(id as AssistantTab);
    setIsMobileDrawerOpen(false);
  };

  if (!currentUserAccount) {
    return <LoginView onLoginSuccess={(user) => setActiveRole(user.role)} />;
  }

  const isAdminUser = currentUserAccount.role === "ADMIN";

  const currentUser = {
    id: currentUserAccount.id,
    name: currentUserAccount.name || (isAdminUser ? adminAccount?.name || "Chủ Trung Tâm" : "Người dùng"),
    role: activeRole,
    avatarUrl:
      currentUserAccount.avatarUrl ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUserAccount.name || currentUserAccount.id)}`,
    title:
      activeRole === "ADMIN"
        ? "Chủ Trung Tâm / Admin"
        : activeRole === "TEACHER"
        ? currentTeacherStaff?.fullName || currentUserAccount.name || "Giáo viên"
        : activeRole === "ASSISTANT"
        ? currentAssistantStaff?.fullName || currentUserAccount.name || "Trợ giảng (TA)"
        : "Phụ huynh học sinh",
    phone: currentUserAccount.phone,
  };

  const activeNavItem = navItems.find((item) => item.id === currentTabId);

  const groupedNav = navItems.reduce<Array<{ group: string; items: NavItem[] }>>((acc, item) => {
    const g = item.group || "Chung";
    const found = acc.find((x) => x.group === g);
    if (found) found.items.push(item);
    else acc.push({ group: g, items: [item] });
    return acc;
  }, []);

  const roleBadgeClass =
    activeRole === "ADMIN"
      ? "bg-amber-100 text-amber-900 border-amber-200"
      : activeRole === "TEACHER"
      ? "bg-emerald-100 text-emerald-900 border-emerald-200"
      : activeRole === "ASSISTANT"
      ? "bg-blue-100 text-blue-900 border-blue-200"
      : "bg-purple-100 text-purple-900 border-purple-200";

  const roleLabel =
    activeRole === "ADMIN"
      ? "Quản trị viên"
      : activeRole === "TEACHER"
      ? "Giáo viên"
      : activeRole === "ASSISTANT"
      ? "Trợ giảng"
      : "Phụ huynh";

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-800 flex flex-col">
      {/* Compact Sticky Topbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-4 pt-[max(0.4rem,env(safe-area-inset-top))] pb-2 flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          {activeRole !== "PARENT" && (
            <>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(true)}
                className="lg:hidden p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer active-press"
                aria-label="Mở menu điều hướng"
              >
                <Menu className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                className="hidden lg:flex p-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 cursor-pointer transition"
                title={isSidebarCollapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>
            </>
          )}

          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0">
            ✨
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm sm:text-base text-slate-900 leading-tight truncate">
                Ms. Dung Shiny
              </h1>
              <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${roleBadgeClass}`}>
                {roleLabel}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 hidden xl:block leading-none mt-0.5">
              Hệ thống Quản lý Đào tạo &amp; Sổ Liên Lạc Điện Tử
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => triggerCloudSync()}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition cursor-pointer active-press ${
              cloudSyncStatus === "SYNCED"
                ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900"
                : cloudSyncStatus === "SYNCING"
                ? "border-sky-200 bg-sky-50 text-sky-900"
                : cloudSyncStatus === "ERROR"
                ? "border-rose-200 bg-rose-50 text-rose-900"
                : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
            title={
              cloudSyncStatus === "SYNCED"
                ? `Cloud DB: Đã đồng bộ (${lastCloudSyncAt ? new Date(lastCloudSyncAt).toLocaleTimeString() : "Vừa xong"}).`
                : "Đồng bộ dữ liệu Cloud DB"
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
            <span className="hidden md:inline">Cloud DB</span>
            <span className="md:hidden">
              {cloudSyncStatus === "SYNCED" ? "DB" : cloudSyncStatus === "SYNCING" ? "..." : "Lỗi"}
            </span>
          </button>

          {activeRole !== "PARENT" && (
            <button
              onClick={() => setIsZaloSessionOpen(true)}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 text-[11px] font-bold transition cursor-pointer active-press"
              title="Quét mã QR đăng nhập Bot Zalo riêng của tài khoản này"
            >
              <QrCode className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Zalo Cá Nhân</span>
              <span className="sm:hidden">Zalo</span>
            </button>
          )}

          {currentUserAccount.role === "ADMIN" && (
            <>
              <button
                onClick={() => setIsZaloTemplatesOpen(true)}
                className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition text-[11px] font-bold cursor-pointer active-press"
                title="Cấu hình mẫu tin nhắn tự động"
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden xl:inline">Mẫu Tin Nhắn</span>
              </button>

              <button
                onClick={() => setIsAdminChangePasswordOpen(true)}
                className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 transition text-[11px] font-bold cursor-pointer active-press"
                title="Cập nhật tên, SĐT chủ trung tâm & đổi mật khẩu Admin"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                <span>Hồ Sơ &amp; MK</span>
              </button>
            </>
          )}

          {/* Desktop Profile + Logout */}
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="flex flex-col text-right max-w-[140px]">
              <span className="text-[11.5px] font-semibold text-slate-900 truncate">{currentUser.name}</span>
              <span className="text-[10px] text-slate-500 font-mono truncate">{currentUser.phone || currentUser.title}</span>
            </div>
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full bg-slate-100 border border-amber-200 shrink-0"
            />
            <button
              onClick={logout}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition text-[11px] font-bold active-press cursor-pointer"
              title="Đăng xuất tài khoản & tự động đăng xuất Bot Zalo"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden xl:inline">Đăng Xuất</span>
            </button>
          </div>

          {/* Mobile Profile Menu */}
          <div className="relative sm:hidden">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-8 h-8 rounded-full bg-slate-100 border border-amber-400 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer active-press"
              aria-label="Tài khoản cá nhân"
            >
              <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
            </button>

            {isMobileMenuOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-black/25 backdrop-blur-2xs" onClick={() => setIsMobileMenuOpen(false)} />
                <div className="absolute right-0 top-10 z-50 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 space-y-2.5">
                  <div className="pb-2 border-b border-slate-100">
                    <div className="font-bold text-xs text-slate-900 truncate">{currentUser.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">{currentUser.phone || currentUser.title}</div>
                    <div className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleBadgeClass}`}>
                      {roleLabel}
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
                    <span>Đăng Xuất (Tự tắt Zalo Bot)</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Slim Zalo Bar */}
      <ZaloTopBarBanner
        activeRole={activeRole as any}
        staffId={activeZaloStaffInfo.staffId}
        staffName={activeZaloStaffInfo.name}
        staffPhone={activeZaloStaffInfo.phone}
      />

      {/* Mobile Slide-Over Navigation Drawer (< lg) */}
      {isMobileDrawerOpen && activeRole !== "PARENT" && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs" onClick={() => setIsMobileDrawerOpen(false)} />
          <aside className="relative z-10 w-72 max-w-[82vw] bg-white h-full shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                  ✨
                </span>
                <div>
                  <div className="font-bold text-xs leading-tight">Ms. Dung Shiny</div>
                  <div className="text-[10px] text-slate-300">{roleLabel}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-4">
              {groupedNav.map((section) => (
                <div key={section.group} className="space-y-1">
                  <div className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {section.group}
                  </div>
                  {section.items.map((item) => {
                    const active = item.id === currentTabId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectTab(item.id)}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          active
                            ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span className="flex items-center gap-2.5 truncate">
                          {item.icon}
                          <span className="truncate">{item.label}</span>
                        </span>
                        {item.badge !== undefined && (
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                              active ? "bg-slate-950/15 text-slate-950" : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Workspace Body: Collapsible Desktop Sidebar + Full-Fit Content */}
      {activeRole === "PARENT" ? (
        <main className="w-full max-w-5xl mx-auto px-3 sm:px-5 py-3 sm:py-4 space-y-3 flex-1 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between gap-2 bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-2xs">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-500" />
                <span>Sổ Liên Lạc Điện Tử — Kính chào {currentUserAccount.name}</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Theo dõi lịch học, kết quả học tập, nộp BTVN &amp; đóng học phí VietQR minh bạch
              </p>
            </div>
            <span className="hidden sm:inline-block text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
              Cập Nhật Thời Gian Thực
            </span>
          </div>
          <ParentPortal />
        </main>
      ) : (
        <div className="flex flex-1 min-w-0">
          {/* Desktop Left Sidebar (Fit 100% scale, no horizontal tab crowding) */}
          <aside
            className={`hidden lg:flex flex-col shrink-0 bg-white border-r border-slate-200 sticky top-[52px] h-[calc(100dvh-52px)] transition-all duration-200 ${
              isSidebarCollapsed ? "w-16" : "w-56"
            }`}
          >
            <nav className="flex-1 overflow-y-auto scrollbar-thin p-2.5 space-y-3">
              {groupedNav.map((section) => (
                <div key={section.group} className="space-y-1">
                  {!isSidebarCollapsed && (
                    <div className="px-2.5 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {section.group}
                    </div>
                  )}
                  {section.items.map((item) => {
                    const active = item.id === currentTabId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectTab(item.id)}
                        title={item.label}
                        className={`w-full flex items-center ${
                          isSidebarCollapsed ? "justify-center px-2" : "justify-between px-2.5"
                        } py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          active
                            ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="shrink-0">{item.icon}</span>
                          {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                        </span>
                        {!isSidebarCollapsed && item.badge !== undefined && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0 ${
                              active ? "bg-slate-950/15 text-slate-950" : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>

            {!isSidebarCollapsed && (
              <div className="p-2.5 border-t border-slate-100 text-[10.5px] text-slate-500 bg-slate-50/70">
                <div className="font-semibold text-slate-700 truncate">{currentUser.name}</div>
                <div className="font-mono text-[10px] truncate">{currentUser.phone || roleLabel}</div>
              </div>
            )}
          </aside>

          {/* Main Workspace Container */}
          <main className="flex-1 min-w-0 p-3 sm:p-4 lg:p-5 space-y-3.5 pb-[max(2rem,env(safe-area-inset-bottom))]">
            {/* Mobile Quick Navigation Bar (< lg) */}
            <div className="lg:hidden space-y-2">
              <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 pl-1 shrink-0">Mục:</span>
                <select
                  value={currentTabId}
                  onChange={(e) => handleSelectTab(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                >
                  {navItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                      {item.badge !== undefined ? ` (${item.badge})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Compact Page Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${roleBadgeClass}`}>
                  {activeRole === "ADMIN" ? (
                    <ShieldCheck className="w-4 h-4" />
                  ) : activeRole === "TEACHER" ? (
                    <GraduationCap className="w-4 h-4" />
                  ) : (
                    <UserCheck className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                    {activeNavItem?.label || roleLabel}
                  </h2>
                  <p className="text-[11px] text-slate-500 truncate">
                    {activeRole === "ADMIN"
                      ? `Quản trị trung tâm • ${classes.length} lớp • ${students.length} học viên`
                      : activeRole === "TEACHER"
                      ? `Giảng viên: ${currentTeacherStaff?.fullName || currentUser.name}`
                      : `Trợ giảng: ${currentAssistantStaff?.fullName || currentUser.name}`}
                  </p>
                </div>
              </div>

              {activeRole === "ADMIN" && (
                <div className="hidden sm:flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsZaloTemplatesOpen(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                    <span>Mẫu Tin Nhắn</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsZaloSessionOpen(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Zalo Bot</span>
                  </button>
                </div>
              )}
            </div>

            {/* Active Tab Content */}
            {activeRole === "ADMIN" && (
              <div>
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
              <div>
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
              <div>
                {assistantTab === "TIMETABLE" && <TimetableManager userRole="ASSISTANT" />}
                {assistantTab === "ATTENDANCE" && <AttendanceManager userRole="ASSISTANT" currentStaffId={currentStaffId} />}
                {assistantTab === "WORKBOOK" && <WorkbookCheckManager currentStaffId={currentStaffId} />}
                {assistantTab === "HOMEWORK_GRADING" && <HomeworkGradingManager userRole="ASSISTANT" currentStaffId={currentStaffId} />}
                {assistantTab === "MAKEUP_CLASSES" && <MakeupClassesManager userRole="ASSISTANT" />}
                {assistantTab === "INCIDENT_NOTES" && <StudentIncidentNotesManager userRole="ASSISTANT" currentStaffId={currentStaffId} />}
                {assistantTab === "PAYROLL" && <StaffTimesheetViewer userRole="ASSISTANT" currentStaffId={currentStaffId} />}
              </div>
            )}
          </main>
        </div>
      )}

      {/* Modals */}
      <AdminChangePasswordModal
        isOpen={isAdminChangePasswordOpen}
        onClose={() => setIsAdminChangePasswordOpen(false)}
      />

      <ZaloTemplatesManagerModal
        isOpen={isZaloTemplatesOpen}
        onClose={() => setIsZaloTemplatesOpen(false)}
      />

      <ZaloAccountModal
        isOpen={isZaloSessionOpen}
        onClose={() => setIsZaloSessionOpen(false)}
        activeRole={activeRole as any}
        staffId={activeZaloStaffInfo.staffId}
        staffName={activeZaloStaffInfo.name}
        staffPhone={activeZaloStaffInfo.phone}
      />
    </div>
  );
}
