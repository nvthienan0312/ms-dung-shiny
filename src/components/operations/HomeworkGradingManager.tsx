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
import { getMediaBlobUrl } from "@/utils/mediaStorage";
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
  Download,
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

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [gradingSubmissionId, setGradingSubmissionId] = useState<string | null>(null);

  // Grade modal form state
  const [inputFeedback, setInputFeedback] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [resolvedMediaUrl, setResolvedMediaUrl] = useState<string | null>(null);
  const [resolvedWorkbookUrl, setResolvedWorkbookUrl] = useState<string | null>(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState<boolean>(false);

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

  // Tự động nạp Video / Audio / Ảnh bài tập từ URL hoặc IndexedDB khi mở modal
  useEffect(() => {
    let isCancelled = false;
    const createdObjectUrls: string[] = [];

    async function loadSubmissionMedia() {
      if (!activeGradingItem) {
        setResolvedMediaUrl(null);
        setResolvedWorkbookUrl(null);
        setIsLoadingMedia(false);
        return;
      }

      setIsLoadingMedia(true);
      try {
        let nextMediaUrl: string | null =
          activeGradingItem.mediaUrl || activeGradingItem.attachmentFileUrl || null;
        if (!nextMediaUrl && activeGradingItem.mediaStorageKey) {
          const blobUrl = await getMediaBlobUrl(activeGradingItem.mediaStorageKey);
          if (blobUrl) {
            createdObjectUrls.push(blobUrl);
            nextMediaUrl = blobUrl;
          }
        }

        let nextWbUrl: string | null = activeGradingItem.workbookImageUrl || null;
        if (!nextWbUrl && activeGradingItem.workbookStorageKey) {
          const wbBlobUrl = await getMediaBlobUrl(activeGradingItem.workbookStorageKey);
          if (wbBlobUrl) {
            createdObjectUrls.push(wbBlobUrl);
            nextWbUrl = wbBlobUrl;
          }
        }

        if (!isCancelled) {
          setResolvedMediaUrl(nextMediaUrl);
          setResolvedWorkbookUrl(nextWbUrl);
        } else {
          createdObjectUrls.forEach((u) => URL.revokeObjectURL(u));
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingMedia(false);
        }
      }
    }

    loadSubmissionMedia();

    return () => {
      isCancelled = true;
      createdObjectUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [activeGradingItem]);

  const handleOpenGrading = (sub: HomeworkSubmission) => {
    setGradingSubmissionId(sub.id);
    setInputFeedback(sub.taFeedback || "");
  };

  const handleSubmitGrade = () => {
    if (!activeGradingItem) return;

    gradeHomeworkSubmission(
      activeGradingItem.id,
      undefined,
      inputFeedback,
      activeStaff.fullName
    );

    const stu = students.find((s) => s.id === activeGradingItem.studentId);
    const parentPhone = stu?.parentPhone || "";
    const parentName = stu?.parentName || "Phụ huynh";

    setGradingSubmissionId(null);
    setToastMessage(`✓ Đã lưu nhận xét kiểm tra BTVN cho bé ${activeGradingItem.studentName}!`);

    // Mở ngay modal Zalo để Trợ giảng xem trước và bấm gửi nhận xét cho phụ huynh
    const msg = generateHomeworkGradingZaloMessage(
      activeGradingItem.studentName,
      parentName,
      activeStaff.fullName,
      activeGradingItem.assignmentTitle || "Bài tập về nhà",
      undefined,
      inputFeedback
    );

    setEditZaloModal({
      isOpen: true,
      studentName: activeGradingItem.studentName,
      parentName,
      parentPhone,
      className: currentClass.name,
      title: `Báo Kết Quả Kiểm Tra BTVN Zalo: ${activeGradingItem.studentName}`,
      initialContent: msg,
      templateBadge: "Kiểm Tra BTVN",
    });
  };

  // Mở modal gửi Zalo báo kết quả nhận xét cho bài đã kiểm tra trước đó
  const handleOpenZaloGradeModal = (sub: HomeworkSubmission) => {
    const stu = students.find((s) => s.id === sub.studentId);
    const parentPhone = stu?.parentPhone || "";
    const parentName = stu?.parentName || "Phụ huynh";
    const msg = generateHomeworkGradingZaloMessage(
      sub.studentName,
      parentName,
      activeStaff.fullName,
      sub.assignmentTitle || "Bài tập về nhà",
      undefined,
      sub.taFeedback || "Con hoàn thành bài tập đầy đủ, phát âm rõ ràng!"
    );

    setEditZaloModal({
      isOpen: true,
      studentName: sub.studentName,
      parentName,
      parentPhone,
      className: currentClass.name,
      title: `Báo Kết Quả Kiểm Tra BTVN Zalo: ${sub.studentName}`,
      initialContent: msg,
      templateBadge: "Kiểm Tra BTVN",
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
                : `Kiểm Tra BTVN Nộp Online (Trợ Giảng: ${activeStaff.fullName})`}
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
                    {c.name}
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
                            Đã Kiểm Tra
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                            Chờ TA Kiểm Tra
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

                    {/* Nút gửi Zalo báo nhận xét cho bài đã kiểm tra */}
                    {isGraded && (
                      <button
                        type="button"
                        onClick={() => handleOpenZaloGradeModal(sub)}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95"
                        title="Xem trước & gửi nhận xét qua Zalo cho PH"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Báo Zalo</span>
                      </button>
                    )}

                    {/* Trợ Giảng kiểm tra & nhận xét, Giáo viên xem video & chi tiết */}
                    {isAssistant && (
                      <button
                        type="button"
                        onClick={() => handleOpenGrading(sub)}
                        className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs transition flex items-center gap-1 active:scale-95"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>{isGraded ? "Sửa Lời Phê" : "Kiểm Tra Bài Này"}</span>
                      </button>
                    )}

                    {isTeacher && (
                      <button
                        type="button"
                        onClick={() => handleOpenGrading(sub)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold border border-slate-200 flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Xem Bài Nộp</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Lời nhận xét đã kiểm tra */}
                {isGraded && (
                  <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-200 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10.5px]">
                      <span className="font-bold text-emerald-900">
                        Lời phê của {sub.gradedBy}:
                      </span>
                      <span className="font-mono text-emerald-700 font-semibold">
                        ✓ Đã nhận xét
                      </span>
                    </div>
                    <p className="text-slate-700 italic text-[11px] leading-relaxed whitespace-pre-line">
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

            {/* Media Player thật (Video / Audio / Ảnh từ bài nộp của Phụ Huynh) */}
            <div className="space-y-2.5">
              <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold flex items-center gap-1.5 flex-wrap">
                        <span className="truncate">{activeGradingItem.attachmentFileName || activeGradingItem.mediaTitle}</span>
                        {activeGradingItem.attachmentFileSize && (
                          <span className="text-[10px] text-blue-200 bg-blue-800/80 px-1.5 py-0.2 rounded font-mono shrink-0">
                            {activeGradingItem.attachmentFileSize}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {activeGradingItem.submissionType === "BOTH"
                          ? "Phần 1: Video clip phát âm của học sinh"
                          : "Bài nộp đính kèm từ thiết bị của Phụ Huynh"}
                      </div>
                    </div>
                  </div>
                  {resolvedMediaUrl && (
                    <a
                      href={resolvedMediaUrl}
                      download={activeGradingItem.attachmentFileName || activeGradingItem.mediaTitle || "homework_media"}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10.5px] font-bold flex items-center gap-1 shrink-0 border border-slate-700"
                    >
                      <Download className="w-3 h-3" /> Tải tệp
                    </a>
                  )}
                </div>

                {isLoadingMedia ? (
                  <div className="py-6 text-center text-xs text-slate-300 bg-slate-950/60 rounded-xl">
                    Đang tải video / tệp đính kèm...
                  </div>
                ) : resolvedMediaUrl ? (
                  (() => {
                    const fileNameLower = (activeGradingItem.attachmentFileName || activeGradingItem.mediaTitle || "").toLowerCase();
                    const mime = (activeGradingItem.mediaMimeType || "").toLowerCase();
                    const isAudio = mime.startsWith("audio/") || /\.(mp3|m4a|wav|ogg|aac)$/i.test(fileNameLower);
                    const isImage = mime.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(fileNameLower);

                    if (isAudio) {
                      return (
                        <audio controls className="w-full" src={resolvedMediaUrl}>
                          Trình duyệt không hỗ trợ phát audio.
                        </audio>
                      );
                    }
                    if (isImage) {
                      return (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolvedMediaUrl}
                          alt={activeGradingItem.mediaTitle}
                          className="w-full max-h-72 object-contain rounded-xl bg-black"
                        />
                      );
                    }
                    return (
                      <video
                        controls
                        playsInline
                        preload="metadata"
                        src={resolvedMediaUrl}
                        className="w-full max-h-72 rounded-xl bg-black"
                      >
                        Trình duyệt không hỗ trợ phát video trực tiếp.
                      </video>
                    );
                  })()
                ) : (
                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-[11px] text-amber-300">
                    Chưa có tệp video/audio phát trực tiếp cho bài nộp này (hoặc tệp được tải lên từ thiết bị/trình duyệt khác).
                  </div>
                )}
              </div>

              {(activeGradingItem.submissionType === "BOTH" || activeGradingItem.workbookImageFileName || resolvedWorkbookUrl) && (
                <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        📸
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-indigo-950 flex items-center gap-1.5 flex-wrap">
                          <span className="truncate">{activeGradingItem.workbookImageFileName || "BaiTap_Workbook"}</span>
                          {activeGradingItem.workbookFileSize && (
                            <span className="text-[10px] text-indigo-700 bg-white px-1.5 py-0.2 rounded border border-indigo-200 font-mono">
                              {activeGradingItem.workbookFileSize}
                            </span>
                          )}
                        </div>
                        <div className="text-[10.5px] text-indigo-700">
                          Ảnh / Tệp bài tập Sách Workbook / Vở viết
                        </div>
                      </div>
                    </div>
                    {resolvedWorkbookUrl && (
                      <a
                        href={resolvedWorkbookUrl}
                        download={activeGradingItem.workbookImageFileName || "workbook"}
                        className="px-2 py-1 rounded-lg bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10.5px] font-bold flex items-center gap-1 shrink-0"
                      >
                        <Download className="w-3 h-3" /> Tải về
                      </a>
                    )}
                  </div>
                  {resolvedWorkbookUrl &&
                    ((activeGradingItem.workbookMimeType || "").startsWith("image/") ||
                      /\.(jpg|jpeg|png|gif|webp)$/i.test(activeGradingItem.workbookImageFileName || "")) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolvedWorkbookUrl}
                        alt={activeGradingItem.workbookImageFileName || "Workbook"}
                        className="w-full max-h-60 object-contain rounded-lg bg-white border border-indigo-200"
                      />
                    )}
                </div>
              )}
            </div>

            {/* Nhận xét phát âm & bài làm (Chỉ nhận xét, không chấm điểm) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 block">
                Lời phê chi tiết của Trợ Giảng gửi Phụ huynh:
              </label>

              {/* Tiêu chí nhận xét bắt buộc */}
              <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200 text-[11px] text-slate-700 space-y-1">
                <div className="font-bold text-blue-950">
                  Yêu cầu nhận xét đủ 3 tiêu chí sau:
                </div>
                <ul className="space-y-0.5 pl-1 text-slate-700">
                  <li>+ Phát âm chính xác hết hay sai những từ nào?</li>
                  <li>+ Ending sound?</li>
                  <li>+ Truyền cảm/lưu loát/trôi chảy - hay còn vấp nhiều/ lúng túng?</li>
                </ul>
              </div>

              {isAssistant ? (
                <textarea
                  rows={4}
                  value={inputFeedback}
                  onChange={(e) => setInputFeedback(e.target.value)}
                  placeholder={"+ Phát âm: ...\n+ Ending sound: ...\n+ Lưu loát / truyền cảm: ..."}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs leading-relaxed"
                />
              ) : (
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 whitespace-pre-line">
                  {activeGradingItem.taFeedback || "Trợ giảng chưa gửi nhận xét chi tiết."}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setGradingSubmissionId(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {isAssistant ? "Hủy" : "Đóng"}
              </button>

              {isAssistant && (
                <button
                  type="button"
                  onClick={handleSubmitGrade}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 active:scale-95"
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                  <span>Hoàn Tất Kiểm Tra &amp; Báo PH</span>
                </button>
              )}
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
