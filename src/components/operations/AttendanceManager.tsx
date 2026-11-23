"use client";

import { useState, useMemo, useEffect } from "react";
import { useCenter } from "@/context/CenterContext";
import { 
  AttendanceStatus, 
  AttendanceRecord, 
  ClassItem, 
  ScheduleSlot, 
  MakeupClass,
  buildClassThemeMap, 
  CLASS_THEMES 
} from "@/data/centerData";
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Zap, 
  Calendar, 
  DoorOpen, 
  GraduationCap, 
  UserCheck, 
  Smartphone, 
  Monitor, 
  RotateCcw, 
  Save, 
  AlertTriangle, 
  Sparkles,
  Users,
  Search,
  MessageSquare,
  Check,
  Eye,
  ShieldAlert,
  Flame,
  CheckCheck,
  BookOpen,
  Send,
  X,
  AlertCircle
} from "lucide-react";
import { getTodayDateString } from "@/utils/dateHelper";
import EditZaloMessageModal from "@/components/common/EditZaloMessageModal";
import { 
  generateAttendanceAbsentZaloMessage, 
  generateAttendanceGroupReportZaloMessage,
  copyToClipboardAndOpenZalo 
} from "@/utils/zaloHelper";

export interface AttendanceManagerProps {
  userRole?: "ASSISTANT" | "ADMIN" | "TEACHER";
  currentStaffId?: string; // id của TA (mặc định "staff-ta1" - Thầy Minh Đức) hoặc GV ("staff-t1" - Cô Sarah)
}

interface AttendanceFormEntry {
  studentId: string;
  studentName: string;
  studentCode: string;
  remainingLessons?: number;
  tuitionStatus?: "PAID" | "UNPAID" | "OVERDUE";
  status: AttendanceStatus | null; // null: chưa chọn
  lateMinutes?: number;
  note?: string;
  markedAt?: string;
  markedBy?: string;
}

interface MakeupAttendanceEntry {
  studentId: string;
  studentName: string;
  studentCode: string;
  originalClassName: string;
  absentDateStr: string;
  parentPhone: string;
  parentName: string;
  status: "ATTENDED" | "ABSENT" | "REGISTERED";
  exchangeNote?: string;
}

export interface UnifiedSessionQueueItem {
  id: string; // classId hoặc mc.id
  type: "REGULAR" | "MAKEUP";
  title: string;
  code?: string;
  classItem?: ClassItem;
  makeupClass?: MakeupClass;
  startTime: string;
  endTime: string;
  roomName: string;
  teacherName: string;
  assistantName: string;
  sessionStatus: "URGENT_NOW" | "OVERDUE" | "UPCOMING" | "COMPLETED";
  statusLabel: string;
  badgeClass: string;
  attendancePercent: number;
  markedCount: number;
  totalStudents: number;
}

function getDayOfWeekFromDate(dateStr: string): number {
  const d = new Date(dateStr);
  const jsDay = d.getDay();
  return jsDay === 0 ? 8 : jsDay + 1; // 2: Thứ 2, 3: Thứ 3, ..., 8: Chủ Nhật
}

export default function AttendanceManager({
  userRole = "ASSISTANT",
  currentStaffId = "staff-ta1",
}: AttendanceManagerProps) {
  const { 
    classes, 
    students, 
    staff, 
    substitutions, 
    attendance, 
    saveAttendance,
    makeupClasses,
    updateMakeupClassAttendance,
    sendMakeupContentToParents,
    sendZaloMessageToParent,
    sendZaloClassGroupMessage,
    renderZaloTemplate,
  } = useCenter();

  const isReadOnly = userRole !== "ASSISTANT";

  // BẢN ĐỒ MÀU SẮC LỚP HỌC
  const themeMap = useMemo(() => buildClassThemeMap(classes), [classes]);

  // Selected date reference (Tracking thời gian thực)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => getTodayDateString());

  // Tùy chọn Tự động gửi báo cáo điểm danh vào nhóm Zalo lớp ngay sau khi lưu
  const [autoSendZaloGroup, setAutoSendZaloGroup] = useState<boolean>(true);

  // Modal Chỉnh Sửa / Xem Trước Báo Cáo Điểm Danh Nhóm Zalo Lớp
  const [groupZaloModal, setGroupZaloModal] = useState<{
    isOpen: boolean;
    className: string;
    initialGroupUrl: string;
    initialGroupId: string;
    initialContent: string;
  } | null>(null);

  const [isSendingGroupZalo, setIsSendingGroupZalo] = useState<boolean>(false);

  // Modal Chỉnh Sửa Tin Nhắn Zalo Báo Vắng Cho Phụ Huynh
  const [editZaloModal, setEditZaloModal] = useState<{
    isOpen: boolean;
    studentName: string;
    parentName: string;
    parentPhone: string;
    className: string;
    initialContent: string;
  } | null>(null);

  // Selected session ID (classId hoặc makeupClassId)
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");

  // Mobile simulator frame toggle
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(false);

  // Search query & filter
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PRESENT" | "ABSENT" | "PENDING">("ALL");

  // Local working state cho lớp chính khóa
  const [formEntries, setFormEntries] = useState<AttendanceFormEntry[]>([]);
  
  // Local working state cho lớp học bù
  const [makeupEntries, setMakeupEntries] = useState<MakeupAttendanceEntry[]>([]);
  
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Expanded student drawer for note
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  // Modal gửi nội dung bài học bù cho Phụ Huynh (Trợ giảng thực hiện)
  const [isMakeupContentModalOpen, setIsMakeupContentModalOpen] = useState<boolean>(false);
  const [makeupLessonContent, setMakeupLessonContent] = useState<string>("");
  const [makeupHomework, setMakeupHomework] = useState<string>("");
  const [makeupAssistantFeedback, setMakeupAssistantFeedback] = useState<string>("");

  // Day of week based on selected date
  const dayOfWeek = useMemo(() => getDayOfWeekFromDate(selectedDateStr), [selectedDateStr]);

  // Current logged in staff details
  const activeStaff = useMemo(() => {
    return staff.find((s) => s.id === currentStaffId) || staff.find((s) => s.role === userRole) || staff[0] || { id: "", fullName: userRole === "TEACHER" ? "Giáo viên" : (userRole === "ASSISTANT" ? "Trợ giảng" : "Quản trị viên"), role: userRole };
  }, [staff, currentStaffId, userRole]);

  // 1. FILTER REGULAR CLASSES BY USER ROLE & TODAY'S SCHEDULE
  const relevantClasses = useMemo(() => {
    if (userRole === "ADMIN") {
      return classes;
    }
    if (userRole === "TEACHER") {
      if (!activeStaff.id) return classes;
      return classes.filter((cls) => {
        const sub = substitutions.find((s) => s.classId === cls.id && s.dateStr === selectedDateStr);
        if (sub?.subTeacherId) {
          return sub.subTeacherId === activeStaff.id;
        }
        const todaySlot = cls.schedules.find((sch) => sch.dayOfWeek === dayOfWeek);
        const slotTeacherId = todaySlot?.teacherId || cls.teacherId;
        return slotTeacherId === activeStaff.id;
      });
    }
    // userRole === "ASSISTANT"
    if (!activeStaff.id) return classes;
    return classes.filter((cls) => {
      const sub = substitutions.find((s) => s.classId === cls.id && s.dateStr === selectedDateStr);
      if (sub?.subAssistantId) {
        return sub.subAssistantId === activeStaff.id;
      }
      const todaySlot = cls.schedules.find((sch) => sch.dayOfWeek === dayOfWeek);
      const slotAssistantId = todaySlot?.assistantId || cls.assistantId;
      return slotAssistantId === activeStaff.id;
    });
  }, [classes, userRole, activeStaff, substitutions, selectedDateStr, dayOfWeek]);

  // 2. FILTER MAKEUP CLASSES (LỚP HỌC BÙ) TRONG NGÀY HOẶC THEO PHÂN CÔNG
  const relevantMakeupClasses = useMemo(() => {
    return makeupClasses.filter((mc) => {
      const isDateMatch = mc.dateStr === selectedDateStr;
      if (!isDateMatch) return false;

      if (userRole === "ADMIN") return true;
      if (userRole === "TEACHER") {
        return mc.teacherOrAssistantId === activeStaff.id;
      }
      // userRole === "ASSISTANT"
      return mc.teacherOrAssistantId === activeStaff.id || mc.roleInCharge === "ASSISTANT";
    });
  }, [makeupClasses, selectedDateStr, userRole, activeStaff]);

  // 3. UNIFIED QUEUE: TỔNG HỢP CẢ CA HỌC CHÍNH KHÓA & LỚP HỌC BÙ TRONG NGÀY
  const todaySessionsQueue = useMemo<UnifiedSessionQueueItem[]>(() => {
    const queue: UnifiedSessionQueueItem[] = [];

    // A. Thêm các ca chính khóa
    relevantClasses.forEach((cls) => {
      const matchingSchedule = cls.schedules.find((sch) => sch.dayOfWeek === dayOfWeek);
      if (!matchingSchedule) return;

      const sessionAtt = attendance.filter(
        (a) => a.classId === cls.id && a.dateStr === selectedDateStr
      );
      const clsStudents = students.filter((s) => s.classId === cls.id);
      const totalStudents = clsStudents.length;
      const markedCount = sessionAtt.length;
      const isFullMarked = totalStudents > 0 && markedCount >= totalStudents;
      const attPercent = totalStudents > 0 ? Math.round((markedCount / totalStudents) * 100) : 0;

      let sessionStatus: "URGENT_NOW" | "OVERDUE" | "UPCOMING" | "COMPLETED" = "UPCOMING";
      let statusLabel = "Chưa điểm danh";
      let badgeClass = "bg-slate-100 text-slate-700 border-slate-200";

      if (isFullMarked) {
        sessionStatus = "COMPLETED";
        statusLabel = `Đã xong (${markedCount}/${totalStudents})`;
        badgeClass = "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold";
      } else if (markedCount > 0) {
        sessionStatus = "URGENT_NOW";
        statusLabel = `Đang điểm (${markedCount}/${totalStudents})`;
        badgeClass = "bg-amber-100 text-amber-900 border-amber-300 font-bold";
      } else {
        sessionStatus = "UPCOMING";
        statusLabel = `${matchingSchedule.startTime} - ${matchingSchedule.endTime}`;
        badgeClass = "bg-sky-50 text-sky-800 border-sky-200";
      }

      queue.push({
        id: cls.id,
        type: "REGULAR",
        title: cls.name,
        code: cls.code,
        classItem: cls,
        startTime: matchingSchedule.startTime,
        endTime: matchingSchedule.endTime,
        roomName: matchingSchedule.classroom || cls.classroom,
        teacherName: substitutions.find((s) => s.classId === cls.id && s.dateStr === selectedDateStr)?.subTeacherName || matchingSchedule.teacherName || cls.teacherName,
        assistantName: substitutions.find((s) => s.classId === cls.id && s.dateStr === selectedDateStr)?.subAssistantName || matchingSchedule.assistantName || cls.assistantName,
        sessionStatus,
        statusLabel,
        badgeClass,
        attendancePercent: attPercent,
        markedCount,
        totalStudents,
      });
    });

    // B. Thêm các ca học bù (Makeup Classes) trong ngày
    relevantMakeupClasses.forEach((mc) => {
      const totalStudents = mc.students.length;
      const markedCount = mc.students.filter(
        (st) => st.attendanceStatus === "ATTENDED" || st.attendanceStatus === "ABSENT"
      ).length;
      const isFullMarked = totalStudents > 0 && markedCount >= totalStudents;
      const attPercent = totalStudents > 0 ? Math.round((markedCount / totalStudents) * 100) : 0;

      let sessionStatus: "URGENT_NOW" | "OVERDUE" | "UPCOMING" | "COMPLETED" = "UPCOMING";
      let statusLabel = "Chưa điểm bù";
      let badgeClass = "bg-purple-100 text-purple-900 border-purple-300 font-bold";

      if (isFullMarked) {
        sessionStatus = "COMPLETED";
        statusLabel = `Đã điểm bù (${markedCount}/${totalStudents})`;
        badgeClass = "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold";
      } else if (markedCount > 0) {
        sessionStatus = "URGENT_NOW";
        statusLabel = `Đang điểm bù (${markedCount}/${totalStudents})`;
        badgeClass = "bg-amber-100 text-amber-900 border-amber-300 font-bold";
      } else {
        sessionStatus = "UPCOMING";
        statusLabel = `${mc.startTime} - ${mc.endTime}`;
        badgeClass = "bg-purple-50 text-purple-800 border-purple-200";
      }

      queue.push({
        id: mc.id,
        type: "MAKEUP",
        title: mc.title,
        code: "LỚP BÙ",
        makeupClass: mc,
        startTime: mc.startTime,
        endTime: mc.endTime,
        roomName: mc.classroomName,
        teacherName: mc.roleInCharge === "TEACHER" ? mc.teacherOrAssistantName : "—",
        assistantName: mc.roleInCharge === "ASSISTANT" ? mc.teacherOrAssistantName : "—",
        sessionStatus,
        statusLabel,
        badgeClass,
        attendancePercent: attPercent,
        markedCount,
        totalStudents,
      });
    });

    queue.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return queue;
  }, [relevantClasses, relevantMakeupClasses, dayOfWeek, selectedDateStr, attendance, students, substitutions]);

  // 4. AUTO-SELECT CA HỌC CẦN ĐIỂM DANH
  useEffect(() => {
    if (todaySessionsQueue.length > 0) {
      const isCurrentInQueue = todaySessionsQueue.some((q) => q.id === selectedSessionId);
      if (!isCurrentInQueue || !selectedSessionId) {
        setSelectedSessionId(todaySessionsQueue[0].id);
      }
    } else if (relevantClasses.length > 0 && !selectedSessionId) {
      setSelectedSessionId(relevantClasses[0].id);
    }
  }, [todaySessionsQueue, relevantClasses, selectedSessionId]);

  // Ca học đang được chọn
  const activeSessionItem = useMemo(() => {
    return todaySessionsQueue.find((q) => q.id === selectedSessionId) || todaySessionsQueue[0];
  }, [todaySessionsQueue, selectedSessionId]);

  const isMakeupSession = activeSessionItem?.type === "MAKEUP";
  const activeMakeupClass = activeSessionItem?.makeupClass;

  // Thông tin lớp chính khóa đang chọn (nếu là Regular)
  const currentClass = useMemo(() => {
    if (isMakeupSession) return undefined;
    return classes.find((c) => c.id === selectedSessionId) || relevantClasses[0] || classes[0];
  }, [classes, selectedSessionId, relevantClasses, isMakeupSession]);

  // Thông tin dạy thay nếu có cho ca chính khóa
  const currentSubstitution = useMemo(() => {
    if (!currentClass) return undefined;
    return substitutions.find(
      (s) => s.classId === currentClass.id && s.dateStr === selectedDateStr
    );
  }, [substitutions, currentClass, selectedDateStr]);

  const effectiveTeacher = currentSubstitution?.subTeacherName || currentClass?.teacherName || "Giáo viên";
  const effectiveAssistant = currentSubstitution?.subAssistantName || currentClass?.assistantName || "Trợ giảng";

  // Danh sách học sinh thuộc lớp chính khóa (Tự động loại trừ học sinh đã nghỉ hẳn)
  const classStudents = useMemo(() => {
    if (!currentClass) return [];
    return students.filter((s) => s.classId === currentClass.id && s.learningStatus !== "DROPPED");
  }, [students, currentClass]);

  // ĐỒNG BỘ DỮ LIỆU ĐIỂM DANH: LỚP CHÍNH KHÓA
  useEffect(() => {
    if (isMakeupSession || !currentClass) return;

    const existingRecords = attendance.filter(
      (a) => a.classId === currentClass.id && a.dateStr === selectedDateStr
    );
    const existingMap = new Map<string, AttendanceRecord>();
    existingRecords.forEach((r) => existingMap.set(r.studentId, r));

    const initialEntries: AttendanceFormEntry[] = classStudents.map((st) => {
      const existing = existingMap.get(st.id);
      return {
        studentId: st.id,
        studentName: st.fullName,
        studentCode: st.studentCode,
        remainingLessons: st.remainingLessons || 0,
        tuitionStatus: st.tuitionStatus || "PAID",
        status: existing ? existing.status : null,
        lateMinutes: existing?.lateMinutes || 10,
        note: existing?.note || "",
        markedAt: existing?.markedAt,
        markedBy: existing?.markedBy,
      };
    });

    setFormEntries(initialEntries);
    setSaveSuccessMessage(null);
    setExpandedStudentId(null);
  }, [currentClass, selectedDateStr, classStudents, attendance, isMakeupSession]);

  // ĐỒNG BỘ DỮ LIỆU ĐIỂM DANH: LỚP HỌC BÙ
  useEffect(() => {
    if (!isMakeupSession || !activeMakeupClass) return;

    const entries: MakeupAttendanceEntry[] = (activeMakeupClass.students || []).map((st) => ({
      studentId: st.studentId,
      studentName: st.studentName,
      studentCode: st.studentCode,
      originalClassName: st.originalClassName,
      absentDateStr: st.absentDateStr,
      parentPhone: st.parentPhone,
      parentName: st.parentName,
      status: st.attendanceStatus || "REGISTERED",
      exchangeNote: st.exchangeNote,
    }));

    setMakeupEntries(entries);
    setSaveSuccessMessage(null);
    setMakeupLessonContent(activeMakeupClass.lessonContent || "");
    setMakeupHomework(activeMakeupClass.homework || "");
    setMakeupAssistantFeedback(activeMakeupClass.assistantFeedback || "");
  }, [isMakeupSession, activeMakeupClass]);

  // ==============================================================
  // THỐNG KÊ SĨ SỐ CA HỌC
  // ==============================================================
  const totalCount = isMakeupSession ? makeupEntries.length : formEntries.length;
  
  const presentCount = isMakeupSession
    ? makeupEntries.filter((e) => e.status === "ATTENDED").length
    : formEntries.filter((e) => e.status === "PRESENT").length;

  const absentCount = isMakeupSession
    ? makeupEntries.filter((e) => e.status === "ABSENT").length
    : formEntries.filter((e) => e.status === "ABSENT").length;

  const pendingCount = isMakeupSession
    ? makeupEntries.filter((e) => e.status === "REGISTERED").length
    : formEntries.filter((e) => e.status === null).length;

  const markedCount = totalCount - pendingCount;
  const progressPercent = totalCount > 0 ? Math.round((markedCount / totalCount) * 100) : 0;

  // ==============================================================
  // THAO TÁC ĐIỂM DANH
  // ==============================================================
  const handleMarkAllPresent = () => {
    if (isReadOnly) return;
    if (isMakeupSession) {
      setMakeupEntries((prev) =>
        prev.map((e) => ({ ...e, status: "ATTENDED" }))
      );
    } else {
      setFormEntries((prev) =>
        prev.map((entry) => ({ ...entry, status: "PRESENT" }))
      );
    }
  };

  const handleReset = () => {
    if (isReadOnly) return;
    if (isMakeupSession) {
      setMakeupEntries((prev) =>
        prev.map((e) => ({ ...e, status: "REGISTERED" }))
      );
    } else {
      setFormEntries((prev) =>
        prev.map((entry) => ({ ...entry, status: null, note: "" }))
      );
    }
    setSaveSuccessMessage(null);
  };

  const handleSetStatus = (studentId: string, status: AttendanceStatus) => {
    if (isReadOnly) return;
    setFormEntries((prev) =>
      prev.map((entry) => (entry.studentId === studentId ? { ...entry, status } : entry))
    );
    if (status === "ABSENT") {
      setExpandedStudentId(studentId);
    } else {
      setExpandedStudentId(null);
    }
  };

  const handleSetNote = (studentId: string, note: string) => {
    if (isReadOnly) return;
    setFormEntries((prev) =>
      prev.map((entry) => (entry.studentId === studentId ? { ...entry, note } : entry))
    );
  };

  const handleSetMakeupStatus = (studentId: string, status: "ATTENDED" | "ABSENT") => {
    if (isReadOnly) return;
    setMakeupEntries((prev) =>
      prev.map((e) => (e.studentId === studentId ? { ...e, status } : e))
    );
  };

  // Mở modal cho phép Trợ giảng / Giáo viên xem & chỉnh sửa tin nhắn Zalo báo vắng
  const handleOpenAbsentZalo = (studentId: string, studentName: string) => {
    const studentInfo = students.find((s) => s.id === studentId);
    const parentPhone = studentInfo?.parentPhone || "";
    const parentName = studentInfo?.parentName || "Phụ huynh";
    let content: string;
    try {
      content = renderZaloTemplate("attendanceAbsent", {
        studentName,
        parentName,
        className: currentClass?.name || "Lớp học",
        dateStr: selectedDateStr,
        assistantName: effectiveAssistant || "Trợ giảng lớp",
        centerHotline: "0964.645.174",
      });
    } catch {
      content = generateAttendanceAbsentZaloMessage({
        studentName,
        parentName,
        className: currentClass?.name || "Lớp học",
        dateStr: selectedDateStr,
        assistantName: effectiveAssistant,
      });
    }
    setEditZaloModal({
      isOpen: true,
      studentName,
      parentName,
      parentPhone,
      className: currentClass?.name || "Lớp học",
      initialContent: content,
    });
  };

  // Xác nhận gửi tin báo vắng Zalo đã qua chỉnh sửa (Tự động gửi 100%, không cần Ctrl+V)
  const handleConfirmSendAbsentZalo = async (editedContent: string) => {
    if (!editZaloModal) return;
    if (editZaloModal.parentPhone) {
      await sendZaloMessageToParent({
        recipientPhone: editZaloModal.parentPhone,
        recipientName: editZaloModal.parentName,
        studentName: editZaloModal.studentName,
        className: editZaloModal.className,
        messageType: "ATTENDANCE",
        title: `Báo Vắng Buổi Học: ${editZaloModal.studentName}`,
        content: editedContent,
        openChatWindow: false,
        senderRole: (userRole as any) || "ASSISTANT",
        senderStaffId: currentStaffId || activeStaff.id,
        senderName: activeStaff.fullName,
        senderPhone: activeStaff.phone,
      });
    }
    setSaveSuccessMessage(`⚡ Đã tự động gửi tin nhắn báo vắng tới PH bé ${editZaloModal.studentName} qua Zalo thành công!`);
    setTimeout(() => setSaveSuccessMessage(null), 4500);
    setEditZaloModal(null);
  };

  // Sinh nội dung báo cáo điểm danh gửi nhóm Zalo lớp
  const buildAttendanceGroupReportContent = () => {
    if (!currentClass) return "";
    const presentList = formEntries.filter((e) => e.status === "PRESENT");
    const absentList = formEntries.filter((e) => e.status === "ABSENT");

    let formattedDate = selectedDateStr;
    try {
      const parts = selectedDateStr.split("-");
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
        formattedDate = `${days[d.getDay()]}, ngày ${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    } catch (_e) {}

    const absentCount = absentList.length;
    const totalStudents = formEntries.length;
    const attendanceRate = totalStudents > 0 ? Math.round((presentList.length / totalStudents) * 100) : 0;

    let absentSection = "";
    if (absentCount === 0) {
      absentSection = `🎉 TÌNH HÌNH VẮNG: Không có học sinh vắng (100% các con đi học đầy đủ và đúng giờ! ❤️)`;
    } else {
      const listNames = absentList
        .map((st, idx) => `  ${idx + 1}. ${st.studentName}${st.note ? ` (Lý do: ${st.note})` : ""}`)
        .join("\n");
      absentSection = `❌ DANH SÁCH HỌC SINH VẮNG (${absentCount} con):\n${listNames}\n\n💡 Ghi chú: Các con vắng buổi hôm nay trung tâm sẽ bảo lưu bài giảng, gửi tài liệu ôn tập và sắp xếp lịch học bù trong tháng để đảm bảo kiến thức.`;
    }

    try {
      return renderZaloTemplate("attendanceGroupReport", {
        className: currentClass.name,
        dateStr: formattedDate,
        timeSlot: `${activeSessionItem?.startTime || "17:30"} - ${activeSessionItem?.endTime || "19:00"}`,
        roomName: activeSessionItem?.roomName || currentClass.classroom || "Phòng học",
        teacherName: effectiveTeacher || "Giáo viên phụ trách",
        assistantName: effectiveAssistant || "Trợ giảng lớp",
        totalStudents: String(totalStudents),
        presentCount: String(presentList.length),
        presentPercent: String(attendanceRate),
        absentCount: String(absentCount),
        absentListSection: absentSection,
        hotline: "0964 645 174",
      });
    } catch {
      return generateAttendanceGroupReportZaloMessage({
        className: currentClass.name,
        classCode: currentClass.code,
        dateStr: selectedDateStr,
        startTime: activeSessionItem?.startTime || "17:30",
        endTime: activeSessionItem?.endTime || "19:00",
        classroomName: activeSessionItem?.roomName || currentClass.classroom,
        teacherName: effectiveTeacher,
        assistantName: effectiveAssistant,
        totalStudents,
        presentCount: presentList.length,
        absentStudents: absentList.map((st) => ({
          name: st.studentName,
          code: st.studentCode,
          note: st.note,
        })),
      });
    }
  };

  // Sinh nội dung báo cáo điểm danh lớp học bù gửi nhóm Zalo
  const buildMakeupAttendanceGroupReportContent = () => {
    if (!activeMakeupClass) return "";
    const attendedList = makeupEntries.filter((e) => e.status === "ATTENDED");
    const absentList = makeupEntries.filter((e) => e.status === "ABSENT");

    return generateAttendanceGroupReportZaloMessage({
      className: activeMakeupClass.title,
      classCode: "HỌC BÙ",
      dateStr: activeMakeupClass.dateStr,
      startTime: activeMakeupClass.startTime,
      endTime: activeMakeupClass.endTime,
      classroomName: activeMakeupClass.classroomName,
      teacherName: activeMakeupClass.roleInCharge === "TEACHER" ? activeMakeupClass.teacherOrAssistantName : "—",
      assistantName: activeMakeupClass.roleInCharge === "ASSISTANT" ? activeMakeupClass.teacherOrAssistantName : "—",
      totalStudents: makeupEntries.length,
      presentCount: attendedList.length,
      absentStudents: absentList.map((st) => ({
        name: st.studentName,
        code: st.studentCode,
        note: st.exchangeNote,
      })),
      isMakeupClass: true,
    });
  };

  // Mở modal xem trước & chỉnh sửa báo cáo điểm danh nhóm Zalo
  const handleOpenGroupReportZalo = () => {
    if (isMakeupSession) {
      if (!activeMakeupClass) return;
      const content = buildMakeupAttendanceGroupReportContent();
      const targetClass = classes.find((c) => c.id === activeMakeupClass.targetClassId);
      setGroupZaloModal({
        isOpen: true,
        className: activeMakeupClass.title,
        initialGroupUrl: targetClass?.zaloGroupUrl || "",
        initialGroupId: targetClass?.zaloGroupId || "",
        initialContent: content,
      });
    } else {
      if (!currentClass) return;
      const content = buildAttendanceGroupReportContent();
      setGroupZaloModal({
        isOpen: true,
        className: currentClass.name,
        initialGroupUrl: currentClass.zaloGroupUrl || "",
        initialGroupId: currentClass.zaloGroupId || "",
        initialContent: content,
      });
    }
  };

  // Xác nhận gửi báo cáo điểm danh vào nhóm Zalo lớp
  const handleConfirmSendGroupZalo = async (editedContent: string, groupUrl?: string, groupId?: string) => {
    if (!groupZaloModal) return;
    setIsSendingGroupZalo(true);
    try {
      const targetClassId = isMakeupSession
        ? activeMakeupClass?.targetClassId && activeMakeupClass.targetClassId !== "ALL"
          ? activeMakeupClass.targetClassId
          : classes[0]?.id || "class-1"
        : currentClass?.id || "";

      const res = await sendZaloClassGroupMessage(
        targetClassId,
        editedContent,
        (userRole as any) || "ASSISTANT",
        currentStaffId || activeStaff.id,
        groupUrl,
        groupId
      );

      setSaveSuccessMessage(
        `🎉 ${res.message || `Đã gửi báo cáo điểm danh vào nhóm Zalo lớp ${groupZaloModal.className} thành công!`}`
      );
      setTimeout(() => setSaveSuccessMessage(null), 5000);
    } catch (err: any) {
      setSaveSuccessMessage(`⚠️ Lỗi khi gửi tin: ${err?.message || "Lỗi gửi tin"}`);
      setTimeout(() => setSaveSuccessMessage(null), 5000);
    } finally {
      setIsSendingGroupZalo(false);
      setGroupZaloModal(null);
    }
  };

  const handleSaveAttendance = async () => {
    if (isReadOnly || !currentClass) return;

    const recordsToSave = formEntries
      .filter((e) => e.status !== null)
      .map((e) => ({
        classId: currentClass.id,
        dateStr: selectedDateStr,
        studentId: e.studentId,
        studentName: e.studentName,
        status: e.status as AttendanceStatus,
        note: e.note || undefined,
      }));

    if (recordsToSave.length === 0) {
      alert("Vui lòng điểm danh ít nhất 1 học sinh trước khi lưu!");
      return;
    }

    saveAttendance(
      currentClass.id,
      selectedDateStr,
      recordsToSave,
      effectiveAssistant
    );

    // 🚀 TÍNH NĂNG MỚI: LẬP TỨC GỬI THÔNG TIN ĐIỂM DANH VÀO NHÓM LỚP QUA BOT ZALO
    let autoZaloNote = "";
    if (autoSendZaloGroup) {
      try {
        const reportContent = buildAttendanceGroupReportContent();
        const res = await sendZaloClassGroupMessage(
          currentClass.id,
          reportContent,
          (userRole as any) || "ASSISTANT",
          currentStaffId || activeStaff.id
        );
        if (res.success) {
          autoZaloNote = ` 💬 Đồng thời đã lập tức gửi báo cáo điểm danh vào nhóm Zalo lớp ${currentClass.name}!`;
        }
      } catch (_e) {
        console.warn("Lỗi tự động gửi nhóm Zalo sau điểm danh:", _e);
      }
    }

    setSaveSuccessMessage(
      `Đã lưu điểm danh thành công cho ${recordsToSave.length} học sinh trong ca học.${autoZaloNote}`
    );
    setTimeout(() => setSaveSuccessMessage(null), 5000);
  };

  const handleSaveMakeupAttendance = async () => {
    if (isReadOnly || !activeMakeupClass) return;

    const records = makeupEntries.map((e) => ({
      studentId: e.studentId,
      attendanceStatus: (e.status === "ATTENDED" || e.status === "ABSENT") ? e.status : "ABSENT" as "ATTENDED" | "ABSENT",
    }));

    const result = updateMakeupClassAttendance(activeMakeupClass.id, records);

    let autoZaloNote = "";
    if (autoSendZaloGroup) {
      try {
        const reportContent = buildMakeupAttendanceGroupReportContent();
        const targetClassId = activeMakeupClass.targetClassId && activeMakeupClass.targetClassId !== "ALL"
          ? activeMakeupClass.targetClassId
          : classes[0]?.id || "class-1";

        const res = await sendZaloClassGroupMessage(
          targetClassId,
          reportContent,
          (userRole as any) || "ASSISTANT",
          currentStaffId || activeStaff.id
        );
        if (res.success) {
          autoZaloNote = ` 💬 Đồng thời đã gửi báo cáo ca bù vào nhóm Zalo!`;
        }
      } catch (_e) {}
    }

    setSaveSuccessMessage(`${result.message}${autoZaloNote}`);
    setTimeout(() => setSaveSuccessMessage(null), 5000);
  };

  const handleConfirmSendMakeupContent = () => {
    if (!activeMakeupClass) return;
    if (!makeupLessonContent.trim()) {
      alert("Vui lòng nhập tóm tắt nội dung bài học đã ôn tập!");
      return;
    }

    const result = sendMakeupContentToParents(activeMakeupClass.id, {
      lessonContent: makeupLessonContent.trim(),
      homework: makeupHomework.trim() || undefined,
      assistantFeedback: makeupAssistantFeedback.trim() || undefined,
    });

    setSaveSuccessMessage(result.message);
    setIsMakeupContentModalOpen(false);
    setTimeout(() => setSaveSuccessMessage(null), 4500);
  };

  const displayedRegularEntries = useMemo(() => {
    return formEntries.filter((entry) => {
      const matchSearch =
        entry.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.studentCode.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;
      if (statusFilter === "ALL") return true;
      if (statusFilter === "PENDING") return entry.status === null;
      return entry.status === statusFilter;
    });
  }, [formEntries, searchQuery, statusFilter]);

  const displayedMakeupEntries = useMemo(() => {
    return makeupEntries.filter((entry) => {
      const matchSearch =
        entry.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.studentCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.originalClassName.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;
      if (statusFilter === "ALL") return true;
      if (statusFilter === "PRESENT") return entry.status === "ATTENDED";
      if (statusFilter === "ABSENT") return entry.status === "ABSENT";
      if (statusFilter === "PENDING") return entry.status === "REGISTERED";
      return true;
    });
  }, [makeupEntries, searchQuery, statusFilter]);

  const classTheme = currentClass ? themeMap.get(currentClass.id) || CLASS_THEMES[0] : CLASS_THEMES[0];

  return (
    <div className="space-y-3.5">
      {/* ============================================================== */}
      {/* 1. TOP HEADER: THÔNG TIN PHÂN QUYỀN, NGÀY & DANH SÁCH CA HỌC */}
      {/* ============================================================== */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Role Status Indicator */}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
                {isReadOnly ? (
                  <Eye className="w-5 h-5 text-amber-500" />
                ) : (
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                )}
                {isReadOnly
                  ? `Giám Sát Tình Trạng Điểm Danh (${userRole === "ADMIN" ? "Quản Trị Viên" : "Giáo Viên"})`
                  : `Bàn Làm Việc Điểm Danh (Trợ Giảng: ${activeStaff.fullName})`}
              </h3>

              {isReadOnly ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                  🔒 Chế độ Kiểm Soát & Giám Sát
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  ⚡ Quyền Điểm Danh 1-Chạm & Báo Cáo
                </span>
              )}
            </div>
          </div>

          {/* Controls: Date Picker & Simulated Time Selector */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Date input */}
            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={selectedDateStr}
                onChange={(e) => setSelectedDateStr(e.target.value)}
                className="bg-transparent text-xs font-mono font-medium text-slate-800 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => setSelectedDateStr(getTodayDateString())}
              className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition border border-blue-200 flex items-center gap-1"
              title="Chuyển về ngày thực tế hôm nay"
            >
              <span>📅 Hôm Nay</span>
            </button>

            {/* Mobile View Toggle */}
            <button
              onClick={() => setIsMobileFrame(!isMobileFrame)}
              className={`p-1.5 rounded-xl border text-xs transition ${
                isMobileFrame ? "bg-amber-500 text-slate-950 border-amber-500 shadow-xs" : "bg-white text-slate-600 border-slate-200"
              }`}
              title="Chuyển chế độ xem khung điện thoại"
            >
              {isMobileFrame ? <Monitor className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. HÀNG CHỌN CA HỌC HÔM NAY (BAO GỒM CẢ CA BÙ) */}
        {/* ============================================================== */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Flame className="w-3 h-3 text-rose-500" /> Ca Học Trong Ngày ({todaySessionsQueue.length} ca):
            </span>
            <span className="text-[10px] text-slate-400">
              *Hỗ trợ ca chính khóa & ca học bù
            </span>
          </div>

          {todaySessionsQueue.length === 0 ? (
            <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500 text-center">
              Hôm nay (Thứ {dayOfWeek === 8 ? "Chủ Nhật" : dayOfWeek}, ngày {selectedDateStr}) chưa có ca trực chính khóa hoặc lớp bù nào.
            </div>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {todaySessionsQueue.map((item) => {
                const isSelected = item.id === selectedSessionId;
                const isItemMakeup = item.type === "MAKEUP";
                const theme = item.classItem ? themeMap.get(item.classItem.id) || CLASS_THEMES[0] : null;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedSessionId(item.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-left transition shrink-0 ${
                      isSelected
                        ? isItemMakeup
                          ? "bg-purple-900 text-white border-purple-900 shadow-md ring-2 ring-purple-400"
                          : "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-amber-400"
                        : isItemMakeup
                        ? "bg-purple-50/80 hover:bg-purple-100 text-purple-900 border-purple-200"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
                    }`}
                  >
                    {isItemMakeup ? (
                      <span className="text-xs">⚡</span>
                    ) : (
                      <span className={`w-2 h-2 rounded-full ${theme?.dot || "bg-blue-600"} shrink-0`} />
                    )}
                    <div className="text-xs">
                      <div className="font-bold flex items-center gap-1.5">
                        <span>{item.title}</span>
                        <span className={`text-[9.5px] px-1.5 py-0.2 rounded-md ${item.badgeClass}`}>
                          {item.startTime} - {item.endTime}
                        </span>
                      </div>
                      <div className={`text-[10px] flex items-center gap-1 mt-0.5 ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                        <span>{item.roomName}</span>
                        <span>•</span>
                        <span className="font-semibold">{item.statusLabel}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. KHUNG THỰC HIỆN ĐIỂM DANH: GỌN GÀNG, TỐI ƯU SỨC CHỨA DỮ LIỆU */}
      {/* ============================================================== */}
      <div className={`mx-auto transition-all duration-300 ${isMobileFrame ? "max-w-[420px] shadow-2xl rounded-3xl border-4 border-slate-800 bg-slate-100 p-2 sm:p-3" : "w-full"}`}>
        
        {isMobileFrame && (
          <div className="bg-slate-800 text-white rounded-t-2xl py-1 px-3 mb-2 flex items-center justify-between text-[10px]">
            <span className="font-bold font-mono">19:00</span>
            <span className="text-[9.5px] text-slate-400">Ms. Dung Shiny Mobile TA</span>
            <span>📶 100%</span>
          </div>
        )}

        <div className="space-y-2.5">
          {/* Card Thông tin ca học đang mở */}
          <div className={`rounded-2xl border p-3.5 shadow-xs space-y-2.5 ${
            isMakeupSession ? "bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-white border-purple-300" : "bg-white border-slate-200"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {isMakeupSession ? (
                  <span className="text-xl">⚡</span>
                ) : (
                  <span className={`w-3 h-3 rounded-full ${classTheme.dot} shrink-0`} />
                )}
                <div>
                  <div className="font-black text-sm sm:text-base text-slate-900 leading-tight flex items-center gap-1.5 flex-wrap">
                    <span>{isMakeupSession ? activeMakeupClass?.title : currentClass?.name}</span>
                    {isMakeupSession ? (
                      <span className="text-[10.5px] font-extrabold bg-purple-600 text-white px-2 py-0.5 rounded-full shadow-2xs">
                        ⚡ LỚP HỌC BÙ TRONG THÁNG
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500 font-normal">({currentClass?.code})</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-600 flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-0.5">
                      <DoorOpen className="w-3 h-3 text-slate-400" /> {isMakeupSession ? activeMakeupClass?.classroomName : currentClass?.classroom}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-3 h-3 text-slate-400" /> {isMakeupSession ? `${activeMakeupClass?.startTime} - ${activeMakeupClass?.endTime}` : `${activeSessionItem?.startTime} - ${activeSessionItem?.endTime}`}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5 font-semibold text-blue-900">
                      <UserCheck className="w-3 h-3 text-blue-600" /> Phụ trách: {isMakeupSession ? `${activeMakeupClass?.teacherOrAssistantName} (${activeMakeupClass?.roleInCharge === "ASSISTANT" ? "Trợ Giảng" : "Giáo Viên"})` : `TA: ${effectiveAssistant} • GV: ${effectiveTeacher}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Badge & Sĩ số */}
              <div className="flex items-center gap-1.5 self-start sm:self-center">
                {activeSessionItem && (
                  <span className={`text-[10.5px] font-bold px-2 py-1 rounded-lg border ${activeSessionItem.badgeClass}`}>
                    {activeSessionItem.statusLabel}
                  </span>
                )}
                <span className="text-xs font-bold font-mono px-2 py-1 rounded-lg bg-slate-100 text-slate-700">
                  {totalCount} Học sinh
                </span>
              </div>
            </div>

            {isMakeupSession && activeMakeupClass?.contentSentToParentsAt && (
              <div className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-flex items-center gap-1">
                ✓ Đã gửi nội dung bài học cho PH ({activeMakeupClass.contentSentToParentsAt})
              </div>
            )}

            {!isMakeupSession && currentSubstitution && (
              <div className="text-xs text-amber-800 font-medium bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 inline-flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Dạy thay: {currentSubstitution.subTeacherName || currentSubstitution.subAssistantName || "Dạy thay"}</span>
              </div>
            )}

            {/* Compact Sĩ số & Action Row */}
            <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
              {/* Sĩ số Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === "PRESENT" ? "ALL" : "PRESENT")}
                  className={`px-2 py-1 rounded-lg border font-bold text-[11px] transition ${
                    statusFilter === "PRESENT"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-emerald-50 text-emerald-900 border-emerald-200"
                  }`}
                >
                  🟢 Có mặt: {presentCount}
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === "ABSENT" ? "ALL" : "ABSENT")}
                  className={`px-2 py-1 rounded-lg border font-bold text-[11px] transition ${
                    statusFilter === "ABSENT"
                      ? "bg-rose-600 text-white border-rose-600"
                      : "bg-rose-50 text-rose-900 border-rose-200"
                  }`}
                >
                  🔴 Vắng: {absentCount}
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === "PENDING" ? "ALL" : "PENDING")}
                  className={`px-2 py-1 rounded-lg border font-bold text-[11px] transition ${
                    statusFilter === "PENDING"
                      ? "bg-slate-700 text-white border-slate-700"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  ⚪ Chưa điểm: {pendingCount}
                </button>
              </div>

              {/* Quick Actions (Trợ Giảng trực tiếp thực hiện; Admin giám sát) */}
              {!isReadOnly ? (
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  {/* Tùy chọn tự động gửi báo cáo vào nhóm Zalo lớp ngay sau khi lưu */}
                  <label 
                    className="flex items-center gap-1.5 text-[11px] text-blue-900 font-semibold cursor-pointer select-none bg-blue-50/80 hover:bg-blue-100/80 px-2.5 py-1.5 rounded-xl border border-blue-200 transition" 
                    title="Tự động lập tức gửi báo cáo điểm danh vào nhóm Zalo lớp ngay sau khi nhấn nút Lưu Điểm Danh"
                  >
                    <input
                      type="checkbox"
                      checked={autoSendZaloGroup}
                      onChange={(e) => setAutoSendZaloGroup(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="hidden md:inline">Gửi ngay vào nhóm Zalo lớp</span>
                    <span className="md:hidden">Zalo nhóm</span>
                  </label>

                  {/* Nút Xem trước / Gửi Báo Cáo Nhóm Zalo thủ công */}
                  <button
                    type="button"
                    onClick={handleOpenGroupReportZalo}
                    className="px-2.5 sm:px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    title="Xem trước & Gửi báo cáo tình hình điểm danh vào nhóm Zalo lớp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Báo Cáo Nhóm Zalo</span>
                    <span className="sm:hidden">Nhóm Zalo</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleMarkAllPresent}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold shadow-2xs transition flex items-center gap-1 active:scale-95"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>Tất Cả Có Mặt</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    title="Đặt lại trạng thái"
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-medium transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  {/* Nút gửi nội dung bài học bù cho Phụ Huynh (Trợ Giảng phụ trách) */}
                  {isMakeupSession && (
                    <button
                      type="button"
                      onClick={() => setIsMakeupContentModalOpen(true)}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                      title="Trợ giảng gửi nội dung bài học đã ôn tập & dặn dò cho phụ huynh"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Gửi Nội Dung Cho PH</span>
                    </button>
                  )}

                  {/* Nút Lưu Điểm Danh */}
                  <button
                    type="button"
                    onClick={isMakeupSession ? handleSaveMakeupAttendance : handleSaveAttendance}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 active:scale-95"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isMakeupSession ? "Lưu Điểm Danh Bù" : "Lưu Điểm Danh"}</span>
                  </button>
                </div>
              ) : (
                /* Admin view controls */
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Nút xem trước báo cáo nhóm Zalo cho Admin / Teacher */}
                  <button
                    type="button"
                    onClick={handleOpenGroupReportZalo}
                    className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold text-xs rounded-xl transition flex items-center gap-1 shadow-2xs"
                    title="Xem trước báo cáo điểm danh gửi vào nhóm Zalo lớp"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                    <span>Báo Cáo Nhóm Zalo</span>
                  </button>

                  {isMakeupSession && (
                    <button
                      type="button"
                      onClick={() => setIsMakeupContentModalOpen(true)}
                      className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 font-bold text-xs rounded-xl transition flex items-center gap-1"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-purple-700" />
                      <span>Xem Báo Cáo Buổi Bù</span>
                    </button>
                  )}
                  <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                    (Admin chỉ giám sát kiểm soát)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Search bar & quick filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                placeholder={isMakeupSession ? "Tìm nhanh học sinh lớp bù, lớp gốc..." : "Tìm nhanh học viên..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600"
                >
                  <XCircle className="w-3 h-3" />
                </button>
              )}
            </div>

            {statusFilter !== "ALL" && (
              <button
                onClick={() => setStatusFilter("ALL")}
                className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 shrink-0"
              >
                Xóa lọc ({statusFilter})
              </button>
            )}
          </div>

          {/* Success toast */}
          {saveSuccessMessage && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl p-2.5 text-xs flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{saveSuccessMessage}</span>
              </div>
              <button onClick={() => setSaveSuccessMessage(null)} className="text-emerald-700">
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ============================================================== */}
          {/* 4. STUDENT LIST (LỚP CHÍNH KHÓA HOẶC LỚP HỌC BÙ) */}
          {/* ============================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="divide-y divide-slate-100">
              {/* TRƯỜNG HỢP 1: LỚP HỌC BÙ (MAKEUP CLASS) */}
              {isMakeupSession ? (
                displayedMakeupEntries.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    {makeupEntries.length === 0
                      ? "Chưa có học sinh nào được add vào lớp học bù này."
                      : "Không tìm thấy học sinh phù hợp bộ lọc."}
                  </div>
                ) : (
                  displayedMakeupEntries.map((entry, index) => (
                    <div
                      key={`${entry.studentId}-${entry.absentDateStr}`}
                      className={`p-2.5 transition space-y-1.5 ${
                        entry.status === "ATTENDED"
                          ? "bg-emerald-50/25"
                          : entry.status === "ABSENT"
                          ? "bg-rose-50/25"
                          : "hover:bg-slate-50/60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <span className="w-5 h-5 rounded-md bg-purple-100 text-purple-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                            {index + 1}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-xs sm:text-sm text-slate-900 break-words leading-snug">
                              {entry.studentName}
                            </div>
                            <div className="text-[10.5px] text-slate-500 mt-0.5">
                              Lớp chính: <strong className="text-indigo-900">{entry.originalClassName}</strong> • Bù buổi vắng: <strong className="text-rose-700">{entry.absentDateStr}</strong>
                            </div>
                            {entry.exchangeNote && (
                              <div className="text-[10px] text-indigo-700 italic mt-0.5">
                                💬 &quot;{entry.exchangeNote}&quot;
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 text-right">
                          <span className="text-[10.5px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                            {entry.studentCode}
                          </span>
                          <span className="text-[10px] text-slate-500 hidden sm:inline">
                            PH: {students.find((s) => s.id === entry.studentId)?.parentPhone || entry.parentPhone}
                          </span>
                        </div>
                      </div>

                      {/* Phím bấm điểm danh lớp bù */}
                      <div className="pt-0.5">
                        {isReadOnly ? (
                          /* Read-Only Badge cho Admin */
                          <div className="flex items-center justify-between text-xs pt-0.5">
                            <span className="text-[10px] text-slate-400">Trạng thái điểm danh bù:</span>
                            {entry.status === "ATTENDED" && (
                              <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10.5px] flex items-center gap-1 shadow-2xs">
                                <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Đã có mặt học bù
                              </span>
                            )}
                            {entry.status === "ABSENT" && (
                              <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-900 border border-rose-300 font-bold text-[10.5px] flex items-center gap-1 shadow-2xs">
                                <XCircle className="w-3 h-3 text-rose-700" /> Vắng buổi bù (bảo lưu quyền lợi)
                              </span>
                            )}
                            {entry.status === "REGISTERED" && (
                              <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 text-[10.5px]">
                                Đã đăng ký (chưa điểm)
                              </span>
                            )}
                          </div>
                        ) : (
                          /* Trợ Giảng điểm danh 1 chạm */
                          <div className="grid grid-cols-2 gap-2 w-full bg-slate-100/90 p-1 rounded-xl border border-slate-200">
                            <button
                              type="button"
                              onClick={() => handleSetMakeupStatus(entry.studentId, "ATTENDED")}
                              className={`py-2 sm:py-1.5 px-3 min-h-[42px] sm:min-h-0 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                                entry.status === "ATTENDED"
                                  ? "bg-emerald-600 text-white shadow-xs font-bold"
                                  : "text-slate-700 hover:text-emerald-800 hover:bg-emerald-50"
                              }`}
                            >
                              <Check className="w-4 h-4" />
                              <span>Có mặt</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSetMakeupStatus(entry.studentId, "ABSENT")}
                              className={`py-2 sm:py-1.5 px-3 min-h-[42px] sm:min-h-0 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                                entry.status === "ABSENT"
                                  ? "bg-rose-600 text-white shadow-xs font-bold"
                                  : "text-slate-700 hover:text-rose-800 hover:bg-rose-50"
                              }`}
                              title="Học sinh vắng buổi bù - Không cộng dồn vào số buổi vắng & giữ nguyên quyền lợi bù"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>Vắng (Không cộng dồn)</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )
              ) : (
                /* TRƯỜNG HỢP 2: LỚP CHÍNH KHÓA (REGULAR CLASS) */
                displayedRegularEntries.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    Không tìm thấy học sinh phù hợp bộ lọc.
                  </div>
                ) : (
                  displayedRegularEntries.map((entry, index) => {
                    const isExpanded = expandedStudentId === entry.studentId;

                    return (
                      <div
                        key={entry.studentId}
                        className={`p-2.5 transition space-y-1.5 ${
                          entry.status === "PRESENT"
                            ? "bg-emerald-50/20"
                            : entry.status === "ABSENT"
                            ? "bg-rose-50/25"
                            : "hover:bg-slate-50/60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0 flex-1">
                            <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                              {index + 1}
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-xs sm:text-sm text-slate-900 break-words leading-snug">
                                {entry.studentName}
                              </div>
                              {entry.note && (
                                <div className="text-[10px] text-slate-500 italic mt-0.5 flex items-center gap-1">
                                  <MessageSquare className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                  <span>{entry.note}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 text-right">
                            <span className="text-[10.5px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                              {entry.studentCode}
                            </span>
                            {userRole === "ADMIN" && (
                              <span
                                className={`text-[9.5px] px-1.5 py-0.5 rounded-md font-semibold border ${
                                  entry.tuitionStatus === "UNPAID" || entry.tuitionStatus === "OVERDUE"
                                    ? "bg-rose-50 text-rose-800 border-rose-200 font-bold"
                                    : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                }`}
                              >
                                {entry.tuitionStatus === "UNPAID" ? "Chưa đóng HP" : entry.tuitionStatus === "OVERDUE" ? "Quá hạn HP" : "Đã đóng HP"}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Điểm danh 1 chạm */}
                        <div className="pt-0.5">
                          {isReadOnly ? (
                            <div className="flex items-center justify-between text-xs pt-0.5">
                              <span className="text-[10px] text-slate-400">Trạng thái điểm danh:</span>
                              {entry.status === "PRESENT" && (
                                <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10.5px] flex items-center gap-1 shadow-2xs">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Có mặt
                                </span>
                              )}
                              {entry.status === "ABSENT" && (
                                <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-900 border border-rose-300 font-bold text-[10.5px] flex items-center gap-1 shadow-2xs">
                                  <XCircle className="w-3 h-3 text-rose-700" /> Vắng mặt
                                </span>
                              )}
                              {entry.status === null && (
                                <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 text-[10.5px]">
                                  Chưa điểm danh
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2 w-full bg-slate-100/90 p-1 rounded-xl border border-slate-200">
                              <button
                                type="button"
                                onClick={() => handleSetStatus(entry.studentId, "PRESENT")}
                                className={`py-2 sm:py-1.5 px-3 min-h-[42px] sm:min-h-0 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                                  entry.status === "PRESENT"
                                    ? "bg-emerald-600 text-white shadow-xs font-bold"
                                    : "text-slate-700 hover:text-emerald-800 hover:bg-emerald-50"
                                }`}
                              >
                                <Check className="w-4 h-4" />
                                <span>Có mặt</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetStatus(entry.studentId, "ABSENT")}
                                className={`py-2 sm:py-1.5 px-3 min-h-[42px] sm:min-h-0 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                                  entry.status === "ABSENT"
                                    ? "bg-rose-600 text-white shadow-xs font-bold"
                                    : "text-slate-700 hover:text-rose-800 hover:bg-rose-50"
                                }`}
                              >
                                <XCircle className="w-4 h-4" />
                                <span>Vắng</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Lý do vắng */}
                        {!isReadOnly && entry.status === "ABSENT" && isExpanded && (
                          <div className="mt-1.5 pt-1.5 border-t border-rose-200/60 bg-rose-50/70 p-2 rounded-xl text-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-rose-950 flex items-center gap-1">
                                <MessageSquare className="w-3 h-3 text-rose-600" /> Lý do vắng mặt:
                              </span>
                            </div>
                            <div className="flex items-center gap-1 flex-wrap">
                              {["Sốt nhẹ", "Về quê", "Trùng lịch học thêm", "Bận gia đình"].map((reason) => (
                                <button
                                  key={reason}
                                  type="button"
                                  onClick={() => handleSetNote(entry.studentId, reason)}
                                  className={`px-1.5 py-0.5 rounded-md text-[9.5px] transition ${
                                    entry.note === reason
                                      ? "bg-rose-600 text-white font-bold"
                                      : "bg-white text-slate-700 hover:bg-rose-100 border border-rose-200"
                                  }`}
                                >
                                  {reason}
                                </button>
                              ))}
                            </div>
                            <input
                              type="text"
                              placeholder="Ghi chú chi tiết lý do phụ huynh xin phép..."
                              value={entry.note || ""}
                              onChange={(e) => handleSetNote(entry.studentId, e.target.value)}
                              className="w-full px-2 py-1 text-[11px] bg-white rounded-lg border border-rose-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                            />

                            {/* Nút gửi tin nhắn Zalo báo vắng phụ huynh */}
                            <button
                              type="button"
                              onClick={() => handleOpenAbsentZalo(entry.studentId, entry.studentName)}
                              className="w-full mt-1.5 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                              title="Xem & chỉnh sửa tin nhắn Zalo báo vắng trước khi gửi trực tiếp cho phụ huynh"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>💬 Báo Vắng Cho Phụ Huynh Qua Zalo</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )
              )}
            </div>

            {/* Footer Status */}
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                Tiến độ: {markedCount}/{totalCount} HS ({progressPercent}%)
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                🟢 Có mặt: {presentCount} • 🔴 Vắng: {absentCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. MODAL: TRỢ GIẢNG SOẠN & GỬI NỘI DUNG BÀI HỌC BÙ CHO PHỤ HUYNH */}
      {/* ============================================================== */}
      {isMakeupContentModalOpen && activeMakeupClass && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                  <span>Báo Cáo Nội Dung Bài Học Bù Gửi Phụ Huynh</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Lớp: <strong>{activeMakeupClass.title}</strong> • Ngày: {activeMakeupClass.dateStr}
                </p>
              </div>
              <button
                onClick={() => setIsMakeupContentModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Banner chỉ dẫn phân biệt 2 kênh */}
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl text-xs space-y-1 text-purple-900 leading-relaxed">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  <span>CHỈ DẪN KÊNH THÔNG BÁO BÀI HỌC BÙ</span>
                </div>
                <div className="text-[11px] text-slate-700">
                  Nội dung và dặn dò bài tập buổi bù sẽ được cập nhật trực tiếp lên <strong>Sổ liên lạc Cổng Phụ Huynh</strong> (nội bộ web), đồng thời gửi tin nhắn <strong>Zalo</strong> thông báo tới phụ huynh các con trong lớp bù.
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  1. Tóm tắt nội dung bài học đã ôn tập <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  rows={3}
                  value={makeupLessonContent}
                  onChange={(e) => setMakeupLessonContent(e.target.value)}
                  disabled={isReadOnly}
                  placeholder="Ví dụ: Ôn tập Unit 4 - Family members, luyện phát âm âm /θ/ và /ð/, giải đáp bài tập trang 34-36 sách Workbook..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  2. Bài tập dặn dò về nhà (nếu có):
                </label>
                <textarea
                  rows={2}
                  value={makeupHomework}
                  onChange={(e) => setMakeupHomework(e.target.value)}
                  disabled={isReadOnly}
                  placeholder="Ví dụ: Quay video ngắn đọc 5 từ vựng gia đình và hoàn thành bài 2 trang 37."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  3. Nhận xét & đánh giá chung của trợ giảng:
                </label>
                <textarea
                  rows={2}
                  value={makeupAssistantFeedback}
                  onChange={(e) => setMakeupAssistantFeedback(e.target.value)}
                  disabled={isReadOnly}
                  placeholder="Ví dụ: Các con tập trung cao độ, phát âm tiến bộ rõ rệt và tự tin tương tác với trợ giảng."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {activeMakeupClass.contentSentToParentsAt && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Đã gửi lần gần nhất: {activeMakeupClass.contentSentToParentsAt}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsMakeupContentModalOpen(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition"
              >
                Đóng
              </button>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={handleConfirmSendMakeupContent}
                  disabled={!makeupLessonContent.trim()}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 ${
                    !makeupLessonContent.trim()
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-purple-600 hover:bg-purple-700 text-white"
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>Gửi Thông Báo Tới Phụ Huynh</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* MODAL CHỈNH SỬA TIN NHẮN ZALO BÁO VẮNG */}
      {editZaloModal && (
        <EditZaloMessageModal
          isOpen={editZaloModal.isOpen}
          onClose={() => setEditZaloModal(null)}
          title={`Báo Vắng Zalo Bé ${editZaloModal.studentName}`}
          recipientName={editZaloModal.parentName}
          recipientPhone={editZaloModal.parentPhone}
          studentName={editZaloModal.studentName}
          className={editZaloModal.className}
          initialContent={editZaloModal.initialContent}
          templateBadge="Báo Vắng Điểm Danh"
          onSend={handleConfirmSendAbsentZalo}
        />
      )}

      {/* MODAL CHỈNH SỬA / GỬI BÁO CÁO ĐIỂM DANH VÀO NHÓM ZALO LỚP */}
      {groupZaloModal && (
        <EditZaloMessageModal
          isOpen={groupZaloModal.isOpen}
          onClose={() => setGroupZaloModal(null)}
          title={`Báo Cáo Điểm Danh Nhóm Zalo - ${groupZaloModal.className}`}
          recipientName={`Nhóm Zalo Lớp: ${groupZaloModal.className}`}
          recipientPhone={groupZaloModal.initialGroupUrl || "Nhóm Zalo Lớp"}
          className={groupZaloModal.className}
          initialContent={groupZaloModal.initialContent}
          templateBadge="Báo Cáo Điểm Danh Nhóm Lớp"
          isClassGroup={true}
          initialGroupUrl={groupZaloModal.initialGroupUrl}
          initialGroupId={groupZaloModal.initialGroupId}
          senderRole={(userRole as any) || "ASSISTANT"}
          onSend={handleConfirmSendGroupZalo}
        />
      )}
    </div>
  );
}
