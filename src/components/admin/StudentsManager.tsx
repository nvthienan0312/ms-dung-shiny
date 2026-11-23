"use client";

import { useState } from "react";
import { useCenter } from "@/context/CenterContext";
import { StudentItem } from "@/data/centerData";
import { 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  BookOpen, 
  X, 
  UserPlus, 
  AlertCircle,
  CheckCircle2,
  Trash2,
  Clock,
  Edit3,
  Lock,
  Unlock,
  ShieldCheck,
  RotateCcw,
  UserMinus,
  MessageSquare
} from "lucide-react";
import { normalizePhoneNumber } from "@/utils/authHelper";
import { cleanPhoneNumber } from "@/utils/zaloHelper";
import { getTodayDateString } from "@/utils/dateHelper";
import EditZaloMessageModal from "@/components/common/EditZaloMessageModal";

export default function StudentsManager() {
  const { 
    students, 
    classes, 
    addStudent, 
    updateStudent, 
    deleteStudent,
    userAccounts,
    toggleUserAccountPermission,
    setParentAccountPermissionByStudent,
    toggleAllParentPermissions,
    toggleStudentZaloFriendship,
    setStudentLearningStatus,
    sendZaloMessageToParent
  } = useCenter();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("ALL");
  const [learningStatusFilter, setLearningStatusFilter] = useState<"ALL" | "STUDYING" | "DROPPED">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // State Zalo Modal nhắn tin riêng cho Phụ Huynh
  const [editZaloModal, setEditZaloModal] = useState<{
    isOpen: boolean;
    studentName: string;
    parentName: string;
    parentPhone: string;
    className: string;
    title: string;
    initialContent: string;
    templateBadge: string;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // State xác nhận học sinh nghỉ hẳn
  const [droppingStudent, setDroppingStudent] = useState<any | null>(null);
  const [dropDate, setDropDate] = useState<string>(getTodayDateString());
  const [dropReason, setDropReason] = useState<string>("Gia đình bận lịch học / Chuyển nơi cư trú");

  // Student form state
  const [formData, setFormData] = useState({
    fullName: "",
    dob: "2020-01-01",
    gender: "Nam" as "Nam" | "Nữ",
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    classId: classes[0]?.id || "",
    monthlyFee: 1600000,
    tuitionStatus: "PAID" as "PAID" | "UNPAID" | "OVERDUE",
    currentBillingMonth: "Tháng 11/2026",
    tuitionDueDate: "10/11/2026",
  });

  const studyingStudentsCount = students.filter((s) => s.learningStatus !== "DROPPED").length;
  const droppedStudentsCount = students.filter((s) => s.learningStatus === "DROPPED").length;

  const filteredStudents = students.filter((stu) => {
    const matchesSearch =
      stu.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stu.studentCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stu.parentPhone.includes(searchQuery) ||
      stu.parentName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClass =
      selectedClassFilter === "ALL" ||
      (selectedClassFilter === "PENDING" && !stu.classId) ||
      stu.classId === selectedClassFilter;

    const matchesLearningStatus =
      learningStatusFilter === "ALL" ||
      (learningStatusFilter === "STUDYING" && stu.learningStatus !== "DROPPED") ||
      (learningStatusFilter === "DROPPED" && stu.learningStatus === "DROPPED");

    return matchesSearch && matchesClass && matchesLearningStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedStudents = filteredStudents.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const allowedParentsCount = students.filter((stu) => {
    const parentAcc = userAccounts.find(
      (a) => a.studentId === stu.id || (a.role === "PARENT" && normalizePhoneNumber(a.phone) === normalizePhoneNumber(stu.parentPhone))
    );
    return parentAcc ? parentAcc.isLoginAllowed : true;
  }).length;
  const lockedParentsCount = students.length - allowedParentsCount;

  const handleOpenCreate = () => {
    setEditingStudentId(null);
    setFormData({
      fullName: "",
      dob: "2020-01-01",
      gender: "Nam",
      parentName: "",
      parentPhone: "",
      parentEmail: "",
      classId: classes[0]?.id || "",
      monthlyFee: 1600000,
      tuitionStatus: "PAID",
      currentBillingMonth: "Tháng 11/2026",
      tuitionDueDate: "10/11/2026",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (stu: StudentItem) => {
    setEditingStudentId(stu.id);
    setFormData({
      fullName: stu.fullName,
      dob: stu.dob,
      gender: stu.gender,
      parentName: stu.parentName,
      parentPhone: stu.parentPhone,
      parentEmail: stu.parentEmail,
      classId: stu.classId || "",
      monthlyFee: stu.monthlyFee || 1600000,
      tuitionStatus: stu.tuitionStatus || "PAID",
      currentBillingMonth: stu.currentBillingMonth || "Tháng 11/2026",
      tuitionDueDate: stu.tuitionDueDate || "10/11/2026",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.parentPhone) return;

    const selectedCls = classes.find((c) => c.id === formData.classId);

    if (editingStudentId) {
      updateStudent(editingStudentId, {
        fullName: formData.fullName,
        dob: formData.dob,
        gender: formData.gender,
        parentName: formData.parentName,
        parentPhone: formData.parentPhone,
        parentEmail: formData.parentEmail,
        classId: formData.classId || undefined,
        className: selectedCls ? selectedCls.name : undefined,
        monthlyFee: Number(formData.monthlyFee),
        tuitionStatus: formData.tuitionStatus,
        currentBillingMonth: formData.currentBillingMonth,
        tuitionDueDate: formData.tuitionDueDate,
        remainingLessons: 8,
      });
      showToast(`✓ Đã cập nhật học viên "${formData.fullName}" & đồng bộ SĐT phụ huynh (${formData.parentPhone}) sang tất cả các tính năng!`);
    } else {
      addStudent({
        fullName: formData.fullName,
        dob: formData.dob,
        gender: formData.gender,
        parentName: formData.parentName,
        parentPhone: formData.parentPhone,
        parentEmail: formData.parentEmail,
        classId: formData.classId || undefined,
        className: selectedCls ? selectedCls.name : undefined,
        monthlyFee: Number(formData.monthlyFee),
        tuitionStatus: formData.tuitionStatus,
        currentBillingMonth: formData.currentBillingMonth,
        tuitionDueDate: formData.tuitionDueDate,
        remainingLessons: 8,
      });
      showToast(`✓ Đã thêm mới học sinh "${formData.fullName}" thành công!`);
    }

    setIsModalOpen(false);
  };

  // Mở modal Zalo nhắn tin trực tiếp cho Phụ Huynh
  const handleOpenZaloChat = (stu: StudentItem) => {
    const parentName = stu.parentName || "Phụ huynh";
    const initialMsg = `Kính gửi Ba Mẹ bé ${stu.fullName} (${parentName}),
Trung tâm tiếng Anh Ms. Dung Shiny xin gửi lời chào trân trọng!
Cô Dung liên hệ để trao đổi với Ba Mẹ về tình hình học tập và lộ trình của con tại lớp ${stu.className || "của trung tâm"}.

Nếu Ba Mẹ có bất kỳ câu hỏi hoặc cần hỗ trợ thêm thông tin gì, Ba Mẹ cứ nhắn tin lại cho cô nhé ạ!
Hotline trung tâm: 0964.645.174.
Trân trọng cảm ơn Ba Mẹ!`;

    setEditZaloModal({
      isOpen: true,
      studentName: stu.fullName,
      parentName,
      parentPhone: stu.parentPhone,
      className: stu.className || "Ms. Dung Shiny",
      title: `Nhắn Tin Zalo: PH bé ${stu.fullName} (${stu.parentPhone})`,
      initialContent: initialMsg,
      templateBadge: "Trao Đổi Trực Tiếp",
    });
  };

  // Xác nhận gửi tin nhắn Zalo cho Phụ Huynh
  const handleConfirmSendZalo = async (finalMessage: string) => {
    if (!editZaloModal) return;
    if (!editZaloModal.parentPhone) {
      showToast("⚠️ Học sinh này chưa có số điện thoại phụ huynh!");
      return;
    }

    const res = await sendZaloMessageToParent({
      recipientPhone: editZaloModal.parentPhone,
      recipientName: editZaloModal.parentName,
      studentName: editZaloModal.studentName,
      className: editZaloModal.className,
      messageType: "INCIDENT_NOTE",
      title: editZaloModal.title,
      content: finalMessage,
      senderRole: "ADMIN",
      senderName: "Ms. Dung (Hotline Trung Tâm)",
      senderPhone: "0964645174",
      openChatWindow: false,
    });

    if (res.success) {
      showToast(`✓ Đã gửi tin nhắn Zalo tới PH bé ${editZaloModal.studentName}!`);
    } else {
      showToast(`⚠️ Không thể gửi Zalo: ${res.message}`);
    }
    setEditZaloModal(null);
  };

  return (
    <div className="space-y-4 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-sm font-bold border border-emerald-400 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Cổng Phụ Huynh Access Control Bar */}
      <div className="bg-gradient-to-r from-amber-50/90 via-white to-amber-50/60 p-4 rounded-2xl border border-amber-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <span>Kiểm Soát Quyền Truy Cập Cổng Phụ Huynh</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300">
                Toàn Hệ Thống
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Đang mở quyền: <strong className="text-emerald-700 font-bold">{allowedParentsCount}</strong> / {students.length} phụ huynh ({lockedParentsCount} đang khóa). Phụ huynh chỉ cần nhập SĐT là vào được Cổng PH.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
          <button
            type="button"
            onClick={() => toggleAllParentPermissions(true)}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <Unlock className="w-3.5 h-3.5" /> Mở Khóa Toàn Bộ Cổng PH
          </button>
          <button
            type="button"
            onClick={() => toggleAllParentPermissions(false)}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <Lock className="w-3.5 h-3.5" /> Khóa Toàn Bộ Cổng PH
          </button>
        </div>
      </div>

      {/* Tab Phân Loại Trạng Thái Học Sinh (Tất Cả / Đang Học / Đã Nghỉ Hẳn) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setLearningStatusFilter("ALL"); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              learningStatusFilter === "ALL"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Tất Cả ({students.length})
          </button>
          <button
            type="button"
            onClick={() => { setLearningStatusFilter("STUDYING"); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer ${
              learningStatusFilter === "STUDYING"
                ? "bg-white text-emerald-800 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>🟢 Đang Theo Học ({studyingStudentsCount})</span>
          </button>
          <button
            type="button"
            onClick={() => { setLearningStatusFilter("DROPPED"); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer ${
              learningStatusFilter === "DROPPED"
                ? "bg-white text-rose-700 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>🛑 Đã Nghỉ Hẳn ({droppedStudentsCount})</span>
          </button>
        </div>

        <span className="text-[11px] text-slate-500 hidden md:inline">
          💡 Học sinh nghỉ hẳn vẫn bảo lưu 100% hồ sơ, số điện thoại phụ huynh và lịch sử đóng học phí
        </span>
      </div>

      {/* Search & Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 gap-2 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên học sinh, mã học viên, SĐT phụ huynh..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <select
            value={selectedClassFilter}
            onChange={(e) => { setSelectedClassFilter(e.target.value); setCurrentPage(1); }}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            <option value="ALL">Tất cả lớp học</option>
            <option value="PENDING">Chưa xếp lớp (Chờ test)</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} ({cls.currentStudents} HS)
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-amber-500/10 transition"
        >
          <UserPlus className="w-4 h-4" /> Tiếp Nhận Học Viên
        </button>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-xs min-w-[850px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Mã HV & Họ Tên</th>
                <th className="py-3.5 px-4">Ngày sinh & Giới tính</th>
                <th className="py-3.5 px-4">Phụ Huynh & Cổng PH</th>
                <th className="py-3.5 px-4">Lớp đang theo học</th>
                <th className="py-3.5 px-4">Học phí tháng này</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs italic">
                    Chưa có học viên nào trong danh sách. Bấm &quot;+ Thêm Học Viên Mới&quot; để tạo hồ sơ học sinh.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((stu) => {
                const parentAcc = userAccounts.find(
                  (a) => a.studentId === stu.id || (a.role === "PARENT" && normalizePhoneNumber(a.phone) === normalizePhoneNumber(stu.parentPhone))
                );
                const isAllowed = parentAcc ? parentAcc.isLoginAllowed : true;

                return (
                <tr key={stu.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {stu.studentCode}
                    </span>
                    <div className="font-bold text-slate-900 mt-1">{stu.fullName}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div>{stu.dob}</div>
                    <span className="text-[11px] text-slate-400">{stu.gender}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-bold text-slate-900">{stu.parentName}</div>
                      <div className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5 font-mono">
                        <Phone className="w-3 h-3 text-slate-400" /> {stu.parentPhone}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {isAllowed ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Cổng PH: Cho phép
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            <Lock className="w-2.5 h-2.5 text-rose-600" /> Cổng PH: Đã khóa
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setParentAccountPermissionByStudent(stu.id, !isAllowed)}
                          className={`text-[10px] font-bold underline px-1.5 py-0.5 rounded transition ${
                            isAllowed ? "text-rose-600 hover:text-rose-800 hover:bg-rose-50" : "text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50"
                          }`}
                          title={isAllowed ? "Tạm khóa quyền truy cập Cổng Phụ Huynh của học sinh này" : "Cấp lại quyền truy cập Cổng Phụ Huynh cho học sinh này"}
                        >
                          {isAllowed ? "Khóa" : "Mở quyền"}
                        </button>
                      </div>

                      {/* Trạng thái kết bạn Zalo với Phụ Huynh */}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {stu.zaloFriendshipStatus === "NOT_FRIENDED" ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Zalo: Chưa kết bạn
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Zalo: Đã kết bạn
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => toggleStudentZaloFriendship(stu.id)}
                          className="text-[10px] text-slate-500 hover:text-blue-700 underline px-1 py-0.5 rounded transition"
                          title="Chuyển đổi trạng thái kết bạn Zalo"
                        >
                          {stu.zaloFriendshipStatus === "NOT_FRIENDED" ? "Đã kết bạn" : "Đổi"}
                        </button>

                        <button
                          type="button"
                          onClick={() => window.open(`https://zalo.me/${cleanPhoneNumber(stu.parentPhone)}`, "_blank", "noopener,noreferrer")}
                          className="text-[10px] px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded font-bold transition flex items-center gap-0.5 cursor-pointer"
                          title="Mở Zalo để gửi lời mời kết bạn với phụ huynh này"
                        >
                          <span>💬 Kết Bạn</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenZaloChat(stu)}
                          className="text-[10px] px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-bold transition flex items-center gap-0.5 cursor-pointer"
                          title="Soạn và gửi tin nhắn Zalo trực tiếp cho phụ huynh này"
                        >
                          <MessageSquare className="w-2.5 h-2.5 text-emerald-600" />
                          <span>Nhắn Zalo</span>
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {stu.className ? (
                      <div className="font-medium text-slate-800 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                        {stu.className}
                      </div>
                    ) : (
                      <span className="text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]">
                        Chưa xếp lớp
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {stu.classId ? (
                      <div className="space-y-0.5">
                        <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full border text-[10.5px] ${
                          stu.tuitionStatus === "PAID"
                            ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                            : stu.tuitionStatus === "OVERDUE"
                            ? "text-rose-700 bg-rose-50 border-rose-200"
                            : "text-amber-700 bg-amber-50 border-amber-200"
                        }`}>
                          {stu.tuitionStatus === "PAID" ? "✓ Đã đóng T11" : stu.tuitionStatus === "OVERDUE" ? "Quá hạn T11" : "Chưa đóng T11"}
                        </span>
                        <div className="text-[10.5px] text-slate-500 font-mono">
                          {(stu.monthlyFee || 1600000).toLocaleString("vi-VN")} đ/tháng
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {stu.learningStatus === "DROPPED" ? (
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-full border border-slate-300">
                          🛑 Đã nghỉ hẳn
                        </span>
                        {stu.droppedDate && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            Nghỉ: {stu.droppedDate}
                          </div>
                        )}
                        {stu.droppedReason && (
                          <div className="text-[10px] text-slate-500 italic truncate max-w-[140px]" title={stu.droppedReason}>
                            {stu.droppedReason}
                          </div>
                        )}
                      </div>
                    ) : stu.classId ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Đang học
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <AlertCircle className="w-3 h-3" /> Chờ xếp lớp
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      {/* Nút Chuyển Đã Nghỉ / Học Lại */}
                      {stu.learningStatus === "DROPPED" ? (
                        <button
                          type="button"
                          onClick={() => setStudentLearningStatus(stu.id, "STUDYING")}
                          className="px-2 py-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition flex items-center gap-1 cursor-pointer"
                          title="Kích hoạt học sinh này đi học lại"
                        >
                          <RotateCcw className="w-3 h-3" /> Học lại
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setDroppingStudent(stu);
                            setDropDate(getTodayDateString());
                            setDropReason("Gia đình bận lịch học / Chuyển nơi cư trú");
                          }}
                          className="px-2 py-1 text-[10.5px] font-semibold text-slate-600 hover:text-rose-700 bg-slate-100 hover:bg-rose-50 border border-slate-200 rounded-lg transition flex items-center gap-1 cursor-pointer"
                          title="Đánh dấu học sinh đã nghỉ hẳn nhưng vẫn bảo lưu dữ liệu phụ huynh"
                        >
                          <UserMinus className="w-3 h-3 text-rose-500" /> Đã nghỉ
                        </button>
                      )}

                      {/* Nút Nhắn Tin Zalo Trao Đổi */}
                      <button
                        type="button"
                        onClick={() => handleOpenZaloChat(stu)}
                        title="Soạn và gửi tin nhắn Zalo trực tiếp cho phụ huynh"
                        className="px-2 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition flex items-center gap-1 cursor-pointer active:scale-95"
                      >
                        <MessageSquare className="w-3 h-3 text-emerald-600" /> Nhắn Zalo
                      </button>

                      {/* Nút Sửa */}
                      <button
                        onClick={() => handleOpenEdit(stu)}
                        title="Sửa thông tin học viên"
                        className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-amber-100 hover:text-amber-800 rounded-lg transition flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" /> Sửa
                      </button>

                      {/* Nút Xóa */}
                      {deleteConfirmId === stu.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              deleteStudent(stu.id);
                              setDeleteConfirmId(null);
                            }}
                            className="px-2 py-0.5 bg-red-600 text-white rounded text-[11px] font-semibold"
                            title="Xóa vĩnh viễn"
                          >
                            Xóa hẳn
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[11px]"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(stu.id)}
                          title="Xóa vĩnh viễn (Khuyến nghị: Nên bấm 'Đã nghỉ' thay thế để không mất dữ liệu PH)"
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            }))}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredStudents.length > pageSize && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-500 font-medium">
              Hiển thị <span className="font-bold text-slate-800">{(safeCurrentPage - 1) * pageSize + 1} - {Math.min(safeCurrentPage * pageSize, filteredStudents.length)}</span> trên tổng số <span className="font-bold text-slate-900">{filteredStudents.length}</span> học viên
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage(1)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition"
              >
                &laquo; Đầu
              </button>
              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition"
              >
                &lsaquo; Trước
              </button>
              <span className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg shadow-2xs">
                {safeCurrentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition"
              >
                Sau &rsaquo;
              </button>
              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition"
              >
                Cuối &raquo;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Tiếp Nhận / Chỉnh Sửa Học Viên */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {editingStudentId ? "Chỉnh Sửa Hồ Sơ Học Viên" : "Tiếp Nhận Học Viên & Tạo Tài Khoản Phụ Huynh"}
                </h3>
                <p className="text-xs text-slate-500">Cập nhật thông tin học sinh, phụ huynh và phân lớp</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Họ và tên học sinh *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Đặng Nhật Minh"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Giới tính</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as "Nam" | "Nữ" })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Ngày sinh học sinh</label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h5 className="font-bold text-slate-900 mb-2">Thông tin Phụ huynh (Liên hệ chính)</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Họ tên Phụ huynh *</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Chị Mai Lan"
                      value={formData.parentName}
                      onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Số điện thoại *</label>
                    <input
                      type="tel"
                      required
                      placeholder="VD: 0912 888 999"
                      value={formData.parentPhone}
                      onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <label className="font-semibold text-slate-700 block mb-1">Email phụ huynh</label>
                  <input
                    type="email"
                    placeholder="VD: mailan@gmail.com"
                    value={formData.parentEmail}
                    onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="font-semibold text-slate-700 block mb-1">Xếp vào lớp học</label>
                  <select
                    value={formData.classId}
                    onChange={(e) => {
                      const cId = e.target.value;
                      const cls = classes.find((c) => c.id === cId);
                      setFormData({ 
                        ...formData, 
                        classId: cId,
                        monthlyFee: cls ? (cls.monthlyFee || 1600000) : formData.monthlyFee 
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                  >
                    <option value="">-- Chưa xếp lớp (Tư vấn) --</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Học phí / tháng (VNĐ)</label>
                  <input
                    type="number"
                    step={50000}
                    value={formData.monthlyFee}
                    onChange={(e) => setFormData({ ...formData, monthlyFee: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Học phí tháng này</label>
                  <select
                    value={formData.tuitionStatus}
                    onChange={(e) => setFormData({ ...formData, tuitionStatus: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                  >
                    <option value="PAID">✓ Đã đóng</option>
                    <option value="UNPAID">Chưa đóng</option>
                    <option value="OVERDUE">Quá hạn</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold shadow hover:opacity-95 transition"
                >
                  {editingStudentId ? "Lưu Thay Đổi" : "Lưu & Ghi Danh"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL XÁC NHẬN HỌC SINH ĐÃ NGHỈ HẲN (BẢO LƯU DỮ LIỆU PHỤ HUYNH) */}
      {droppingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-lg">
                🛑
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900">
                  Xác Nhận Học Sinh Nghỉ Học
                </h4>
                <p className="text-xs text-slate-500">
                  Bé: <strong>{droppingStudent.fullName}</strong> ({droppingStudent.className || "Chưa xếp lớp"})
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 leading-relaxed space-y-1">
              <p className="font-bold">✓ Dữ liệu phụ huynh được bảo lưu an toàn 100%:</p>
              <p>• SĐT phụ huynh: <strong>{droppingStudent.parentPhone}</strong> ({droppingStudent.parentName})</p>
              <p>• Học sinh sẽ ngừng tính học phí mới và không xuất hiện trong danh sách điểm danh hàng ngày.</p>
              <p>• Có thể bấm &quot;Học lại&quot; bất kỳ lúc nào nếu bé tiếp tục đăng ký khóa học.</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Ngày chính thức nghỉ:</label>
                <input
                  type="date"
                  value={dropDate}
                  onChange={(e) => setDropDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Lý do nghỉ học:</label>
                <input
                  type="text"
                  value={dropReason}
                  onChange={(e) => setDropReason(e.target.value)}
                  placeholder="VD: Gia đình chuyển nơi cư trú, trùng lịch học trường công..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDroppingStudent(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  setStudentLearningStatus(droppingStudent.id, "DROPPED", dropReason, dropDate);
                  setDroppingStudent(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer"
              >
                🛑 Xác Nhận Đã Nghỉ Hẳn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chỉnh Sửa & Gửi Tin Nhắn Zalo Cá Nhân Cho Phụ Huynh */}
      {editZaloModal && (
        <EditZaloMessageModal
          isOpen={editZaloModal.isOpen}
          onClose={() => setEditZaloModal(null)}
          recipientName={editZaloModal.parentName}
          recipientPhone={editZaloModal.parentPhone}
          studentName={editZaloModal.studentName}
          className={editZaloModal.className}
          initialContent={editZaloModal.initialContent}
          title={editZaloModal.title}
          templateBadge={editZaloModal.templateBadge}
          onSend={handleConfirmSendZalo}
        />
      )}
    </div>
  );
}
