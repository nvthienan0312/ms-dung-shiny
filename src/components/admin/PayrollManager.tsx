"use client";

import React, { useState, useMemo } from "react";
import { useCenter } from "@/context/CenterContext";
import { StaffSalaryTimesheet, StaffSalarySessionLog } from "@/data/centerData";
import { 
  Coins, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Eye, 
  Send, 
  FileCheck, 
  Calendar, 
  User, 
  GraduationCap, 
  UserCheck, 
  DollarSign, 
  Download, 
  ChevronRight, 
  X,
  CreditCard,
  Building,
  Check,
  Edit3,
  MessageSquare,
  RotateCcw
} from "lucide-react";
import EditZaloMessageModal from "@/components/common/EditZaloMessageModal";
import ZaloBatchQueueModal, { ZaloQueueItem } from "@/components/common/ZaloBatchQueueModal";
import { generatePayrollZaloMessage } from "@/utils/zaloHelper";

export default function PayrollManager() {
  const { 
    staffTimesheets, 
    staff, 
    markTimesheetPaid, 
    markTimesheetUnpaid,
    updateStaffTimesheet, 
    recalculateStaffTimesheetHours, 
    sendTimesheetToStaff,
    sendZaloMessageToParent
  } = useCenter();

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>("Tháng 10/2026");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "TEACHER" | "ASSISTANT">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CONFIRMED" | "PENDING_CONFIRMATION" | "SENT_TO_STAFF" | "DRAFT">("ALL");
  const [paymentFilter, setPaymentFilter] = useState<"ALL" | "PAID" | "UNPAID">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // State cho Zalo Modal cá nhân (Bảng lương từng nhân sự)
  const [editZaloModal, setEditZaloModal] = useState<{
    isOpen: boolean;
    staffName: string;
    staffPhone: string;
    roleName: string;
    title: string;
    initialContent: string;
    templateBadge: string;
    timesheetId?: string;
  }>({
    isOpen: false,
    staffName: "",
    staffPhone: "",
    roleName: "",
    title: "",
    initialContent: "",
    templateBadge: "Bảng Lương Tháng",
  });

  // State cho Zalo Hàng Đợi Toàn Bộ Nhân Sự (Giãn cách 2-3 phút chống spam)
  const [isZaloQueueOpen, setIsZaloQueueOpen] = useState(false);
  const [zaloQueueItems, setZaloQueueItems] = useState<ZaloQueueItem[]>([]);



  // Modal inspection of session logs
  const [viewingTimesheet, setViewingTimesheet] = useState<StaffSalaryTimesheet | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal Admin chỉnh sửa bảng lương
  const [editingTimesheet, setEditingTimesheet] = useState<StaffSalaryTimesheet | null>(null);
  const [editHours, setEditHours] = useState<number>(0);
  const [editRate, setEditRate] = useState<number>(0);
  const [editAllowance, setEditAllowance] = useState<number>(0);
  const [editBonus, setEditBonus] = useState<number>(0);
  const [editDeductionStr, setEditDeductionStr] = useState<string>("0"); // Khoản khác (+/-) dạng chuỗi để gõ thoải mái dấu "-"
  const [editNotes, setEditNotes] = useState<string>("");
  const [editPaymentStatus, setEditPaymentStatus] = useState<"PAID" | "UNPAID">("UNPAID");
  const [revertTsConfirm, setRevertTsConfirm] = useState<StaffSalaryTimesheet | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const parsedEditDeduction = useMemo(() => {
    const val = parseInt(editDeductionStr, 10);
    return isNaN(val) ? 0 : val;
  }, [editDeductionStr]);

  const handleOpenEdit = (ts: StaffSalaryTimesheet) => {
    setEditingTimesheet(ts);
    setEditHours(ts.totalHours);
    setEditRate(ts.hourlyRate);
    setEditAllowance(ts.allowance || 0);
    setEditBonus(ts.bonus || 0);
    const existingOther = ts.otherAdjustment !== undefined ? ts.otherAdjustment : (ts.deduction || 0);
    setEditDeductionStr(existingOther.toString());
    setEditNotes(ts.adminNotes || "");
    setEditPaymentStatus(ts.paymentStatus || "UNPAID");
  };

  const handleSaveEdit = () => {
    if (!editingTimesheet) return;
    const finalOther = parsedEditDeduction;

    // Đồng bộ thay đổi trạng thái chi trả lương
    if (editPaymentStatus !== (editingTimesheet.paymentStatus || "UNPAID")) {
      if (editPaymentStatus === "PAID") {
        markTimesheetPaid(editingTimesheet.id);
      } else {
        markTimesheetUnpaid(editingTimesheet.id);
      }
    }

    updateStaffTimesheet(editingTimesheet.id, {
      totalHours: editHours,
      hourlyRate: editRate,
      allowance: editAllowance,
      bonus: editBonus,
      deduction: finalOther,
      otherAdjustment: finalOther,
      adminNotes: editNotes,
      paymentStatus: editPaymentStatus,
      paidAt: editPaymentStatus === "PAID" ? (editingTimesheet.paidAt || new Date().toISOString()) : undefined,
    });
    showToast(`✓ Đã cập nhật bảng lương của ${editingTimesheet.staffName}!`);
    setEditingTimesheet(null);
  };

  const handleSendTimesheet = (tsId: string, staffName: string) => {
    sendTimesheetToStaff(tsId);
    showToast(`🚀 Đã gửi bảng lương tới ${staffName}! Nhân sự sẽ kiểm tra & confirm trên web.`);
  };

  const handleSendAllTimesheets = () => {
    sendTimesheetToStaff("ALL");
    showToast(`🚀 Đã gửi bảng lương cho tất cả nhân sự! Đang chờ GV & TA đối soát và confirm.`);
  };

  // Mở modal gửi Zalo bảng lương cho 1 nhân sự
  const handleOpenZaloPayrollModal = (ts: StaffSalaryTimesheet) => {
    const staffItem = staff.find((s) => s.id === ts.staffId);
    const phone = staffItem?.phone || "";
    const roleLabel = ts.role === "TEACHER" ? "Giáo Viên" : "Trợ Giảng";
    const msg = generatePayrollZaloMessage(
      ts.staffName,
      ts.monthStr,
      ts.totalHours,
      ts.totalNetSalary
    );

    setEditZaloModal({
      isOpen: true,
      staffName: ts.staffName,
      staffPhone: phone,
      roleName: roleLabel,
      title: `Gửi Zalo Bảng Lương: ${ts.staffName} (${ts.totalNetSalary.toLocaleString("vi-VN")} đ)`,
      initialContent: msg,
      templateBadge: "Bảng Lương Nhân Sự",
      timesheetId: ts.id,
    });
  };

  // Xác nhận gửi Zalo 1-chạm bảng lương
  const handleConfirmSendPayrollZalo = async (finalMessage: string) => {
    if (!editZaloModal.staffPhone) {
      showToast("⚠️ Nhân sự này chưa có số điện thoại đăng ký!");
      return;
    }
    const res = await sendZaloMessageToParent({
      recipientPhone: editZaloModal.staffPhone,
      recipientName: editZaloModal.staffName,
      studentName: editZaloModal.staffName,
      className: editZaloModal.roleName,
      messageType: "PAYROLL",
      title: editZaloModal.title,
      content: finalMessage,
      senderRole: "ADMIN",
      senderName: "Ms. Dung (Hotline Trung Tâm)",
      senderPhone: "0964645174",
      openChatWindow: false,
    });
    if (res.success) {
      if (editZaloModal.timesheetId) {
        sendTimesheetToStaff(editZaloModal.timesheetId);
      }
      showToast(`✓ Đã gửi bảng lương qua Zalo tới ${editZaloModal.staffName}!`);
    } else {
      showToast(`⚠️ Không thể gửi Zalo: ${res.message}`);
    }
    setEditZaloModal((prev) => ({ ...prev, isOpen: false }));
  };

  // Bật hàng đợi gửi Zalo bảng lương cho toàn bộ nhân sự (giãn cách 2-3 phút chống spam)
  const handleSendZaloAllStaffPayroll = () => {
    const listForMonth = staffTimesheets.filter(
      (ts) => selectedMonth === "ALL" || ts.monthStr === selectedMonth
    );

    const queue: ZaloQueueItem[] = [];
    for (const ts of listForMonth) {
      const staffItem = staff.find((s) => s.id === ts.staffId);
      const phone = staffItem?.phone || "";
      if (!phone) continue;

      const msg = generatePayrollZaloMessage(
        ts.staffName,
        ts.monthStr,
        ts.totalHours,
        ts.totalNetSalary
      );

      queue.push({
        id: `payroll-${ts.id}-${Date.now()}`,
        studentId: ts.staffId,
        studentName: ts.staffName,
        parentName: ts.staffName,
        parentPhone: phone,
        className: ts.role === "TEACHER" ? "Giáo Viên" : "Trợ Giảng",
        messageType: "PAYROLL",
        title: `Bảng Lương ${ts.monthStr}: ${ts.staffName}`,
        content: msg,
        status: "PENDING",
      });
    }

    if (queue.length === 0) {
      showToast("⚠️ Không tìm thấy nhân sự có số điện thoại để đưa vào hàng đợi!");
      return;
    }

    setZaloQueueItems(queue);
    setIsZaloQueueOpen(true);
  };

  // Unique months available
  const availableMonths = useMemo(() => {
    const months = Array.from(new Set(staffTimesheets.map((ts) => ts.monthStr)));
    return months.length > 0 ? months : ["Tháng 10/2026", "Tháng 11/2026"];
  }, [staffTimesheets]);

  // Filtered timesheets
  const filteredTimesheets = useMemo(() => {
    return staffTimesheets.filter((ts) => {
      if (selectedMonth !== "ALL" && ts.monthStr !== selectedMonth) return false;
      if (roleFilter !== "ALL" && ts.role !== roleFilter) return false;
      if (statusFilter !== "ALL" && ts.status !== statusFilter) return false;
      if (paymentFilter !== "ALL") {
        const isPaid = ts.paymentStatus === "PAID";
        if (paymentFilter === "PAID" && !isPaid) return false;
        if (paymentFilter === "UNPAID" && isPaid) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          ts.staffName.toLowerCase().includes(q) ||
          ts.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [staffTimesheets, selectedMonth, roleFilter, statusFilter, paymentFilter, searchQuery]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const listForMonth = staffTimesheets.filter(
      (ts) => selectedMonth === "ALL" || ts.monthStr === selectedMonth
    );
    const totalPayroll = listForMonth.reduce((acc, cur) => acc + cur.totalNetSalary, 0);
    const totalConfirmed = listForMonth.filter((ts) => ts.status === "CONFIRMED").length;
    const totalPending = listForMonth.filter((ts) => ts.status === "PENDING_CONFIRMATION").length;
    const totalPaid = listForMonth.filter((ts) => ts.paymentStatus === "PAID").length;
    const totalStaffCount = listForMonth.length;
    const percentConfirmed = totalStaffCount > 0 ? Math.round((totalConfirmed / totalStaffCount) * 100) : 0;

    return {
      totalPayroll,
      totalConfirmed,
      totalPending,
      totalPaid,
      totalStaffCount,
      percentConfirmed,
    };
  }, [staffTimesheets, selectedMonth]);

  const handleMarkPaid = (tsId: string, staffName: string) => {
    markTimesheetPaid(tsId);
    showToast(`✓ Đã xác nhận chuyển lương thành công cho ${staffName}!`);
  };

  const handleRemindStaff = (staffName: string) => {
    showToast(`Đã gửi thông báo nhắc xác nhận bảng công tới ${staffName} qua Zalo & SMS!`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-amber-400/40 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-600" /> Quản Lý Chấm Công & Tiền Lương Nhân Sự
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Cơ chế 2 chiều: GV/TA xác nhận & Admin giải ngân
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Bảng Tổng Hợp Công & Đối Soát Lương Nhân Sự</h2>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            onClick={() => showToast("Đã xuất file bảng chấm công chi tiết Excel (.xlsx) cho kế toán!")}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition border border-slate-300"
          >
            <Download className="w-4 h-4 text-slate-500" /> Xuất Excel
          </button>
          
          <button
            onClick={handleSendAllTimesheets}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl text-xs shadow-sm transition active:scale-95"
            title="Gửi bảng lương tới GV & TA để nhân sự kiểm tra và confirm trên cổng cá nhân"
          >
            <Send className="w-3.5 h-3.5 text-slate-950" />
            <span>Gửi Bảng Lương Nội Bộ</span>
          </button>

          <button
            onClick={handleSendZaloAllStaffPayroll}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs shadow-sm transition active:scale-95"
            title="Gửi tự động bảng lương qua Zalo tới toàn bộ nhân sự, giãn cách 2-3 phút chống spam"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Gửi Zalo Toàn Bộ Nhân Sự</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Payroll */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Tổng quỹ lương ({selectedMonth})</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {metrics.totalPayroll.toLocaleString("vi-VN")} đ
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Bao gồm lương dạy, phụ cấp giáo án & thưởng KPI
          </p>
        </div>

        {/* Card 2: Confirmation Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Tiến độ nhân sự xác nhận</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <div className="text-2xl font-bold text-emerald-700">
              {metrics.totalConfirmed}/{metrics.totalStaffCount}
            </div>
            <span className="text-xs font-semibold text-emerald-600">({metrics.percentConfirmed}%)</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: `${metrics.percentConfirmed}%` }}
            />
          </div>
        </div>

        {/* Card 3: Pending Confirmation */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Chờ GV/TA xác nhận</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">
            {metrics.totalPending} Nhân sự
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {metrics.totalPending === 0 ? "✓ 100% nhân sự đã duyệt công" : "Cần gửi tin nhắn đôn đốc đối soát"}
          </p>
        </div>

        {/* Card 4: Disbursement Status */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Tiến độ giải ngân</span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-800 mt-2">
            {metrics.totalPaid}/{metrics.totalStaffCount} Đã trả
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {metrics.totalStaffCount - metrics.totalPaid} nhân sự chưa thanh toán
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto max-w-full scrollbar-thin pb-1">
          {/* Month selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-medium text-slate-500">Kỳ lương:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 border-none outline-none focus:ring-0 cursor-pointer"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
              <option value="ALL">Tất cả các tháng</option>
            </select>
          </div>

          {/* Role filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setRoleFilter("ALL")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                roleFilter === "ALL" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tất cả vai trò
            </button>
            <button
              onClick={() => setRoleFilter("TEACHER")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                roleFilter === "TEACHER" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Giáo viên
            </button>
            <button
              onClick={() => setRoleFilter("ASSISTANT")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                roleFilter === "ASSISTANT" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Trợ giảng
            </button>
          </div>

          {/* Confirmation Status filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                statusFilter === "ALL" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tất cả duyệt
            </button>
            <button
              onClick={() => setStatusFilter("CONFIRMED")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                statusFilter === "CONFIRMED" ? "bg-emerald-600 text-white shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ✓ Đã duyệt
            </button>
            <button
              onClick={() => setStatusFilter("PENDING_CONFIRMATION")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                statusFilter === "PENDING_CONFIRMATION" ? "bg-amber-500 text-slate-950 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ⏳ Chờ duyệt
            </button>
          </div>

          {/* Payment filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setPaymentFilter("ALL")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                paymentFilter === "ALL" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tất cả chi trả
            </button>
            <button
              onClick={() => setPaymentFilter("PAID")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                paymentFilter === "PAID" ? "bg-blue-600 text-white shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Đã chi trả
            </button>
            <button
              onClick={() => setPaymentFilter("UNPAID")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                paymentFilter === "UNPAID" ? "bg-slate-700 text-white shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Chưa trả
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên nhân sự..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Main Timesheets Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse text-xs min-w-[850px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Nhân Sự</th>
                <th className="py-3 px-3">Vai Trò</th>
                <th className="py-3 px-3 text-right">Tổng Giờ & Ca</th>
                <th className="py-3 px-3 text-right">Đơn Giá Giờ</th>
                <th className="py-3 px-3 text-right">Lương Cơ Bản</th>
                <th className="py-3 px-3 text-right">Phụ Cấp & Khác (+/-)</th>
                <th className="py-3 px-3 text-right">Lương Thực Nhận</th>
                <th className="py-3 px-4 text-center">Trạng Thái GV/TA</th>
                <th className="py-3 px-4 text-center">Chi Trả Lương</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTimesheets.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Không tìm thấy bảng chấm công nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredTimesheets.map((ts) => {
                  const staffObj = staff.find((s) => s.id === ts.staffId);
                  const isConfirmed = ts.status === "CONFIRMED";
                  const isPaid = ts.paymentStatus === "PAID";
                  const otherAdj = ts.otherAdjustment !== undefined ? ts.otherAdjustment : (ts.deduction || 0);
                  const totalAllowanceBonus = (ts.allowance || 0) + (ts.bonus || 0) + otherAdj;

                  return (
                    <tr key={ts.id} className="hover:bg-amber-50/30 transition-colors">
                      {/* Staff Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={staffObj?.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=Teacher"}
                            alt={ts.staffName}
                            className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              {ts.staffName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {staffObj?.phone || "09xx xxx xxx"} • {ts.monthStr}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-3">
                        {ts.role === "TEACHER" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            <GraduationCap className="w-3 h-3 text-purple-600" /> Giáo viên
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            <UserCheck className="w-3 h-3 text-blue-600" /> Trợ giảng (TA)
                          </span>
                        )}
                      </td>

                      {/* Hours & Sessions */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="font-bold text-slate-900">{ts.totalHours} giờ</div>
                        <div className="text-[11px] text-slate-500">({ts.totalSessions} ca dạy)</div>
                      </td>

                      {/* Hourly Rate */}
                      <td className="py-3.5 px-3 text-right font-medium text-slate-700">
                        {ts.hourlyRate.toLocaleString("vi-VN")} đ
                      </td>

                      {/* Base Salary */}
                      <td className="py-3.5 px-3 text-right font-medium text-slate-700">
                        {ts.baseSalary.toLocaleString("vi-VN")} đ
                      </td>

                      {/* Allowance & Other */}
                      <td className="py-3.5 px-3 text-right">
                        <div className={`font-semibold ${totalAllowanceBonus >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                          {totalAllowanceBonus >= 0 ? `+${totalAllowanceBonus.toLocaleString("vi-VN")}` : `${totalAllowanceBonus.toLocaleString("vi-VN")}`} đ
                        </div>
                        <div className="text-[10px] text-slate-500 space-y-0.5 mt-0.5">
                          {ts.allowance > 0 && <div>Đi lại: +{(ts.allowance / 1000).toFixed(0)}k</div>}
                          {ts.bonus > 0 && <div>Công việc: +{(ts.bonus / 1000).toFixed(0)}k</div>}
                          {otherAdj !== 0 && (
                            <div className={otherAdj > 0 ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>
                              Khác: {otherAdj > 0 ? `+${(otherAdj / 1000).toFixed(0)}k` : `${(otherAdj / 1000).toFixed(0)}k`}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Total Net Salary */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="text-sm font-extrabold text-amber-700">
                          {ts.totalNetSalary.toLocaleString("vi-VN")} đ
                        </div>
                      </td>

                      {/* Staff Confirmation Status */}
                      <td className="py-3.5 px-4 text-center">
                        {isConfirmed ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ĐÃ XÁC NHẬN
                            </span>
                            {ts.confirmedAt && (
                              <span className="text-[10px] text-slate-500 mt-1">
                                {new Date(ts.confirmedAt).toLocaleDateString("vi-VN", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            )}
                            {ts.feedbackNote && (
                              <span 
                                title={ts.feedbackNote}
                                className="text-[10px] text-emerald-700 italic max-w-[120px] truncate mt-0.5"
                              >
                                &ldquo;{ts.feedbackNote}&rdquo;
                              </span>
                            )}
                          </div>
                        ) : ts.status === "DRAFT" ? (
                          <div className="inline-flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                              <Clock className="w-3 h-3 text-slate-400" /> Bản nháp (Chưa gửi)
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleSendTimesheet(ts.id, ts.staffName)}
                                className="text-[10.5px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-lg transition flex items-center gap-1"
                                title="Gửi bảng lương cho nhân sự này kiểm tra"
                              >
                                <Send className="w-2.5 h-2.5" /> Gửi
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" /> ĐÃ GỬI • CHỜ CONFIRM
                            </span>
                            {ts.sentAt && (
                              <span className="text-[9.5px] text-slate-400">
                                Gửi: {new Date(ts.sentAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Disbursement Status */}
                      <td className="py-3.5 px-4 text-center">
                        {isPaid ? (
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              <Check className="w-3.5 h-3.5 text-blue-600" /> Đã chi trả
                            </span>
                            <button
                              onClick={() => setRevertTsConfirm(ts)}
                              className="px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                              title="Chuyển lại về trạng thái Chưa chi trả (phòng khi Admin bấm nhầm)"
                            >
                              <RotateCcw className="w-3 h-3 text-amber-700" /> Sửa/Chưa trả
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleMarkPaid(ts.id, ts.staffName)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 border border-slate-300 transition cursor-pointer"
                          >
                            <CreditCard className="w-3 h-3" /> Chi lương
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenZaloPayrollModal(ts)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition active:scale-95"
                            title="Xem trước & gửi thông báo bảng lương qua Zalo cho nhân sự"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> Gửi Zalo
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              recalculateStaffTimesheetHours(ts.id);
                              const calHours = ts.sessionLogs.reduce((s, l) => s + (l.durationHours || 0), 0);
                              showToast(`✓ Đã tự động tính lại chuẩn: ${calHours} giờ cho ${ts.staffName}!`);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 transition"
                            title="Tự động tính lại giờ dạy chuẩn từ ca dạy nếu sửa sai"
                          >
                            <Clock className="w-3.5 h-3.5 text-blue-600" /> Tính lại giờ
                          </button>

                          <button
                            onClick={() => handleOpenEdit(ts)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition"
                            title="Admin sửa số giờ, đơn giá, phụ cấp đi lại/công việc, khác"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-600" /> Sửa
                          </button>

                          <button
                            onClick={() => setViewingTimesheet(ts)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-200 transition"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-600" /> Xem ca ({ts.sessionLogs.length})
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Detailed Session Logs of a Staff Member */}
      {viewingTimesheet && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                    {viewingTimesheet.monthStr}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    viewingTimesheet.role === "TEACHER" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                  }`}>
                    {viewingTimesheet.role === "TEACHER" ? "Giáo viên" : "Trợ giảng"}
                  </span>
                  {viewingTimesheet.status === "CONFIRMED" ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã xác nhận
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" /> Chờ nhân sự duyệt
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  Nhật Ký Ca Dạy Chi Tiết: {viewingTimesheet.staffName}
                </h3>
              </div>
              <button
                onClick={() => setViewingTimesheet(null)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Feedback Note alert if confirmed */}
            {viewingTimesheet.feedbackNote && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold">Ghi chú xác nhận từ {viewingTimesheet.staffName}:</span>{" "}
                  &ldquo;{viewingTimesheet.feedbackNote}&rdquo;
                </div>
              </div>
            )}

            {/* Modal Body: Session Table */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                      <th className="py-2.5 px-3">Ngày</th>
                      <th className="py-2.5 px-3">Lớp & Phòng</th>
                      <th className="py-2.5 px-3">Khung Giờ</th>
                      <th className="py-2.5 px-3 text-right">Số Giờ</th>
                      <th className="py-2.5 px-3 text-right">Đơn Giá</th>
                      <th className="py-2.5 px-3 text-right">Thành Tiền</th>
                      <th className="py-2.5 px-3 text-center">Tính Chất</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewingTimesheet.sessionLogs.map((log, idx) => (
                      <tr key={log.id || idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {log.dateStr}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-800">{log.className}</div>
                          <div className="text-[10px] text-slate-400">{log.classroom}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {log.startTime} - {log.endTime}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-700">
                          {log.durationHours}h
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          {log.ratePerHour.toLocaleString("vi-VN")} đ
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {log.amount.toLocaleString("vi-VN")} đ
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {log.type === "SUBSTITUTION" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              Dạy thay
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                              Chính thức
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Calculation breakdown */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Tổng số giờ dạy ({viewingTimesheet.totalSessions} ca):</span>
                  <span className="font-bold text-slate-900">{viewingTimesheet.totalHours} giờ</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Lương ca dạy cơ bản:</span>
                  <span className="font-bold text-slate-900">{viewingTimesheet.baseSalary.toLocaleString("vi-VN")} đ</span>
                </div>
                {viewingTimesheet.allowance > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Phụ cấp đi lại:</span>
                    <span className="font-bold">+{viewingTimesheet.allowance.toLocaleString("vi-VN")} đ</span>
                  </div>
                )}
                {viewingTimesheet.bonus > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Phụ cấp công việc:</span>
                    <span className="font-bold">+{viewingTimesheet.bonus.toLocaleString("vi-VN")} đ</span>
                  </div>
                )}
                {((viewingTimesheet.otherAdjustment !== undefined ? viewingTimesheet.otherAdjustment : viewingTimesheet.deduction) !== 0) && (
                  <div className={`flex justify-between ${(viewingTimesheet.otherAdjustment ?? viewingTimesheet.deduction) > 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    <span>Khoản khác (+/-):</span>
                    <span className="font-bold">
                      {(viewingTimesheet.otherAdjustment ?? viewingTimesheet.deduction) > 0 ? "+" : ""}
                      {(viewingTimesheet.otherAdjustment ?? viewingTimesheet.deduction).toLocaleString("vi-VN")} đ
                    </span>
                  </div>
                )}
                <div className="border-t border-slate-300 pt-2 flex justify-between text-sm font-extrabold text-amber-700">
                  <span>Tổng lương thực lĩnh (NET):</span>
                  <span>{viewingTimesheet.totalNetSalary.toLocaleString("vi-VN")} đ</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="text-xs text-slate-500">
                Mã bảng lương: <span className="font-mono text-slate-700 font-bold">{viewingTimesheet.id}</span>
              </div>
              <div className="flex items-center gap-2">
                {viewingTimesheet.paymentStatus !== "PAID" ? (
                  <button
                    onClick={() => {
                      handleMarkPaid(viewingTimesheet.id, viewingTimesheet.staffName);
                      setViewingTimesheet(null);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    <CreditCard className="w-3.5 h-3.5" /> Đánh dấu đã chi trả lương
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Đã chi trả xong
                    </span>
                    <button
                      onClick={() => {
                        markTimesheetUnpaid(viewingTimesheet.id);
                        setViewingTimesheet((prev) => prev ? { ...prev, paymentStatus: "UNPAID", paidAt: undefined } : null);
                        showToast(`✓ Đã chuyển bảng lương của ${viewingTimesheet.staffName} về trạng thái Chưa chi trả!`);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition cursor-pointer"
                      title="Chuyển lại về trạng thái Chưa chi trả (phòng khi Admin bấm nhầm)"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" /> Sửa / Đổi Chưa Trả
                    </button>
                  </div>
                )}
                <button
                  onClick={() => setViewingTimesheet(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADMIN CHỈNH SỬA BẢNG LƯƠNG NHÂN SỰ */}
      {editingTimesheet && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                  Admin Điều Chỉnh Bảng Lương
                </span>
                <h4 className="font-bold text-base text-slate-900 mt-1">
                  {editingTimesheet.staffName} ({editingTimesheet.monthStr})
                </h4>
                <p className="text-xs text-slate-500">
                  Vai trò: {editingTimesheet.role === "TEACHER" ? "Giáo viên giảng dạy" : "Trợ giảng (TA)"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTimesheet(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Tổng giờ đứng lớp / trực:</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (!editingTimesheet) return;
                      const calculatedHours = (editingTimesheet.sessionLogs || []).reduce((sum, log) => sum + (log.durationHours || 0), 0);
                      setEditHours(calculatedHours);
                      showToast(`✓ Đã tính lại chuẩn: ${calculatedHours} giờ từ ${editingTimesheet.sessionLogs.length} ca dạy!`);
                    }}
                    className="text-[10px] text-blue-700 hover:text-blue-900 font-bold flex items-center gap-0.5 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 transition"
                    title="Tự động tính lại giờ từ danh sách ca dạy nếu nhập sai"
                  >
                    <Clock className="w-3 h-3 text-blue-600" /> Tự động tính lại
                  </button>
                </div>
                <input
                  type="number"
                  step="0.5"
                  value={editHours}
                  onChange={(e) => setEditHours(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Đơn giá theo giờ (VNĐ):</label>
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={editRate}
                  onChange={(e) => {
                    setEditRate(parseInt(e.target.value, 10) || 0);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Phụ cấp đi lại (VNĐ):</label>
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={editAllowance}
                  onChange={(e) => {
                    setEditAllowance(parseInt(e.target.value, 10) || 0);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-emerald-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Phụ cấp công việc (VNĐ):</label>
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={editBonus}
                  onChange={(e) => {
                    setEditBonus(parseInt(e.target.value, 10) || 0);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-emerald-800"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Khác (+/- VNĐ):</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditDeductionStr((prev) => {
                          const trimmed = prev.trim();
                          if (trimmed.startsWith("-")) return trimmed.slice(1);
                          if (trimmed === "" || trimmed === "0") return "-";
                          return "-" + trimmed;
                        });
                      }}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 transition"
                      title="Bấm để đổi dấu cộng/trừ nhanh (+/-)"
                    >
                      +/- Đổi Dấu
                    </button>
                    <span className="text-[10px] text-slate-400">Gõ dấu - để trừ</span>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editDeductionStr}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Cho phép chuỗi rỗng, dấu "-", dấu "+", hoặc số âm/dương
                      if (val === "" || val === "-" || val === "+" || /^[+-]?\d*$/.test(val)) {
                        setEditDeductionStr(val);
                      }
                    }}
                    placeholder="Gõ -50000 hoặc 100000..."
                    className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-xs ${
                      editDeductionStr.startsWith("-") 
                        ? "border-rose-400 bg-rose-50/70 text-rose-800" 
                        : parsedEditDeduction > 0 
                        ? "border-emerald-400 bg-emerald-50/70 text-emerald-800"
                        : "border-slate-200 bg-slate-50 text-slate-800"
                    }`}
                  />
                  {editDeductionStr.startsWith("-") && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded pointer-events-none">
                      Trừ lương
                    </span>
                  )}
                  {parsedEditDeduction > 0 && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded pointer-events-none">
                      Cộng thêm
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Lương thực lĩnh tự tính:</label>
                <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 font-mono font-extrabold text-amber-900 text-sm flex items-center justify-between">
                  <span>{((editHours * editRate) + editAllowance + editBonus + parsedEditDeduction).toLocaleString("vi-VN")} đ</span>
                  {parsedEditDeduction !== 0 && (
                    <span className={`text-[10.5px] font-normal ${parsedEditDeduction > 0 ? "text-emerald-700 font-semibold" : "text-rose-700 font-semibold"}`}>
                      ({parsedEditDeduction > 0 ? `+${parsedEditDeduction.toLocaleString("vi-VN")}` : `${parsedEditDeduction.toLocaleString("vi-VN")}`} đ)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1 text-xs">Ghi chú của Admin gửi cho nhân sự:</label>
              <input
                type="text"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Ví dụ: Đã cộng thêm 2h trực thay ngày 15/10 và thưởng hỗ trợ kỳ thi..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
              />
            </div>

            {/* Trạng thái chi trả lương */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 text-xs">
                  Trạng thái chi trả lương (Admin có thể sửa nếu ấn nhầm):
                </label>
                <span className="text-[10px] text-amber-800 font-semibold bg-amber-100 px-2 py-0.5 rounded-full">
                  Kiểm soát chi lương
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditPaymentStatus("PAID")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    editPaymentStatus === "PAID"
                      ? "bg-blue-600 border-blue-600 text-white shadow-sm ring-2 ring-blue-300"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Check className="w-4 h-4" /> Đã Chi Trả Lương
                </button>
                <button
                  type="button"
                  onClick={() => setEditPaymentStatus("UNPAID")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    editPaymentStatus === "UNPAID"
                      ? "bg-amber-500 border-amber-500 text-slate-950 shadow-sm ring-2 ring-amber-300"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Clock className="w-4 h-4" /> Chưa Chi Trả (Chờ chi)
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingTimesheet(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm transition active:scale-95"
              >
                Lưu Bảng Lương
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN HOÀN TÁC CHI TRẢ LƯƠNG */}
      {revertTsConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900">
                  Chuyển Lại Về Chưa Chi Trả
                </h4>
                <p className="text-xs text-slate-500">Phòng trường hợp Admin ấn nhầm nút chi lương</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 text-xs">
              <div>Nhân sự: <strong className="text-slate-900">{revertTsConfirm.staffName}</strong> ({revertTsConfirm.role === "TEACHER" ? "Giáo viên" : "Trợ giảng"})</div>
              <div>Kỳ lương: <strong className="text-slate-900">{revertTsConfirm.monthStr}</strong></div>
              <div>Thực lĩnh: <strong className="text-amber-800 font-mono text-sm">{revertTsConfirm.totalNetSalary.toLocaleString("vi-VN")} đ</strong></div>
              <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                Hệ thống sẽ chuyển trạng thái bảng lương về <strong>Chưa chi trả</strong> để Admin có thể kiểm tra hoặc chi trả lại sau.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRevertTsConfirm(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  markTimesheetUnpaid(revertTsConfirm.id);
                  showToast(`✓ Đã chuyển bảng lương của ${revertTsConfirm.staffName} về trạng thái CHƯA CHI TRẢ!`);
                  setRevertTsConfirm(null);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition cursor-pointer shadow-sm"
              >
                Xác Nhận Đổi Về Chưa Chi Trả
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chỉnh Sửa & Gửi Zalo Cá Nhân Bảng Lương */}
      <EditZaloMessageModal
        isOpen={editZaloModal.isOpen}
        onClose={() => setEditZaloModal((prev) => ({ ...prev, isOpen: false }))}
        recipientName={editZaloModal.staffName}
        recipientPhone={editZaloModal.staffPhone}
        studentName={editZaloModal.staffName}
        className={editZaloModal.roleName}
        initialContent={editZaloModal.initialContent}
        title={editZaloModal.title}
        templateBadge={editZaloModal.templateBadge}
        onSend={handleConfirmSendPayrollZalo}
      />

      {/* Modal Hàng Đợi Gửi Zalo Bảng Lương Toàn Bộ Nhân Sự (Giãn Cách 2-3 Phút) */}
      <ZaloBatchQueueModal
        isOpen={isZaloQueueOpen}
        onClose={() => setIsZaloQueueOpen(false)}
        title={`Hàng Đợi Zalo Bảng Lương (${selectedMonth})`}
        initialItems={zaloQueueItems}
        onAllCompleted={(count) => {
          showToast(`✓ Đã hoàn tất phiên gửi hàng đợi Zalo bảng lương cho ${count} nhân sự!`);
        }}
        senderRole="ADMIN"
        senderName="Ms. Dung (Hotline Trung Tâm)"
        senderPhone="0964645174"
      />
    </div>
  );
}
