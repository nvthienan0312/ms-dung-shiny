"use client";

import { useState, useMemo, useEffect } from "react";
import { useCenter } from "@/context/CenterContext";
import { 
  buildClassThemeMap, 
  CLASS_THEMES,
  HomeworkSubmission
} from "@/data/centerData";
import EditZaloMessageModal from "@/components/common/EditZaloMessageModal";
import ZaloBatchQueueModal, { ZaloQueueItem } from "@/components/common/ZaloBatchQueueModal";
import { 
  generateHomeworkGradingZaloMessage, 
  generateHomeworkReminderZaloMessage 
} from "@/utils/zaloHelper";
import { 
  FileCheck, 
  Play, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Video, 
  Mic, 
  FileEdit, 
  UserCheck, 
  GraduationCap, 
  Eye, 
  Send, 
  Sparkles,
  Search,
  MessageSquare,
  Award,
  Bell,
  UserX,
  Phone,
  ShieldCheck
} from "lucide-react";

export interface HomeworkGradingManagerProps {
  userRole?: "ASSISTANT" | "TEACHER" | "ADMIN";
  currentStaffId?: string;
}

export default function HomeworkGradingManager({
  userRole = "ASSISTANT",
  currentStaffId = "",
}: HomeworkGradingManagerProps) {
  const { 
    classes, 
    students, 
    staff, 
    substitutions, 
    homeworkSubmissions, 
    gradeHomeworkSubmission,
    sendZaloMessageToParent 
  } = useCenter();
  const themeMap = useMemo(() => buildClassThemeMap(classes), [classes]);

  const [selectedClassId, setSelectedClassId] = useState<string>("cls-1");
  const [gradingSubmissionId, setGradingSubmissionId] = useState<string | null>(null);

  // Grade modal form state
  const [inputScore, setInputScore] = useState<number>(9.0);
  const [inputFeedback, setInputFeedback] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal chỉnh sửa & gửi Zalo cho 1 phụ huynh (Báo điểm hoặc nhắc bài)
  const [editZaloModal, setEditZaloModal] = useState<{
    isOpen: boolean;
    studentName: string;
    parentName: string;
    parentPhone: string;
    className: string;
    title: string;
    initialContent: string;
    templateBadge?: string;
  } | null>(null);

  // Hàng đợi Zalo gửi đôn đốc bài tập về nhà hàng loạt (giãn cách 2-3 phút)
  const [isZaloQueueOpen, setIsZaloQueueOpen] = useState<boolean>(false);
  const [zaloQueueItems, setZaloQueueItems] = useState<ZaloQueueItem[]>([]);

  // Subtab: Xem tất cả / Đã nộp / Chưa nộp
  const [activeFilterTab, setActiveFilterTab] = useState<"ALL" | "SUBMITTED" | "UNSUBMITTED">("ALL");

  const isTeacher = userRole === "TEACHER";
  const isAssistant = userRole === "ASSISTANT";

  const activeStaff = useMemo(() => {
    return staff.find((s) => s.id === currentStaffId) || staff.find((s) => s.role === userRole) || staff[0] || { id: "", fullName: userRole === "TEACHER" ? "Giáo viên" : "Trợ giảng", phone: "", role: userRole };
  }, [staff, currentStaffId, userRole]);

  // Giáo viên + Trợ giảng kiểm soát lớp mình phụ trách chính. KỂ CẢ CÓ người dạy thay, GV và TA chính vẫn chấm và theo dõi
  const accessibleClasses = useMemo(() => {
    if (userRole === "ADMIN") return classes;
    if (!activeStaff.id) return classes;
    if (userRole === "TEACHER") {
      const myClasses = classes.filter((c) => c.teacherId === activeStaff.id || c.schedules.some((s) => s.teacherId === activeStaff.id));
      return myClasses.length > 0 ? myClasses : classes;
    }
    // userRole === "ASSISTANT"
    const myClasses = classes.filter((c) => c.assistantId === activeStaff.id || c.schedules.some((s) => s.assistantId === activeStaff.id));
    return myClasses.length > 0 ? myClasses : classes;
  }, [classes, userRole, activeStaff]);

  // Tự động chọn lớp đầu tiên trong danh sách phụ trách chính
  useEffect(() => {
    if (accessibleClasses.length > 0 && !accessibleClasses.some((c) => c.id === selectedClassId)) {
      setSelectedClassId(accessibleClasses[0].id);
    }
  }, [accessibleClasses, selectedClassId]);

  const currentClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId) || accessibleClasses[0] || classes[0];
  }, [classes, selectedClassId, accessibleClasses]);

  const classStudents = useMemo(() => {
    if (!currentClass) return [];
    return students.filter((s) => s.classId === currentClass.id);
  }, [students, currentClass]);

  const classSubmissions = useMemo(() => {
    return homeworkSubmissions.filter((s) => s.classId === currentClass?.id);
  }, [homeworkSubmissions, currentClass]);

  // TÍNH TOÁN DANH SÁCH HỌC SINH ĐÃ NỘP & CHƯA NỘP
  const submittedStudentIds = useMemo(() => {
    return new Set(classSubmissions.map((s) => s.studentId));
  }, [classSubmissions]);

  const unsubmittedStudents = useMemo(() => {
    return classStudents.filter((st) => !submittedStudentIds.has(st.id));
  }, [classStudents, submittedStudentIds]);

  const activeGradingItem = useMemo(() => {
    return homeworkSubmissions.find((s) => s.id === gradingSubmissionId);
  }, [homeworkSubmissions, gradingSubmissionId]);

  const handleOpenGrading = (sub: HomeworkSubmission) => {
    setGradingSubmissionId(sub.id);
    setInputScore(sub.score || 9.0);
    setInputFeedback(sub.taFeedback || "Con phát âm to, rõ ràng, ngữ điệu tự nhiên và nhớ từ vựng rất tốt!");
  };

  const handleSubmitGrade = () => {
    if (!activeGradingItem) return;

    gradeHomeworkSubmission(
      activeGradingItem.id,
      inputScore,
      inputFeedback,
      activeStaff.fullName
    );

    const stu = students.find((s) => s.id === activeGradingItem.studentId);
    const parentPhone = stu?.parentPhone || "";
    const parentName = stu?.parentName || "Phụ huynh";

    setGradingSubmissionId(null);
    setToastMessage(`✓ Đã chấm điểm ${inputScore}/10 cho bài nộp của bé ${activeGradingItem.studentName}!`);

    // Mở ngay modal Zalo để Trợ giảng xem trước và bấm gửi báo điểm cho phụ huynh
    const msg = generateHomeworkGradingZaloMessage(
      activeGradingItem.studentName,
      parentName,
      activeStaff.fullName,
      activeGradingItem.assignmentTitle || "Bài tập về nhà Unit 4",
      inputScore,
      inputFeedback
    );

    setEditZaloModal({
      isOpen: true,
      studentName: activeGradingItem.studentName,
      parentName,
      parentPhone,
      className: currentClass.name,
      title: `Báo Điểm BTVN Zalo: ${activeGradingItem.studentName} (${inputScore}/10đ)`,
      initialContent: msg,
      templateBadge: "Báo Điểm BTVN",
    });
  };

  // Mở modal gửi Zalo báo điểm cho bài đã chấm trước đó
  const handleOpenZaloGradeModal = (sub: HomeworkSubmission) => {
    const stu = students.find((s) => s.id === sub.studentId);
    const parentPhone = stu?.parentPhone || "";
    const parentName = stu?.parentName || "Phụ huynh";
    const msg = generateHomeworkGradingZaloMessage(
      sub.studentName,
      parentName,
      activeStaff.fullName,
      sub.assignmentTitle || "Bài tập về nhà Unit 4",
      sub.score || 9.0,
      sub.taFeedback || "Con hoàn thành bài tập đầy đủ, phát âm rõ ràng!"
    );

    setEditZaloModal({
      isOpen: true,
      studentName: sub.studentName,
      parentName,
      parentPhone,
      className: currentClass.name,
      title: `Báo Điểm BTVN Zalo: ${sub.studentName} (${sub.score}/10đ)`,
      initialContent: msg,
      templateBadge: "Báo Điểm BTVN",
    });
  };

  // NHẮC NHỞ NỘP BÀI TẬP VỀ NHÀ (Mở modal Zalo 1-chạm)
  const handleSendReminder = (studentId: string, studentName: string) => {
    const stu = students.find((s) => s.id === studentId);
    const parentPhone = stu?.parentPhone || "";
    const parentName = stu?.parentName || "Phụ huynh";
    const msg = generateHomeworkReminderZaloMessage(
      studentName,
      parentName,
      activeStaff.fullName,
      currentClass.name,
      "Bài tập về nhà Unit 4",
      "22:00 hôm nay"
    );

    setEditZaloModal({
      isOpen: true,
      studentName,
      parentName,
      parentPhone,
      className: currentClass.name,
      title: `Nhắc Nộp BTVN Zalo: ${studentName}`,
      initialContent: msg,
      templateBadge: "Nhắc Nộp BTVN",
    });
  };

  // Bật hàng đợi tự động gửi đôn đốc làm BTVN hàng loạt (giãn cách 2-3 phút chống spam)
  const handleRemindAllUnsubmitted = () => {
    if (unsubmittedStudents.length === 0) {
      setToastMessage("ℹ️ Toàn bộ học sinh đã hoàn thành nộp bài tập!");
      return;
    }

    const items: ZaloQueueItem[] = unsubmittedStudents.map((st) => {
      const msg = generateHomeworkReminderZaloMessage(
        st.fullName,
        st.parentName || "Phụ huynh",
        activeStaff.fullName,
        currentClass.name,
        "Bài tập về nhà Unit 4",
        "22:00 hôm nay"
      );
      return {
        id: `hw-remind-${st.id}-${Date.now()}`,
        studentId: st.id,
        studentName: st.fullName,
        parentName: st.parentName || "Phụ huynh",
        parentPhone: st.parentPhone || "",
        className: currentClass.name,
        messageType: "HOMEWORK_REMINDER",
        title: `Nhắc Nộp BTVN: ${st.fullName}`,
        content: msg,
        isFriended: st.zaloFriendshipStatus !== "NOT_FRIENDED",
        status: "PENDING",
      };
    });

    setZaloQueueItems(items);
    setIsZaloQueueOpen(true);
  };

  // Xác nhận gửi tin nhắn Zalo đã qua chỉnh sửa (Tự động gửi 100%, không cần Ctrl+V)
  const handleConfirmSendZalo = async (editedContent: string) => {
    if (!editZaloModal) return;
    if (editZaloModal.parentPhone) {
      await sendZaloMessageToParent({
        recipientPhone: editZaloModal.parentPhone,
        recipientName: editZaloModal.parentName,
        studentName: editZaloModal.studentName,
        className: editZaloModal.className,
        messageType: "HOMEWORK_REMINDER",
        title: editZaloModal.title,
        content: editedContent,
        senderRole: userRole === "TEACHER" ? "TEACHER" : "ASSISTANT",
        senderName: activeStaff.fullName,
        senderPhone: activeStaff.phone,
        senderStaffId: activeStaff.id,
        openChatWindow: false,
      });
    }
    setToastMessage(`⚡ Đã tự động gửi tin nhắn Zalo tới PH bé ${editZaloModal.studentName} thành công!`);
    setEditZaloModal(null);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const gradedCount = classSubmissions.filter((s) => s.status === "GRADED").length;
  const pendingCount = classSubmissions.filter((s) => s.status === "PENDING_GRADING").length;
  const totalSub = classSubmissions.length;

  if (classes.length === 0 || !currentClass) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
        <FileCheck className="w-10 h-10 text-slate-300 mx-auto" />
        <h4 className="font-bold text-base text-slate-800">Chưa Có Dữ Liệu Lớp Học</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Hiện tại chưa có lớp học nào trong hệ thống. Vui lòng tạo lớp học tại mục Quản lý Lớp học để bắt đầu theo dõi và chấm bài tập về nhà.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
              <FileCheck className="w-5 h-5 text-indigo-600" />
              {isTeacher
                ? "Theo Dõi Tình Trạng Học Sinh Làm & Nộp BTVN (Giáo Viên: Chỉ Xem)"
                : `Chấm Bài Tập Về Nhà Nộp Online (Trợ Giảng: ${activeStaff.fullName})`}
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Lớp:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 text-xs focus:outline-none"
              >
                {accessibleClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
            {userRole !== "ADMIN" && (
              <span className="text-[10.5px] text-slate-500 bg-slate-100 px-2 py-1 rounded-lg flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Lớp phụ trách</span>
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-600">Tiến độ nộp bài:</span>
            <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-800 font-bold font-mono">
              Đã nộp: {totalSub}/{classStudents.length} HS
            </span>
            <span className={`px-2 py-0.5 rounded-lg font-bold font-mono ${unsubmittedStudents.length > 0 ? "bg-rose-50 text-rose-800 border border-rose-200" : "bg-slate-50 text-slate-600"}`}>
              Chưa nộp: {unsubmittedStudents.length} HS
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold font-mono">
              TA đã chấm: {gradedCount} bài
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 font-bold font-mono">
              Chờ TA chấm: {pendingCount} bài
            </span>
          </div>

          {unsubmittedStudents.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handleRemindAllUnsubmitted}
                className="px-3 py-1.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                title="Bật hàng đợi tự động gửi đôn đốc làm BTVN tới toàn bộ phụ huynh chưa nộp bài (giãn cách 2-3 phút)"
              >
                <Bell className="w-3.5 h-3.5 text-white" />
                <span>💬 Bật Hàng Đợi Nhắc Zalo ({unsubmittedStudents.length} PH)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl p-2.5 text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* List of submissions & tracking */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
            <Video className="w-4 h-4 text-blue-600" />
            <span>Bài Tập: {currentClass.name} - Unit 4 (Video/Workbook)</span>
          </div>

          {/* Subtabs: Tất cả / Đã nộp / Chưa nộp */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setActiveFilterTab("ALL")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                activeFilterTab === "ALL"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tất Cả ({classStudents.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterTab("SUBMITTED")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                activeFilterTab === "SUBMITTED"
                  ? "bg-emerald-600 text-white shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Đã Nộp ({classSubmissions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterTab("UNSUBMITTED")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                activeFilterTab === "UNSUBMITTED"
                  ? "bg-rose-600 text-white shadow-2xs font-bold"
                  : "text-rose-700 hover:text-rose-900 font-bold"
              }`}
            >
              Chưa Nộp ({unsubmittedStudents.length})
            </button>
          </div>
        </div>

        {/* DANH SÁCH BÀI ĐÃ NỘP & CHƯA NỘP */}
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
          {/* 1. HIỂN THỊ DANH SÁCH HỌC SINH ĐÃ NỘP (nếu tab ALL hoặc SUBMITTED) */}
          {(activeFilterTab === "ALL" || activeFilterTab === "SUBMITTED") && classSubmissions.map((sub, idx) => {
            const isGraded = sub.status === "GRADED";

            return (
              <div key={sub.id} className="p-3.5 space-y-2 hover:bg-slate-50/50 transition">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-sm text-slate-900 break-words leading-tight flex items-center gap-2">
                        <span>{sub.studentName}</span>
                        {sub.submissionType === "BOTH" && (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                            🌟 Cả Video & Sách
                          </span>
                        )}
                        {isGraded ? (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Đã Chấm: {sub.score}/10
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                            Chờ TA Chấm
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        Mã: {sub.studentCode} • Nộp lúc: {new Date(sub.submittedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>

                  {/* Media File & Action */}
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-xl text-xs text-slate-700 font-mono">
                      <Play className="w-3 h-3 text-blue-600 fill-blue-600" />
                      <span className="text-[11px] font-medium">{sub.mediaTitle}</span>
                      {sub.mediaDuration && (
                        <span className="text-[10px] text-slate-400 font-bold">({sub.mediaDuration})</span>
                      )}
                    </div>

                    {/* Nút gửi Zalo báo điểm cho bài đã chấm */}
                    {isGraded && (
                      <button
                        type="button"
                        onClick={() => handleOpenZaloGradeModal(sub)}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95"
                        title="Xem trước & gửi thông báo điểm qua Zalo cho PH"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Báo Zalo</span>
                      </button>
                    )}

                    {/* Trợ Giảng mới có quyền chấm điểm, Giáo viên chỉ xem */}
                    {isAssistant && (
                      <button
                        type="button"
                        onClick={() => handleOpenGrading(sub)}
                        className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs transition flex items-center gap-1 active:scale-95"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>{isGraded ? "Sửa Điểm & Lời Phê" : "Chấm Bài Này"}</span>
                      </button>
                    )}

                    {isTeacher && (
                      <button
                        type="button"
                        onClick={() => alert(`Xem chi tiết bài nộp của bé ${sub.studentName}:\nFile: ${sub.mediaTitle}\nĐiểm: ${sub.score || "Chờ TA chấm"}\nLời phê: ${sub.taFeedback || "Chưa có"}`)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold border border-slate-200 flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Xem Bài Nộp</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Lời nhận xét đã chấm */}
                {isGraded && (
                  <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-200 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10.5px]">
                      <span className="font-bold text-emerald-900">
                        Lời phê của {sub.gradedBy}:
                      </span>
                      <span className="font-mono text-emerald-800 font-bold">
                        Điểm: {sub.score}/10
                      </span>
                    </div>
                    <p className="text-slate-700 italic text-[11px] leading-relaxed">
                      &ldquo;{sub.taFeedback}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {/* 2. HIỂN THỊ DANH SÁCH HỌC SINH CHƯA NỘP (nếu tab ALL hoặc UNSUBMITTED) */}
          {(activeFilterTab === "ALL" || activeFilterTab === "UNSUBMITTED") && unsubmittedStudents.map((st, idx) => {
            return (
              <div key={st.id} className="p-3.5 space-y-2 bg-rose-50/20 hover:bg-rose-50/40 transition">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                      {classSubmissions.length + idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-sm text-slate-900 break-words leading-tight flex items-center gap-2">
                        <span>{st.fullName}</span>
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          Chưa Nộp Bài
                        </span>
                      </div>
                      <div className="text-[10.5px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span className="font-mono">Mã: {st.studentCode}</span>
                        <span>•</span>
                        <span>PH: {st.parentName}</span>
                        <span>•</span>
                        <span className="font-mono flex items-center gap-0.5">
                          <Phone className="w-3 h-3 text-slate-400" /> {st.parentPhone}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Nút nhắc nhở nộp bài */}
                  <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSendReminder(st.id, st.fullName)}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-300 rounded-xl text-xs font-bold shadow-2xs transition flex items-center gap-1 active:scale-95"
                      title="Mở tin nhắn Zalo nhắc nộp BTVN cho PH"
                    >
                      <Bell className="w-3.5 h-3.5 text-rose-600" />
                      <span>Nhắc Zalo</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* THÔNG BÁO NẾU RỖNG */}
          {activeFilterTab === "SUBMITTED" && classSubmissions.length === 0 && (
            <div className="p-6 text-center text-slate-400 text-xs">
              Chưa có học sinh nào nộp bài tập này.
            </div>
          )}
          {activeFilterTab === "UNSUBMITTED" && unsubmittedStudents.length === 0 && (
            <div className="p-6 text-center text-emerald-600 text-xs font-bold flex flex-col items-center gap-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Tuyệt vời! 100% học sinh trong lớp đã hoàn thành nộp bài tập.</span>
            </div>
          )}
          {classStudents.length === 0 && (
            <div className="p-6 text-center text-slate-400 text-xs">
              Lớp chưa có học viên nào.
            </div>
          )}
        </div>
      </div>

      {/* MODAL CHẤM BÀI DÀNH CHO TRỢ GIẢNG */}
      {activeGradingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-4 sm:p-5 space-y-3.5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between pb-2.5 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900">
                  Trợ Giảng Chấm Bài Tập Về Nhà Online
                </span>
                <h4 className="font-bold text-base text-slate-900 mt-1">
                  {activeGradingItem.studentName} ({activeGradingItem.studentCode})
                </h4>
                <p className="text-xs text-slate-500">
                  File nộp: <strong className="font-mono">{activeGradingItem.mediaTitle}</strong> ({activeGradingItem.mediaDuration})
                </p>
              </div>

              <button
                type="button"
                onClick={() => setGradingSubmissionId(null)}
                className="text-slate-400 hover:text-slate-600 p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Media Player simulation */}
            <div className="space-y-2">
              <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5 flex-wrap">
                      <span>{activeGradingItem.mediaTitle}</span>
                      {activeGradingItem.attachmentFileSize && (
                        <span className="text-[10px] text-blue-200 bg-blue-800/80 px-1.5 py-0.2 rounded font-mono">
                          {activeGradingItem.attachmentFileSize}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {activeGradingItem.submissionType === "BOTH" ? "Phần 1: Video clip phát âm của học sinh (đính kèm từ thiết bị)" : "Đang phát audio / video của học sinh (đính kèm từ thiết bị)..."}
                    </div>
                  </div>
                </div>
                {activeGradingItem.mediaDuration && (
                  <span className="text-xs font-mono font-bold text-amber-400">{activeGradingItem.mediaDuration}</span>
                )}
              </div>

              {(activeGradingItem.submissionType === "BOTH" || activeGradingItem.workbookImageFileName) && (
                <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                      📸
                    </div>
                    <div>
                      <div className="text-xs font-bold text-indigo-950 flex items-center gap-1.5 flex-wrap">
                        <span>{activeGradingItem.workbookImageFileName || "Workbook_BaiTap_Trang34-35.jpg"}</span>
                        {activeGradingItem.workbookFileSize && (
                          <span className="text-[10px] text-indigo-700 bg-white px-1.5 py-0.2 rounded border border-indigo-200 font-mono">
                            {activeGradingItem.workbookFileSize}
                          </span>
                        )}
                      </div>
                      <div className="text-[10.5px] text-indigo-700">
                        Phần 2: Ảnh chụp các trang bài tập Workbook / Vở viết
                      </div>
                    </div>
                  </div>
                  <span className="text-[10.5px] font-bold text-indigo-800 bg-white px-2 py-1 rounded-md border border-indigo-200 shadow-2xs">
                    ✓ Đã nhận ảnh sách
                  </span>
                </div>
              )}
            </div>

            {/* Chấm điểm */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                Cho điểm bài tập (Thang điểm 10):
              </label>
              <div className="flex items-center gap-2">
                {[8.0, 8.5, 9.0, 9.5, 10.0].map((sc) => (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => setInputScore(sc)}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition ${
                      inputScore === sc
                        ? "bg-amber-500 text-slate-950 shadow-xs ring-2 ring-amber-400"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    {sc}
                  </button>
                ))}
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="10"
                  value={inputScore}
                  onChange={(e) => setInputScore(parseFloat(e.target.value) || 0)}
                  className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-center font-mono font-bold text-xs"
                />
              </div>
            </div>

            {/* Nhận xét phát âm & bài làm */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                Lời phê chi tiết của Trợ Giảng gửi Phụ huynh:
              </label>
              <textarea
                rows={3}
                value={inputFeedback}
                onChange={(e) => setInputFeedback(e.target.value)}
                placeholder={
                  activeGradingItem.submissionType === "BOTH"
                    ? "1. Phần phát âm: Con phát âm âm /θ/ rất chuẩn, ngữ điệu tự nhiên...\n2. Phần bài tập sách: Con làm đúng 10/10 câu trang 34-35 sạch đẹp!"
                    : "Nhận xét cụ thể về phát âm, độ trôi chảy và mức độ hoàn thành bài..."
                }
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs leading-relaxed"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setGradingSubmissionId(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleSubmitGrade}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 active:scale-95"
              >
                <Send className="w-3.5 h-3.5 text-white" />
                <span>Hoàn Tất Chấm & Báo PH</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chỉnh Sửa & Gửi Zalo Cá Nhân (Báo Điểm / Nhắc Nộp Bài) */}
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

      {/* Modal Hàng Đợi Gửi Zalo Hàng Loạt Tự Động Giãn Cách 2-3 Phút Chống Spam */}
      <ZaloBatchQueueModal
        isOpen={isZaloQueueOpen}
        onClose={() => setIsZaloQueueOpen(false)}
        title={`Hàng Đợi Nhắc Zalo BTVN Lớp ${currentClass.name}`}
        initialItems={zaloQueueItems}
        onAllCompleted={(count) => {
          setToastMessage(`✓ Đã hoàn tất phiên gửi hàng đợi Zalo nhắc BTVN cho ${count} phụ huynh lớp ${currentClass.name}!`);
        }}
        senderRole={userRole === "ASSISTANT" ? "ASSISTANT" : "TEACHER"}
        senderName={activeStaff.fullName}
        senderPhone={activeStaff.phone}
      />
    </div>
  );
}
