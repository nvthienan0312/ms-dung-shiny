"use client";

import React, { useState, useMemo } from "react";
import { useCenter } from "@/context/CenterContext";
import { 
  MakeupClass, 
  MakeupStudentEntry, 
} from "@/data/centerData";
import { 
  getMonthlyAbsentStatistics, 
  generateMakeupNotificationMessage,
  generateMakeupSurveyMessage,
  isDateInMonth
} from "@/utils/makeupHelper";
import { 
  getTodayDateString, 
  getCurrentBillingMonth, 
  formatDisplayDate, 
  getCurrentTimeHHmm, 
  isPastDateTime, 
  isMakeupClassPast 
} from "@/utils/dateHelper";
import { copyToClipboardAndOpenZalo } from "@/utils/zaloHelper";
import { validateMakeupClassConflict } from "@/utils/conflictChecker";
import ZaloBatchQueueModal, { ZaloQueueItem } from "@/components/common/ZaloBatchQueueModal";

import {
  CalendarCheck,
  UserCheck,
  Users,
  Search,
  Plus,
  Clock,
  DoorOpen,
  CheckCircle2,
  Send,
  MessageSquare,
  RotateCcw,
  Trash2,
  Edit3,
  ShieldAlert,
  Sparkles,
  PhoneCall,
  Calendar,
  X,
  XCircle,
  Check,
  AlertOctagon,
  AlertCircle,
  BookOpen,
  GraduationCap,
  Layers,
  FileText
} from "lucide-react";

const DEFAULT_SURVEY_TEMPLATE = `[MS. DUNG SHINY CENTER - KHẢO SÁT LỊCH RẢNH HỌC BÙ {month}]
Kính gửi Quý Phụ huynh bé {studentName},
Trong {month}, bé {studentName} ({className}) có {absentCount} buổi nghỉ học (ngày: {absentDates}).
Trung tâm có tổ chức học bù trong tháng để con củng cố kiến thức bài học.
Để trung tâm sắp xếp lịch học bù phù hợp nhất cho con, kính nhờ Quý Phụ huynh phản hồi lại các khung giờ con có thể tham gia:
1. Các buổi tối trong tuần: Khung 17:30 - 19:00 hoặc 19:00 - 20:30
2. Cuối tuần: Khung Sáng / Chiều Thứ Bảy hoặc Chủ Nhật
Quý Phụ huynh vui lòng nhắn lại tin nhắn này hoặc liên hệ Hotline: 0912 345 678 để trung tâm lên lịch bù cho bé.
Trân trọng cảm ơn Quý Phụ huynh!`;

export default function MakeupClassesManager() {
  const {
    classes,
    students,
    staff,
    classrooms,
    attendance,
    makeupClasses,
    expiredMakeupRecords,
    createMakeupClass,
    updateMakeupClass,
    deleteMakeupClass,
    addStudentToMakeupClass,
    removeStudentFromMakeupClass,
    updateMakeupStudentAttendance,
    sendMakeupClassNotification,
    sendMakeupSurveyToParents,
    sendMakeupContentToParents,
    recordMakeupClassSalary,
    resetMonthlyMakeupBenefits,
    sendZaloMessageToParent,
    renderZaloTemplate,
  } = useCenter();

  // Chọn tháng học bù (Tracking thời gian thực)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentBillingMonth());

  // Sub-tabs: "CLASSES" (Danh sách lớp học bù) | "ABSENT_STUDENTS" (Theo dõi học sinh vắng & Quyền lợi bù)
  const [activeSubTab, setActiveSubTab] = useState<"CLASSES" | "ABSENT_STUDENTS">("CLASSES");

  // Hàng đợi gửi Zalo tự động giãn cách 2-3 phút chống spam
  const [isZaloQueueOpen, setIsZaloQueueOpen] = useState<boolean>(false);
  const [zaloQueueItems, setZaloQueueItems] = useState<ZaloQueueItem[]>([]);
  const [zaloQueueTitle, setZaloQueueTitle] = useState<string>("Hàng Đợi Gửi Lớp Học Bù");

  // Search query & filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Thống kê realtime dữ liệu vắng & quyền lợi học bù theo tháng
  const { studentsList: monthlyAbsentStudents, summary } = useMemo(() => {
    return getMonthlyAbsentStatistics(
      selectedMonth,
      attendance,
      students,
      classes,
      makeupClasses,
      expiredMakeupRecords
    );
  }, [selectedMonth, attendance, students, classes, makeupClasses, expiredMakeupRecords]);

  // Các lớp học bù thuộc tháng đang chọn
  const monthMakeupClasses = useMemo(() => {
    return makeupClasses.filter((mc) => mc.monthStr === selectedMonth);
  }, [makeupClasses, selectedMonth]);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingMakeupClass, setEditingMakeupClass] = useState<MakeupClass | null>(null);
  
  // Modal Thêm Học Sinh Vào Lớp Bù Sau Khi Trao Đổi
  const [addingToClassId, setAddingToClassId] = useState<string | null>(null);
  const [selectedStudentForAdd, setSelectedStudentForAdd] = useState<{
    studentId: string;
    absentDateStr: string;
  } | null>(null);
  const [exchangeNote, setExchangeNote] = useState<string>("");

  // Modal Gửi Tin Nhắn Thông Báo Lịch Học Bù Cho PH
  const [messagingClass, setMessagingClass] = useState<MakeupClass | null>(null);
  const [selectedMsgStudentId, setSelectedMsgStudentId] = useState<string>("ALL");
  const [customMakeupMsg, setCustomMakeupMsg] = useState<string>("");

  // Modal Khảo Sát Lịch Rảnh Học Bù Cho Toàn Bộ PH Có Con Vắng
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState<boolean>(false);
  const [surveySelectedStudentIds, setSurveySelectedStudentIds] = useState<string[]>([]);
  const [surveyTemplate, setSurveyTemplate] = useState<string>(DEFAULT_SURVEY_TEMPLATE);

  // Modal Trợ Giảng Gửi Nội Dung Buổi Học Bù Cho PH
  const [contentModalClass, setContentModalClass] = useState<MakeupClass | null>(null);
  const [formLessonContent, setFormLessonContent] = useState<string>("");
  const [formHomework, setFormHomework] = useState<string>("");
  const [formAssistantFeedback, setFormAssistantFeedback] = useState<string>("");

  // Modal Chốt Tháng & Reset Quyền Lợi Học Bù
  const [isResetConfirmModalOpen, setIsResetConfirmModalOpen] = useState<boolean>(false);

  // Form state cho Tạo/Sửa lớp học bù
  const [formTitle, setFormTitle] = useState<string>("");
  const [formTargetClassId, setFormTargetClassId] = useState<string>("ALL");
  const [formDurationHours, setFormDurationHours] = useState<number>(1.5);
  const [formDateStr, setFormDateStr] = useState<string>(() => getTodayDateString());
  const [formStartTime, setFormStartTime] = useState<string>("09:00");
  const [formEndTime, setFormEndTime] = useState<string>("10:30");
  const [formClassroomId, setFormClassroomId] = useState<string>("room-2");
  const [formStaffId, setFormStaffId] = useState<string>("staff-ta1");
  const [formFocusContent, setFormFocusContent] = useState<string>("");
  const [formNotes, setFormNotes] = useState<string>("");

  // Mở modal tạo mới lớp học bù
  const handleOpenCreateModal = () => {
    setEditingMakeupClass(null);
    setFormTitle(`Lớp Học Bù ${selectedMonth} - Ôn Tập & Củng Cố`);
    setFormTargetClassId("ALL");
    setFormDurationHours(1.5);
    setFormDateStr(getTodayDateString());
    setFormStartTime("09:00");
    setFormEndTime("10:30");
    setFormClassroomId(classrooms[0]?.id || "room-1");
    setFormStaffId(staff[0]?.id || "staff-ta1");
    setFormFocusContent("Học bù củng cố từ vựng & cấu trúc ngữ pháp, chữa bài tập Workbook và rèn phản xạ giao tiếp.");
    setFormNotes("Buổi học bù trong tháng dành cho học sinh nghỉ có phép.");
    setIsCreateModalOpen(true);
  };

  // Mở modal sửa lớp học bù
  const handleOpenEditModal = (mc: MakeupClass) => {
    setEditingMakeupClass(mc);
    setFormTitle(mc.title);
    setFormTargetClassId(mc.targetClassId || "ALL");
    setFormDurationHours(mc.durationHours || 1.5);
    setFormDateStr(mc.dateStr);
    setFormStartTime(mc.startTime);
    setFormEndTime(mc.endTime);
    setFormClassroomId(mc.classroomId);
    setFormStaffId(mc.teacherOrAssistantId);
    setFormFocusContent(mc.focusContent);
    setFormNotes(mc.notes || "");
    setIsCreateModalOpen(true);
  };

  // Lưu tạo / sửa lớp học bù
  const handleSaveClass = () => {
    if (!formTitle.trim()) {
      alert("Vui lòng nhập tên lớp học bù!");
      return;
    }

    // 1. Kiểm tra ngày có thuộc tháng đang xét không
    if (!isDateInMonth(formDateStr, selectedMonth)) {
      alert(`⚠️ CẢNH BÁO LỖI NGÀY THÁNG:\n\nNgày diễn ra (${formatDisplayDate(formDateStr)}) không thuộc ${selectedMonth}!\n\nLớp học bù của tháng nào bắt buộc phải diễn ra trong tháng đó.`);
      return;
    }

    // 2. Kiểm tra thời gian diễn ra có trong quá khứ không
    if (isPastDateTime(formDateStr, formEndTime)) {
      alert(`⚠️ CẢNH BÁO LỖI THỜI GIAN:\n\nThời gian diễn ra lớp học bù (${formatDisplayDate(formDateStr)} lúc ${formEndTime}) đã qua so với thời điểm hiện tại (${formatDisplayDate(getTodayDateString())} ${getCurrentTimeHHmm()})!\n\nHệ thống từ chối tạo hoặc cập nhật lớp học bù trong quá khứ. Vui lòng chọn lịch diễn ra trong tương lai.`);
      return;
    }

    // 3. Kiểm tra giờ bắt đầu < giờ kết thúc
    if (formStartTime >= formEndTime) {
      alert(`⚠️ CẢNH BÁO KHUNG GIỜ:\n\nGiờ bắt đầu (${formStartTime}) phải sớm hơn giờ kết thúc (${formEndTime})!`);
      return;
    }

    const selectedRoom = classrooms.find((r) => r.id === formClassroomId);
    const selectedStaffMember = staff.find((s) => s.id === formStaffId);
    const targetCls = classes.find((c) => c.id === formTargetClassId);

    // KIỂM TRA XUNG ĐỘT TRÙNG LỊCH (PHÒNG HỌC, GV/TA VỚI LỚP CHÍNH KHÓA & LỚP BÙ KHÁC)
    const conflict = validateMakeupClassConflict(
      classes,
      makeupClasses,
      editingMakeupClass ? editingMakeupClass.id : null,
      formDateStr,
      formStartTime,
      formEndTime,
      selectedRoom ? selectedRoom.name : "",
      formStaffId,
      selectedStaffMember?.role === "TEACHER" ? "TEACHER" : "ASSISTANT"
    );

    if (conflict.hasConflict) {
      alert(`⚠️ CẢNH BÁO TRÙNG LỊCH LỚP HỌC BÙ:\n\n${conflict.message}\n\nVui lòng chọn phòng học hoặc khung giờ khác để tránh xung đột!`);
      return;
    }

    if (editingMakeupClass) {
      updateMakeupClass(editingMakeupClass.id, {
        title: formTitle.trim(),
        targetClassId: formTargetClassId === "ALL" ? undefined : formTargetClassId,
        targetClassName: formTargetClassId === "ALL" ? undefined : targetCls?.name,
        dateStr: formDateStr,
        startTime: formStartTime,
        endTime: formEndTime,
        durationHours: formDurationHours || 1.5,
        classroomId: formClassroomId,
        classroomName: selectedRoom ? selectedRoom.name : "Phòng học",
        teacherOrAssistantId: formStaffId,
        teacherOrAssistantName: selectedStaffMember ? selectedStaffMember.fullName : "Giáo viên/TA",
        roleInCharge: selectedStaffMember?.role === "TEACHER" ? "TEACHER" : "ASSISTANT",
        focusContent: formFocusContent.trim(),
        notes: formNotes.trim(),
      });
      showToast(`✓ Đã cập nhật lớp học bù "${formTitle}"!`);
    } else {
      createMakeupClass({
        title: formTitle.trim(),
        targetClassId: formTargetClassId === "ALL" ? undefined : formTargetClassId,
        targetClassName: formTargetClassId === "ALL" ? undefined : targetCls?.name,
        monthStr: selectedMonth,
        dateStr: formDateStr,
        startTime: formStartTime,
        endTime: formEndTime,
        durationHours: formDurationHours || 1.5,
        classroomId: formClassroomId,
        classroomName: selectedRoom ? selectedRoom.name : "Phòng học",
        teacherOrAssistantId: formStaffId,
        teacherOrAssistantName: selectedStaffMember ? selectedStaffMember.fullName : "Giáo viên/TA",
        roleInCharge: selectedStaffMember?.role === "TEACHER" ? "TEACHER" : "ASSISTANT",
        focusContent: formFocusContent.trim(),
        targetCourseOrLevel: targetCls?.name || "Trung tâm Ms. Dung Shiny",
        students: [],
        status: "SCHEDULED",
        notes: formNotes.trim(),
      });
      showToast(`✓ Đã tạo thành công lớp học bù "${formTitle}" trong ${selectedMonth}!`);
    }

    setIsCreateModalOpen(false);
  };

  // Mở modal add học sinh vào lớp bù
  const handleOpenAddStudent = (makeupClassId: string, preselectedStuId?: string, preselectedAbsentDate?: string) => {
    const targetMc = makeupClasses.find((m) => m.id === makeupClassId);
    if (targetMc && isMakeupClassPast(targetMc)) {
      alert(`⚠️ KHÔNG THỂ XẾP HỌC SINH:\n\nLớp học bù "${targetMc.title}" đã kết thúc vào ngày ${formatDisplayDate(targetMc.dateStr)} (lúc ${targetMc.endTime})!\n\nHệ thống không cho phép xếp học sinh vào lớp học bù đã diễn ra. Vui lòng chọn hoặc tạo lớp học bù trong tương lai.`);
      return;
    }

    setAddingToClassId(makeupClassId);
    if (preselectedStuId && preselectedAbsentDate) {
      setSelectedStudentForAdd({
        studentId: preselectedStuId,
        absentDateStr: preselectedAbsentDate,
      });
      setExchangeNote("Đã trao đổi với phụ huynh và phụ huynh xác nhận đồng ý cho bé tham gia.");
    } else {
      setSelectedStudentForAdd(null);
      setExchangeNote("");
    }
  };

  // Xác nhận thêm học sinh vào lớp học bù
  const handleConfirmAddStudent = () => {
    if (!addingToClassId || !selectedStudentForAdd) {
      alert("Vui lòng chọn học sinh và ngày vắng cần học bù!");
      return;
    }

    const targetMc = makeupClasses.find((m) => m.id === addingToClassId);
    if (!targetMc || isMakeupClassPast(targetMc)) {
      alert(`⚠️ KHÔNG THỂ XẾP HỌC SINH:\n\nThời gian diễn ra lớp học bù "${targetMc?.title || ""}" đã kết thúc (${targetMc ? formatDisplayDate(targetMc.dateStr) : ""} lúc ${targetMc?.endTime || ""})!\n\nHệ thống từ chối xếp thêm học sinh vào lớp đã kết thúc.`);
      return;
    }

    const stu = students.find((s) => s.id === selectedStudentForAdd.studentId);
    if (!stu) return;

    const cls = classes.find((c) => c.id === stu.classId);

    const entry: MakeupStudentEntry = {
      studentId: stu.id,
      studentName: stu.fullName,
      studentCode: stu.studentCode,
      originalClassId: stu.classId || "",
      originalClassName: cls ? cls.name : "Lớp chính",
      absentDateStr: selectedStudentForAdd.absentDateStr,
      parentName: stu.parentName,
      parentPhone: stu.parentPhone,
      attendanceStatus: "REGISTERED",
      exchangeNote: exchangeNote.trim() || "Đã trao đổi và thống nhất lịch học bù với phụ huynh",
    };

    addStudentToMakeupClass(addingToClassId, entry);
    showToast(`✓ Đã thêm bé ${stu.fullName} vào lớp học bù thành công!`);
    setAddingToClassId(null);
    setSelectedStudentForAdd(null);
  };

  // Mở modal gửi tin nhắn thông báo lớp bù cho phụ huynh (Tự động soạn nội dung mẫu vào ô sửa)
  const handleOpenMessaging = (mc: MakeupClass) => {
    setMessagingClass(mc);
    setSelectedMsgStudentId("ALL");
    let initMsg: string;
    try {
      initMsg = renderZaloTemplate("makeupSchedule", {
        studentName: "[Tên Học Sinh]",
        parentName: "[Tên Phụ Huynh]",
        className: mc.targetClassName || mc.targetClassId || "",
        makeupTitle: mc.title,
        dateStr: mc.dateStr,
        startTime: mc.startTime,
        endTime: mc.endTime,
        classroom: mc.classroomName || mc.classroomId,
        staffInCharge: mc.teacherOrAssistantName || "Giáo viên/Trợ giảng phụ trách",
        focusTopic: mc.focusContent || "",
        absentDateStr: "[Ngày Vắng]",
      });
    } catch {
      initMsg = generateMakeupNotificationMessage(
        "[Tên Học Sinh]",
        "[Tên Phụ Huynh]",
        mc,
        "[Ngày Vắng]"
      );
    }
    setCustomMakeupMsg(initMsg);
  };

  // Khi thay đổi đối tượng nhận tin trong Modal thông báo lịch học bù
  const handleSelectMsgStudent = (studentId: string) => {
    setSelectedMsgStudentId(studentId);
    if (!messagingClass) return;
    const targetStudent = messagingClass.students.find((s) => s.studentId === studentId);
    let msg: string;
    try {
      msg = renderZaloTemplate("makeupSchedule", {
        studentName: studentId === "ALL" ? "[Tên Học Sinh]" : targetStudent?.studentName || "",
        parentName: studentId === "ALL" ? "[Tên Phụ Huynh]" : targetStudent?.parentName || "",
        className: messagingClass.targetClassName || messagingClass.targetClassId || "",
        makeupTitle: messagingClass.title,
        dateStr: messagingClass.dateStr,
        startTime: messagingClass.startTime,
        endTime: messagingClass.endTime,
        classroom: messagingClass.classroomName || messagingClass.classroomId,
        staffInCharge: messagingClass.teacherOrAssistantName || "Giáo viên/Trợ giảng phụ trách",
        focusTopic: messagingClass.focusContent || "",
        absentDateStr: studentId === "ALL" ? "[Ngày Vắng]" : targetStudent?.absentDateStr || "",
      });
    } catch {
      msg = generateMakeupNotificationMessage(
        studentId === "ALL" ? "[Tên Học Sinh]" : targetStudent?.studentName || "",
        studentId === "ALL" ? "[Tên Phụ Huynh]" : targetStudent?.parentName || "",
        messagingClass,
        studentId === "ALL" ? "[Ngày Vắng]" : targetStudent?.absentDateStr
      );
    }
    setCustomMakeupMsg(msg);
  };

  // Xác nhận gửi tin nhắn cho phụ huynh
  const handleConfirmSendMessage = () => {
    if (!messagingClass) return;

    const targetIds = selectedMsgStudentId === "ALL" 
      ? messagingClass.students.map((s) => s.studentId)
      : [selectedMsgStudentId];

    const result = sendMakeupClassNotification(messagingClass.id, targetIds);
    showToast(`📩 ${result.message}`);
    setMessagingClass(null);
  };

  // Mở modal khảo sát lịch rảnh phụ huynh
  const handleOpenSurveyModal = (preselectedStudentId?: string) => {
    const unscheduledStudents = monthlyAbsentStudents.filter((s) => s.unscheduledCount > 0);
    if (preselectedStudentId) {
      setSurveySelectedStudentIds([preselectedStudentId]);
    } else {
      setSurveySelectedStudentIds(unscheduledStudents.map((s) => s.studentId));
    }
    setSurveyTemplate(DEFAULT_SURVEY_TEMPLATE);
    setIsSurveyModalOpen(true);
  };

  // Xác nhận gửi khảo sát lịch rảnh (App Sổ liên lạc & Zalo Tự Động Giãn Cách 2-3 Phút)
  const handleConfirmSendSurvey = (channel: "APP_ONLY" | "ZALO_AND_APP" = "ZALO_AND_APP") => {
    if (surveySelectedStudentIds.length === 0) {
      alert("Vui lòng chọn ít nhất một học sinh để gửi khảo sát!");
      return;
    }

    sendMakeupSurveyToParents(selectedMonth, surveySelectedStudentIds, surveyTemplate);

    if (channel === "APP_ONLY") {
      showToast(`📲 Đã gửi khảo sát lịch rảnh tới ${surveySelectedStudentIds.length} phụ huynh lên Cổng Sổ liên lạc!`);
      setIsSurveyModalOpen(false);
      return;
    }

    if (surveySelectedStudentIds.length > 1) {
      const items: ZaloQueueItem[] = surveySelectedStudentIds.map((sid) => {
        const stu = students.find((s) => s.id === sid);
        const absentData = monthlyAbsentStudents.find((s) => s.studentId === sid);
        const absentDates = absentData?.absentSessions.map((s) => s.dateStr) || [];
        const msg = generateMakeupSurveyMessage(
          stu?.fullName || "Học sinh",
          stu?.parentName || "Phụ huynh",
          absentData?.unscheduledCount || 1,
          absentDates,
          selectedMonth,
          stu?.className || "Lớp học",
          surveyTemplate
        );
        return {
          id: `survey-${sid}-${Date.now()}`,
          studentId: sid,
          studentName: stu?.fullName || "Học sinh",
          parentName: stu?.parentName || "Phụ huynh",
          parentPhone: stu?.parentPhone || "",
          className: stu?.className,
          messageType: "MAKEUP_SURVEY",
          title: `Khảo Sát Lịch Rảnh Học Bù: ${stu?.fullName}`,
          content: msg,
          isFriended: stu?.zaloFriendshipStatus !== "NOT_FRIENDED",
          status: "PENDING",
        };
      });

      setZaloQueueTitle(`Hàng Đợi Gửi Khảo Sát Lịch Rảnh (${items.length} PH - Giãn Cách 2-3 Phút)`);
      setZaloQueueItems(items);
      setIsZaloQueueOpen(true);
      showToast(`🛡️ Đã bật Hàng đợi tự động gửi khảo sát Zalo (${items.length} phụ huynh - giãn cách 2-3 phút chống spam)!`);
    } else {
      showToast(`⚡ Đã tự động gửi khảo sát lịch rảnh tới phụ huynh qua Zalo & Cổng App!`);
    }

    setIsSurveyModalOpen(false);
  };

  // Mở modal trợ giảng gửi nội dung học bù cho phụ huynh
  const handleOpenContentModal = (mc: MakeupClass) => {
    setContentModalClass(mc);
    setFormLessonContent(mc.lessonContent || mc.focusContent || "");
    setFormHomework(mc.homework || "");
    setFormAssistantFeedback(mc.assistantFeedback || "");
  };

  // Xác nhận gửi nội dung học bù cho phụ huynh
  const handleConfirmSendContent = () => {
    if (!contentModalClass) return;
    if (!formLessonContent.trim()) {
      alert("Vui lòng nhập tóm tắt nội dung bài học đã ôn tập!");
      return;
    }

    const result = sendMakeupContentToParents(contentModalClass.id, {
      lessonContent: formLessonContent.trim(),
      homework: formHomework.trim(),
      assistantFeedback: formAssistantFeedback.trim(),
    });

    showToast(`📩 ${result.message}`);
    setContentModalClass(null);
  };

  // Xác nhận tính lương ca dạy bù
  const handleRecordSalary = (mc: MakeupClass) => {
    const result = recordMakeupClassSalary(mc.id);
    if (result.success) {
      showToast(`✓ ${result.message}`);
    } else {
      alert(result.message);
    }
  };

  // Xác nhận chốt tháng & reset quyền lợi học bù
  const handleConfirmResetMonth = () => {
    const result = resetMonthlyMakeupBenefits(selectedMonth);
    showToast(`🔄 Đã chốt ${selectedMonth}: Có ${result.affectedStudentsCount} học sinh (${result.expiredCount} buổi vắng) đã hết hạn và reset quyền lợi học bù.`);
    setIsResetConfirmModalOpen(false);
  };

  // Danh sách học sinh chưa xếp bù để lựa chọn add vào lớp bù
  const unscheduledAbsentCandidates = useMemo(() => {
    const candidates: {
      studentId: string;
      studentName: string;
      studentCode: string;
      classId: string;
      className: string;
      parentName: string;
      parentPhone: string;
      absentDateStr: string;
    }[] = [];

    monthlyAbsentStudents.forEach((stu) => {
      stu.absentSessions.forEach((sess) => {
        if (sess.status === "UNSCHEDULED") {
          candidates.push({
            studentId: stu.studentId,
            studentName: stu.studentName,
            studentCode: stu.studentCode,
            classId: stu.classId,
            className: sess.className,
            parentName: stu.parentName,
            parentPhone: stu.parentPhone,
            absentDateStr: sess.dateStr,
          });
        }
      });
    });

    return candidates;
  }, [monthlyAbsentStudents]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-amber-500/30 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header & Quy chế học bù */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-500 text-slate-950 flex items-center gap-1">
                <CalendarCheck className="w-3.5 h-3.5" /> Quản Trị Học Bù
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/10 text-slate-200">
                Tháng {selectedMonth}
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
              Quản Lý Lớp Học Bù & Quyền Lợi Học Viên
            </h2>
          </div>

          {/* Quick Actions & Tháng */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
              <Calendar className="w-4 h-4 text-amber-400" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
              >
                <option value="Tháng 11/2026" className="text-slate-900 font-bold">Tháng 11/2026 (Hiện tại)</option>
                <option value="Tháng 12/2026" className="text-slate-900 font-bold">Tháng 12/2026 (Kỳ tiếp theo)</option>
                <option value="Tháng 10/2026" className="text-slate-900 font-bold">Tháng 10/2026 (Lịch sử đã reset)</option>
              </select>
            </div>

            <button
              onClick={() => handleOpenSurveyModal()}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
              title="Gửi tin nhắn tự động hỏi về lịch rảnh của học sinh để xếp học bù"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Khảo Sát Lịch Rảnh PH ({summary.unscheduledSessions})</span>
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Lớp Học Bù</span>
            </button>

            <button
              onClick={() => setIsResetConfirmModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
              title="Khi hết tháng, chốt quyền lợi và reset số buổi học bù của các học sinh chưa tham gia"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Kết Thúc Tháng & Reset</span>
            </button>
          </div>
        </div>

        {/* 4 Thẻ KPI Tracking Realtime Theo Từng Ngày */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-700/60">
          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
              <span>Tổng Buổi Vắng Trong Tháng</span>
              <CalendarCheck className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-mono font-extrabold text-white">
              {summary.totalAbsentSessions} Buổi
            </div>
            <div className="text-[10.5px] text-slate-300 mt-1">
              Từ {summary.totalAbsentStudentsCount} học sinh phát sinh vắng
            </div>
          </div>

          <div className="bg-emerald-500/15 backdrop-blur-md p-3.5 rounded-2xl border border-emerald-500/30">
            <div className="flex items-center justify-between text-xs text-emerald-200 mb-1">
              <span>Đã Bù Xong / Đang Xếp</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-mono font-extrabold text-emerald-300">
              {summary.completedSessions + summary.scheduledSessions} / {summary.totalAbsentSessions} Buổi
            </div>
            <div className="text-[10.5px] text-indigo-200 mt-1">
              Trong {summary.activeMakeupClassesCount} lớp học bù đã tạo
            </div>
          </div>

          <div className="bg-amber-500/15 backdrop-blur-md p-3.5 rounded-2xl border border-amber-500/30">
            <div className="flex items-center justify-between text-xs text-amber-200 mb-1">
              <span>Chưa Xếp Bù (Cần Khảo Sát PH)</span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-mono font-extrabold text-amber-300">
              {summary.unscheduledSessions} Buổi Cần Xếp
            </div>
            <div className="text-[10.5px] text-amber-300 font-semibold mt-1">
              Cần liên hệ PH trước khi hết tháng
            </div>
          </div>

          <div className="bg-rose-500/15 backdrop-blur-md p-3.5 rounded-2xl border border-rose-500/30">
            <div className="flex items-center justify-between text-xs text-rose-200 mb-1">
              <span>Mất Quyền Lợi (Hết Hạn Tháng)</span>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-xl font-mono font-extrabold text-rose-300">
              {summary.expiredSessions} Buổi
            </div>
            <div className="text-[10.5px] text-rose-200 mt-1">
              Đã reset khi hết chu kỳ tháng
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Điều Hướng: "CLASSES" vs "ABSENT_STUDENTS" */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto max-w-full scrollbar-thin">
          <button
            onClick={() => setActiveSubTab("CLASSES")}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition flex items-center gap-2 ${
              activeSubTab === "CLASSES"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Lớp Học Bù Đang Quản Lý ({monthMakeupClasses.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab("ABSENT_STUDENTS")}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition flex items-center gap-2 ${
              activeSubTab === "ABSENT_STUDENTS"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Theo Dõi Học Sinh Vắng & Khảo Sát PH ({monthlyAbsentStudents.length})</span>
            {summary.unscheduledSessions > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-mono">
                {summary.unscheduledSessions} cần bù
              </span>
            )}
          </button>
        </div>

        {/* Tìm kiếm */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tên lớp, học sinh, SĐT phụ huynh..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: DANH SÁCH LỚP HỌC BÙ (CLASSES VIEW) */}
      {/* ========================================================================= */}
      {activeSubTab === "CLASSES" && (
        <div className="space-y-4">
          {monthMakeupClasses.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <CalendarCheck className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-800 text-base">Chưa có lớp học bù nào trong {selectedMonth}</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Hiện tại chưa có lớp học bù nào được tạo trong tháng này. Admin có thể tạo lớp học bù mới và add các học sinh vắng vào sau khi khảo sát với phụ huynh.
              </p>
              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition inline-flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo Lớp Học Bù Đầu Tiên</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {monthMakeupClasses.map((mc) => {
                const [y, m, d] = mc.dateStr.split("-");
                const formattedDate = `${d}/${m}/${y}`;

                return (
                  <div
                    key={mc.id}
                    className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition space-y-4 flex flex-col justify-between"
                  >
                    <div>
                      {/* Class Header */}
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {isMakeupClassPast(mc) ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-200 text-slate-800 border border-slate-300 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" /> Đã Diễn Ra / Kết Thúc
                              </span>
                            ) : (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                mc.status === "SCHEDULED"
                                  ? "bg-indigo-100 text-indigo-900 border border-indigo-200"
                                  : mc.status === "COMPLETED"
                                  ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                                  : "bg-slate-100 text-slate-700"
                              }`}>
                                {mc.status === "SCHEDULED" ? "Đã Lên Lịch" : mc.status === "COMPLETED" ? "✓ Đã Hoàn Thành" : "Đã Hủy"}
                              </span>
                            )}
                            <span className="text-[11px] text-slate-500 font-medium">
                              {mc.monthStr}
                            </span>
                            <span className="text-[10.5px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                              ⚡ Lớp Học Bù
                            </span>
                          </div>
                          <h3 className="font-black text-slate-900 text-base leading-snug">
                            {mc.title}
                          </h3>
                          <div className="text-xs text-indigo-700 font-semibold mt-1">
                            Lớp áp dụng: <strong>{mc.targetClassName || "Ghép liên lớp (Tất cả học sinh)"}</strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleOpenEditModal(mc)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                            title="Chỉnh sửa thông tin lớp bù"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Bạn có chắc muốn xóa lớp học bù "${mc.title}"?`)) {
                                deleteMakeupClass(mc.id);
                                showToast(`✓ Đã xóa lớp học bù "${mc.title}"!`);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition"
                            title="Xóa lớp học bù"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Class Details */}
                      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                        <div className="flex items-center gap-2 text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>Ngày: <strong>{formattedDate}</strong></span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>Giờ: <strong>{mc.startTime} - {mc.endTime}</strong> ({mc.durationHours || 1.5}h)</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700">
                          <DoorOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>Phòng: <strong className="truncate">{mc.classroomName}</strong></span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700">
                          <GraduationCap className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>Phụ trách: <strong className="truncate">{mc.teacherOrAssistantName} ({mc.roleInCharge === "TEACHER" ? "GV" : "TA"})</strong></span>
                        </div>
                      </div>

                      {/* Thù lao & Tính công cho GV / TA */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 mt-3 text-xs">
                        <div>
                          <span className="text-slate-500 text-[11px] block">Tính công & Lương nhân sự:</span>
                          <span className="font-bold text-slate-900">
                            {mc.durationHours || 1.5} giờ dạy • {mc.teacherOrAssistantName}
                          </span>
                        </div>
                        {mc.isSalaryRecorded ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center gap-1 border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>✓ Đã Tính Lương</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRecordSalary(mc)}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition shadow-xs flex items-center gap-1"
                            title="Tính lương ca học bù và cộng vào bảng công của nhân sự phụ trách"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Tính Lương Ca Bù</span>
                          </button>
                        )}
                      </div>

                      {/* Focus Content */}
                      <div className="p-2.5 bg-slate-50 rounded-xl mt-3 text-xs text-slate-600">
                        <span className="font-bold text-slate-800 block mb-0.5">Trọng tâm ôn tập:</span>
                        <p className="line-clamp-2 text-[11px] leading-relaxed">{mc.focusContent}</p>
                      </div>

                      {/* Lesson Content Sent Notice if Any */}
                      {mc.contentSentToParentsAt && (
                        <div className="p-2 rounded-xl bg-purple-50 border border-purple-200 mt-2 text-xs flex items-center justify-between">
                          <span className="text-purple-900 font-medium text-[11px] flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                            <span>Đã gửi nội dung bài học & dặn dò cho phụ huynh</span>
                          </span>
                          <span className="text-[10px] text-purple-700 font-mono">
                            {new Date(mc.contentSentToParentsAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      )}

                      {/* Students List in Makeup Class */}
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-indigo-600" />
                            Danh sách học sinh & Điểm danh ({mc.students.length}):
                          </span>
                          {isMakeupClassPast(mc) ? (
                            <span
                              className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-400 font-bold text-[11px] flex items-center gap-1 cursor-not-allowed border border-slate-200"
                              title="Lớp học bù đã diễn ra trong quá khứ, không thể xếp thêm học sinh"
                            >
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>Đã Kết Thúc</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleOpenAddStudent(mc.id)}
                              className="px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Học Sinh</span>
                            </button>
                          )}
                        </div>

                        {mc.students.length === 0 ? (
                          <div className="p-3 text-center bg-slate-50 rounded-xl text-slate-400 text-xs italic">
                            Chưa có học sinh đăng ký.
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                            {mc.students.map((st) => (
                              <div
                                key={`${st.studentId}-${st.absentDateStr}`}
                                className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                              >
                                <div>
                                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <span>{st.studentName}</span>
                                    <span className="text-[10px] font-mono text-slate-500">({st.studentCode})</span>
                                  </div>
                                  <div className="text-[10.5px] text-slate-500">
                                    Bù buổi vắng ngày: <strong className="text-rose-700">{st.absentDateStr}</strong> — Lớp: {st.originalClassName}
                                  </div>
                                  {st.exchangeNote && (
                                    <div className="text-[10px] text-indigo-800 font-medium italic mt-0.5">
                                      💬 &quot;{st.exchangeNote}&quot;
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                  {/* Trạng thái điểm danh buổi bù (Do Trợ giảng thực hiện - Admin kiểm soát) */}
                                  {st.attendanceStatus === "ATTENDED" && (
                                    <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10.5px] flex items-center gap-1 shadow-2xs">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Có Mặt
                                    </span>
                                  )}
                                  {st.attendanceStatus === "ABSENT" && (
                                    <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-900 border border-rose-300 font-bold text-[10.5px] flex items-center gap-1 shadow-2xs" title="Vắng buổi bù - không cộng dồn vắng & bảo lưu quyền lợi">
                                      <XCircle className="w-3 h-3 text-rose-700" /> Vắng (Bảo Lưu)
                                    </span>
                                  )}
                                  {st.attendanceStatus === "REGISTERED" && (
                                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 text-[10.5px]">
                                      Chờ TA Điểm Danh
                                    </span>
                                  )}

                                  {/* Trạng thái gửi tin nhắn */}
                                  {st.notifiedAt ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-800" title={`Đã gửi thông báo lúc ${st.notifiedAt}`}>
                                      Đã Báo
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-100 text-amber-800">
                                      Chưa Báo
                                    </span>
                                  )}

                                  {/* Gỡ học sinh */}
                                  <button
                                    onClick={() => {
                                      if (confirm(`Gỡ học sinh ${st.studentName} khỏi lớp học bù này?`)) {
                                        removeStudentFromMakeupClass(mc.id, st.studentId, st.absentDateStr);
                                        showToast(`✓ Đã gỡ bé ${st.studentName} khỏi lớp bù.`);
                                      }
                                    }}
                                    className="p-1 rounded text-slate-400 hover:text-rose-600 transition"
                                    title="Gỡ khỏi lớp bù"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200/80 text-[11px] text-purple-950 space-y-1">
                          <div className="flex items-center justify-between font-bold text-purple-900">
                            <span className="flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-purple-700" />
                              <span>Điểm danh & nội dung bài học</span>
                            </span>
                            <span className="text-[10px] text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200">
                              Admin Giám Sát
                            </span>
                          </div>
                          <div className="text-[10.5px] text-emerald-800 font-semibold pt-0.5 flex items-center justify-between">
                            <span>💰 <strong>Thù lao ca dạy ({mc.durationHours || 1.5}h):</strong> Đã tính vào bảng công của <strong>{mc.teacherOrAssistantName}</strong>.</span>
                            {mc.contentSentToParentsAt && (
                              <span className="text-emerald-700 font-bold">
                                ✓ Đã gửi nội dung cho PH
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Class Action Footer */}
                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => handleOpenContentModal(mc)}
                        className="flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 shadow-xs"
                        title="Xem nội dung bài học do Trợ giảng gửi phụ huynh"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                        <span>{mc.contentSentToParentsAt ? "Xem Báo Cáo Buổi Bù" : "Kiểm Tra Báo Cáo Buổi Bù"}</span>
                      </button>

                      <button
                        onClick={() => handleOpenMessaging(mc)}
                        disabled={mc.students.length === 0}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs ${
                          mc.students.length === 0
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white"
                        }`}
                        title="Gửi tin nhắn thông báo lịch học bù tới phụ huynh"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Báo Lịch ({mc.students.length})</span>
                      </button>

                      {mc.status === "SCHEDULED" ? (
                        <button
                          onClick={() => {
                            updateMakeupClass(mc.id, { status: "COMPLETED" });
                            showToast(`✓ Đã đánh dấu hoàn thành buổi học bù "${mc.title}"!`);
                          }}
                          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1 shadow-xs"
                          title="Đánh dấu buổi học bù đã diễn ra và hoàn thành"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Hoàn Thành</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            updateMakeupClass(mc.id, { status: "SCHEDULED" });
                            showToast(`🔄 Đã chuyển lớp "${mc.title}" về trạng thái Đã Lên Lịch.`);
                          }}
                          className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
                        >
                          Mở Lại Lớp
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: THEO DÕI HỌC SINH VẮNG & KHẢO SÁT LỊCH RẢNH */}
      {/* ========================================================================= */}
      {activeSubTab === "ABSENT_STUDENTS" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-500" />
                <span>Danh Sách Học Sinh Vắng ({selectedMonth})</span>
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleOpenSurveyModal()}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Khảo Sát Lịch Rảnh Cho Toàn Bộ PH</span>
              </button>

              {/* Filter pills */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setStatusFilter("ALL")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    statusFilter === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Tất cả ({monthlyAbsentStudents.length})
                </button>
                <button
                  onClick={() => setStatusFilter("UNSCHEDULED")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    statusFilter === "UNSCHEDULED" ? "bg-rose-500 text-white shadow-xs" : "text-rose-700 hover:bg-rose-100/50"
                  }`}
                >
                  Chưa xếp bù ({summary.unscheduledSessions})
                </button>
                <button
                  onClick={() => setStatusFilter("SCHEDULED")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    statusFilter === "SCHEDULED" ? "bg-indigo-600 text-white shadow-xs" : "text-indigo-700 hover:bg-indigo-100/50"
                  }`}
                >
                  Đã xếp bù ({summary.scheduledSessions})
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse text-xs min-w-[850px]">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Học Sinh & Lớp Chính</th>
                  <th className="py-3 px-3">Phụ Huynh & SĐT</th>
                  <th className="py-3 px-3 text-center">Số Buổi Vắng Trong Tháng</th>
                  <th className="py-3 px-4">Chi Tiết Ngày Vắng (Theo Lịch Realtime)</th>
                  <th className="py-3 px-3">Tình Trạng Học Bù</th>
                  <th className="py-3 px-4 text-center">Thao Tác Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyAbsentStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400 italic">
                      🎉 Tuyệt vời! Không có học sinh nào vắng mặt trong {selectedMonth}.
                    </td>
                  </tr>
                ) : (
                  monthlyAbsentStudents
                    .filter((stu) => {
                      if (statusFilter === "UNSCHEDULED") return stu.unscheduledCount > 0;
                      if (statusFilter === "SCHEDULED") return stu.scheduledCount > 0;
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        stu.studentName.toLowerCase().includes(q) ||
                        stu.studentCode.toLowerCase().includes(q) ||
                        stu.parentName.toLowerCase().includes(q) ||
                        stu.parentPhone.includes(q)
                      );
                    })
                    .map((stu) => (
                      <tr key={stu.studentId} className="hover:bg-slate-50 transition">
                        {/* Học sinh & Lớp */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{stu.studentName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{stu.studentCode}</div>
                          <div className="text-[11px] text-indigo-700 font-medium">{stu.className}</div>
                        </td>

                        {/* Phụ huynh */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">{stu.parentName}</div>
                          <div className="font-mono text-slate-500 text-[11px] flex items-center gap-1">
                            <PhoneCall className="w-3 h-3 text-slate-400" />
                            <span>{stu.parentPhone}</span>
                          </div>
                        </td>

                        {/* Số buổi vắng */}
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 font-mono font-bold text-rose-800 text-xs">
                            <span>{stu.totalAbsentCount} buổi</span>
                          </div>
                          {stu.unscheduledCount > 0 && (
                            <span className="text-[10px] text-rose-600 block mt-0.5 font-bold">
                              Chưa bù: {stu.unscheduledCount}
                            </span>
                          )}
                        </td>

                        {/* Chi tiết từng buổi vắng (tinh giản, không cần lý do) */}
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1.5 max-w-sm">
                            {stu.absentSessions.map((sess) => (
                              <div
                                key={sess.id}
                                className={`px-2 py-1 rounded-lg text-[10.5px] border flex items-center gap-1 font-mono ${
                                  sess.status === "UNSCHEDULED"
                                    ? "bg-rose-50 border-rose-200 text-rose-900 font-bold"
                                    : sess.status === "SCHEDULED"
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-900 font-bold"
                                    : sess.status === "COMPLETED"
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-900 font-bold"
                                    : "bg-slate-100 border-slate-200 text-slate-400 line-through"
                                }`}
                              >
                                <span>{sess.dateStr}</span>
                                <span className="text-[9px] px-1 rounded bg-black/10">
                                  {sess.status === "UNSCHEDULED" ? "Chưa bù" : sess.status === "SCHEDULED" ? "Đã xếp" : sess.status === "COMPLETED" ? "Đã bù" : "Hết hạn"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Tình trạng học bù & Trao đổi */}
                        <td className="py-3 px-3">
                          {stu.unscheduledCount > 0 ? (
                            <div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                Cần Khảo Sát Lịch PH
                              </span>
                              <div className="text-[10px] text-slate-500 mt-1">
                                Còn {stu.unscheduledCount} buổi cần xếp
                              </div>
                            </div>
                          ) : stu.completedCount === stu.totalAbsentCount ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                              ✓ Đã Bù Đủ
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
                              Đã Xếp Lớp Bù
                            </span>
                          )}
                        </td>

                        {/* Thao tác */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {stu.unscheduledCount > 0 && (
                              <button
                                onClick={() => handleOpenSurveyModal(stu.studentId)}
                                className="px-2 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition flex items-center gap-1 border border-indigo-200"
                                title="Gửi tin nhắn khảo sát lịch rảnh cho phụ huynh bé (Cổng App)"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Khảo Sát</span>
                              </button>
                            )}

                            {stu.unscheduledCount > 0 && monthMakeupClasses.length > 0 ? (
                              <button
                                onClick={() => {
                                  const upcomingClasses = monthMakeupClasses.filter((m) => !isMakeupClassPast(m));
                                  if (upcomingClasses.length === 0) {
                                    alert(`⚠️ Tất cả ${monthMakeupClasses.length} lớp học bù trong ${selectedMonth} đã diễn ra hoặc kết thúc!\n\nVui lòng bấm "Tạo Lớp Học Bù Mới" với ngày giờ trong tương lai để xếp học sinh.`);
                                    handleOpenCreateModal();
                                    return;
                                  }
                                  const unsched = stu.absentSessions.find((s) => s.status === "UNSCHEDULED");
                                  if (unsched) {
                                    const matchingClass = upcomingClasses.find((m) => m.targetClassId === stu.classId) || upcomingClasses[0];
                                    handleOpenAddStudent(matchingClass.id, stu.studentId, unsched.dateStr);
                                  }
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-1 shadow-xs cursor-pointer"
                                title="Xếp học sinh vào lớp học bù chưa diễn ra"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Xếp Bù</span>
                              </button>
                            ) : stu.unscheduledCount > 0 ? (
                              <button
                                onClick={() => {
                                  alert(`Chưa có lớp học bù nào được tạo trong ${selectedMonth}. Vui lòng bấm "Tạo Lớp Học Bù Mới" trước khi xếp!`);
                                  handleOpenCreateModal();
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Tạo Lớp Bù</span>
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-end">
            <span className="font-semibold text-slate-700">
              Tổng số học sinh vắng: {monthlyAbsentStudents.length} em ({summary.totalAbsentSessions} lượt)
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TẠO / CHỈNH SỬA LỚP HỌC BÙ TRONG THÁNG (CÓ CHỌN LỚP MỤC TIÊU) */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-amber-500" />
                  <span>{editingMakeupClass ? "Chỉnh Sửa Lớp Học Bù" : `Tạo Lớp Học Bù Mới (${selectedMonth})`}</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Lớp học bù chỉ có giá trị trong tháng và được reset vào tháng tiếp theo.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Tên lớp bù */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Tên lớp học bù:
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="VD: Lớp Học Bù Shiny Kids - Ôn Tập & Củng Cố Unit 4"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Lớp học áp dụng */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Chọn lớp học mục tiêu áp dụng:
                </label>
                <select
                  value={formTargetClassId}
                  onChange={(e) => setFormTargetClassId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                >
                  <option value="ALL">Ghép liên lớp (Tất cả các lớp / Học sinh mọi trình độ)</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code}) - {c.courseName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ngày học bù & Giờ học & Thời lượng */}
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Ngày học bù:</label>
                  <input
                    type="date"
                    value={formDateStr}
                    onChange={(e) => setFormDateStr(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Giờ bắt đầu:</label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full px-2 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Giờ kết thúc:</label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full px-2 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Số giờ dạy (để tính lương GV/TA) */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Thời lượng ca dạy (giờ) - Dùng tính lương cho GV/TA:
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="4"
                  value={formDurationHours}
                  onChange={(e) => setFormDurationHours(parseFloat(e.target.value) || 1.5)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Phòng học & Giáo viên / TA phụ trách */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phòng học:</label>
                  <select
                    value={formClassroomId}
                    onChange={(e) => setFormClassroomId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  >
                    {classrooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Người phụ trách (GV / TA):</label>
                  <select
                    value={formStaffId}
                    onChange={(e) => setFormStaffId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  >
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.role === "TEACHER" ? "Giáo viên" : "Trợ giảng"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Trọng tâm nội dung buổi học bù */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nội dung / Trọng tâm ôn tập buổi học bù:
                </label>
                <textarea
                  rows={2}
                  value={formFocusContent}
                  onChange={(e) => setFormFocusContent(e.target.value)}
                  placeholder="Ghi rõ kiến thức cần bù, bài tập cần chữa, sách mang theo..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Ghi chú */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Ghi chú thêm:</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ghi chú nội bộ dành cho Admin..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                🛡️ <strong>Chính sách trung tâm:</strong> Lớp học bù phải diễn ra trong tháng. Học sinh không tham gia trong tháng sẽ bị hết hạn quyền lợi khi reset sang tháng mới.
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveClass}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{editingMakeupClass ? "Lưu Thay Đổi" : "Tạo Lớp Học Bù"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD HỌC SINH VÀO LỚP HỌC BÙ SAU KHI TRAO ĐỔI VỚI PHỤ HUYNH */}
      {/* ========================================================================= */}
      {addingToClassId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-600" />
                  <span>Thêm Học Sinh Vào Lớp Học Bù</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Chọn học sinh vắng trong tháng và ghi chú thỏa thuận với phụ huynh.
                </p>
              </div>
              <button
                onClick={() => setAddingToClassId(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* CHỌN LỚP HỌC BÙ DỰA TRÊN DANH SÁCH ĐÃ TẠO */}
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  1. Chọn lớp học bù muốn xếp vào (từ danh sách đã tạo trong {selectedMonth}):
                </label>
                <select
                  value={addingToClassId || ""}
                  onChange={(e) => setAddingToClassId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50/70 text-indigo-950 font-bold text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {monthMakeupClasses.map((mc) => {
                    const isPast = isMakeupClassPast(mc);
                    return (
                      <option
                        key={mc.id}
                        value={mc.id}
                        disabled={isPast}
                        className={isPast ? "text-slate-400 bg-slate-100" : ""}
                      >
                        {isPast ? `⛔ [ĐÃ KẾT THÚC] ` : `⚡ `}
                        {mc.title} ({formatDisplayDate(mc.dateStr)} • {mc.startTime}-{mc.endTime} • {mc.classroomName} • {mc.students.length} HS)
                      </option>
                    );
                  })}
                </select>
                {monthMakeupClasses.find((m) => m.id === addingToClassId) && (
                  <div className="text-[10.5px] mt-1 space-y-1">
                    <div className="text-indigo-700 flex items-center justify-between">
                      <span>Phụ trách: <strong>{monthMakeupClasses.find((m) => m.id === addingToClassId)?.teacherOrAssistantName}</strong></span>
                      <span>Lớp áp dụng: <strong>{monthMakeupClasses.find((m) => m.id === addingToClassId)?.targetClassName || "Ghép liên lớp"}</strong></span>
                    </div>
                    {isMakeupClassPast(monthMakeupClasses.find((m) => m.id === addingToClassId)!) && (
                      <div className="p-2.5 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 font-bold flex items-center gap-1.5 shadow-2xs">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>CẢNH BÁO: Lớp học bù này đã diễn ra trong quá khứ! Hệ thống đã khóa và không cho phép xếp học sinh vào lớp đã kết thúc. Vui lòng chọn lớp học bù khác diễn ra trong tương lai.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  2. Chọn học sinh & buổi vắng cần bù trong {selectedMonth}:
                </label>
                {unscheduledAbsentCandidates.length === 0 ? (
                  <div className="p-3 bg-amber-50 text-amber-900 rounded-xl text-xs">
                    Tất cả học sinh vắng trong tháng đã được xếp vào các lớp học bù!
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50">
                    {unscheduledAbsentCandidates.map((cand) => {
                      const isSelected = selectedStudentForAdd?.studentId === cand.studentId && selectedStudentForAdd?.absentDateStr === cand.absentDateStr;

                      return (
                        <div
                          key={`${cand.studentId}-${cand.absentDateStr}`}
                          onClick={() => setSelectedStudentForAdd({ studentId: cand.studentId, absentDateStr: cand.absentDateStr })}
                          className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                              : "bg-white text-slate-800 border-slate-200 hover:border-indigo-300"
                          }`}
                        >
                          <div>
                            <div className="font-bold flex items-center gap-1.5">
                              <span>{cand.studentName}</span>
                              <span className={`text-[10px] ${isSelected ? "text-indigo-200" : "text-slate-500"}`}>
                                ({cand.studentCode})
                              </span>
                            </div>
                            <div className={`text-[10.5px] mt-0.5 ${isSelected ? "text-indigo-100" : "text-slate-500"}`}>
                              Vắng ngày: <strong>{cand.absentDateStr}</strong> — Lớp: {cand.className}
                            </div>
                            <div className={`text-[10px] ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                              PH: {cand.parentName} ({cand.parentPhone})
                            </div>
                          </div>

                          <span className={`text-[11px] font-bold px-2 py-1 rounded-lg ${
                            isSelected ? "bg-white text-indigo-900" : "bg-slate-100 text-slate-700"
                          }`}>
                            {isSelected ? "✓ Đang chọn" : "Chọn"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Ghi chú sau khi trao đổi với phụ huynh */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Ghi chú kết quả trao đổi với phụ huynh:
                </label>
                <textarea
                  rows={2}
                  value={exchangeNote}
                  onChange={(e) => setExchangeNote(e.target.value)}
                  placeholder="Ví dụ: Đã gọi mẹ lúc 15h, mẹ xác nhận bé đã khỏe và rảnh sáng Chủ Nhật tham gia học bù..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-500 leading-relaxed">
                📞 <strong>Lời khuyên:</strong> Nên gọi điện thoại trực tiếp hoặc nhắn tin Zalo với phụ huynh để thống nhất khung giờ trước khi xếp lớp, đảm bảo bé đi học bù đầy đủ.
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAddingToClassId(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmAddStudent}
                disabled={!selectedStudentForAdd || (monthMakeupClasses.find((m) => m.id === addingToClassId) ? isMakeupClassPast(monthMakeupClasses.find((m) => m.id === addingToClassId)!) : false)}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 ${
                  !selectedStudentForAdd || (monthMakeupClasses.find((m) => m.id === addingToClassId) ? isMakeupClassPast(monthMakeupClasses.find((m) => m.id === addingToClassId)!) : false)
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Xác Nhận Thêm Học Sinh</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: GỬI TIN NHẮN THÔNG BÁO LỊCH HỌC BÙ (SMS / APP / ZALO) */}
      {/* ========================================================================= */}
      {messagingClass && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-600" />
                  <span>Gửi Tin Nhắn Thông Báo Lịch Học Bù</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Gửi thông báo qua Cổng Phụ Huynh (App), Zalo ZNS và tin nhắn SMS.
                </p>
              </div>
              <button
                onClick={() => setMessagingClass(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Chọn gửi cho ai */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Đối tượng nhận tin:</label>
                <select
                  value={selectedMsgStudentId}
                  onChange={(e) => handleSelectMsgStudent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">Gửi cho toàn bộ phụ huynh trong lớp ({messagingClass.students.length} phụ huynh)</option>
                  {messagingClass.students.map((st) => {
                    const studentObj = students.find((s) => s.id === st.studentId);
                    const pPhone = studentObj?.parentPhone || st.parentPhone;
                    const pName = studentObj?.parentName || st.parentName;
                    const sName = studentObj?.fullName || st.studentName;
                    return (
                      <option key={st.studentId} value={st.studentId}>
                        PH em {sName} ({pName} - {pPhone})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Mẫu tin nhắn có thể chỉnh sửa tự do trước khi gửi */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 block">
                    Nội dung tin nhắn (Admin chỉnh sửa câu từ tự do):
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (!messagingClass) return;
                      const targetStudent = messagingClass.students.find((s) => s.studentId === selectedMsgStudentId);
                      setCustomMakeupMsg(generateMakeupNotificationMessage(
                        selectedMsgStudentId === "ALL" ? "[Tên Học Sinh]" : targetStudent?.studentName || "",
                        selectedMsgStudentId === "ALL" ? "[Tên Phụ Huynh]" : targetStudent?.parentName || "",
                        messagingClass,
                        selectedMsgStudentId === "ALL" ? "[Ngày Vắng]" : targetStudent?.absentDateStr
                      ));
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    Khôi phục mẫu
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={customMakeupMsg}
                  onChange={(e) => setCustomMakeupMsg(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-[11px] text-slate-800 leading-relaxed"
                />
              </div>

              {/* CHỈ DẪN KÊNH GỬI RÕ RÀNG */}
              <div className="p-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200 rounded-2xl text-xs space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-700 text-white font-black text-[10.5px]">
                    💬 KÊNH GỬI: ZALO TRỰC TIẾP
                  </span>
                  <span className="font-semibold text-emerald-950">
                    Bắn tin Zalo trực tiếp tới SĐT phụ huynh {selectedMsgStudentId === "ALL" ? `(Hàng đợi 2-3 phút cho cả ${messagingClass.students.length} PH)` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-indigo-900 text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold text-[10px] border border-indigo-200">
                    📲 KÊNH NỘI BỘ
                  </span>
                  <span>Đồng thời thông báo tự động xuất hiện trên Sổ liên lạc Cổng Phụ Huynh</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMessagingClass(null)}
                className="py-2.5 px-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmSendMessage}
                className="py-2.5 px-3 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Chỉ phát hành thông báo lên Sổ liên lạc Cổng Phụ Huynh (không gửi tin Zalo ra ngoài)"
              >
                <span>📲</span>
                <span>Chỉ Gửi Cổng App</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!messagingClass) return;
                  const targetStudent = messagingClass.students.find((s) => s.studentId === selectedMsgStudentId);

                  if (selectedMsgStudentId !== "ALL" && targetStudent) {
                    const studentObj = students.find((s) => s.id === targetStudent.studentId);
                    const effectivePhone = studentObj?.parentPhone || targetStudent.parentPhone;
                    const effectiveParent = studentObj?.parentName || targetStudent.parentName || "Phụ huynh";
                    const effectiveName = studentObj?.fullName || targetStudent.studentName;

                    if (effectivePhone) {
                      await sendZaloMessageToParent({
                        recipientPhone: effectivePhone,
                        recipientName: effectiveParent,
                        studentId: targetStudent.studentId,
                        studentName: effectiveName,
                        className: messagingClass.title,
                        messageType: "MAKEUP_NOTICE",
                        title: `Lịch Học Bù: ${messagingClass.title}`,
                        content: customMakeupMsg,
                        senderRole: "ADMIN",
                        openChatWindow: false,
                      });
                    }
                    showToast(`⚡ Đã tự động gửi thông báo lịch học bù tới PH bé ${effectiveName} qua Zalo!`);
                    sendMakeupClassNotification(messagingClass.id, [targetStudent.studentId]);
                  } else {
                    // Gửi toàn bộ học sinh trong ca bù: kích hoạt hàng đợi giãn cách 2-3 phút chống spam
                    const items: ZaloQueueItem[] = messagingClass.students.map((st) => {
                      const studentObj = students.find((s) => s.id === st.studentId);
                      const msg = generateMakeupNotificationMessage(
                        st.studentName,
                        st.parentName,
                        messagingClass,
                        st.absentDateStr
                      );
                      return {
                        id: `makeup-notice-${messagingClass.id}-${st.studentId}`,
                        studentId: st.studentId,
                        studentName: st.studentName,
                        parentName: st.parentName,
                        parentPhone: st.parentPhone || studentObj?.parentPhone || "",
                        className: messagingClass.title,
                        messageType: "MAKEUP_NOTICE",
                        title: `Lịch Học Bù: ${messagingClass.title}`,
                        content: msg,
                        isFriended: studentObj?.zaloFriendshipStatus !== "NOT_FRIENDED",
                        status: "PENDING",
                      };
                    });

                    setZaloQueueTitle(`Hàng Đợi Gửi Lịch Học Bù: ${messagingClass.title} (${items.length} PH - Giãn Cách 2-3 Phút)`);
                    setZaloQueueItems(items);
                    setIsZaloQueueOpen(true);
                    sendMakeupClassNotification(messagingClass.id);
                    showToast(`🛡️ Đã bật Hàng đợi tự động gửi lịch bù (${items.length} phụ huynh - giãn cách 2-3 phút chống spam)!`);
                  }
                  setMessagingClass(null);
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Bắn tin nhắn Zalo trực tiếp tới SĐT phụ huynh (không cần Ctrl+V)"
              >
                <Send className="w-4 h-4" />
                <span>{selectedMsgStudentId === "ALL" ? `💬 Bật Hàng Đợi Gửi Zalo (${messagingClass.students.length} PH)` : `💬 Bắn Tin Zalo Cho PH`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: KHẢO SÁT LỊCH RẢNH CỦA HỌC SINH ĐỂ XẾP HỌC BÙ (ADMIN TỰ SOẠN MẪU) */}
      {/* ========================================================================= */}
      {isSurveyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-600" />
                  <span>Khảo Sát Lịch Rảnh Học Sinh Để Xếp Bù ({selectedMonth})</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Gửi tin nhắn tự động hỏi về lịch rảnh của học sinh vắng. Admin tự soạn nội dung theo mẫu linh hoạt.
                </p>
              </div>
              <button
                onClick={() => setIsSurveyModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Chọn phụ huynh nhận khảo sát */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">
                    Chọn phụ huynh nhận tin khảo sát ({surveySelectedStudentIds.length}/{monthlyAbsentStudents.filter(s => s.unscheduledCount > 0).length}):
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const allUnscheduled = monthlyAbsentStudents.filter((s) => s.unscheduledCount > 0).map((s) => s.studentId);
                      if (surveySelectedStudentIds.length === allUnscheduled.length) {
                        setSurveySelectedStudentIds([]);
                      } else {
                        setSurveySelectedStudentIds(allUnscheduled);
                      }
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    {surveySelectedStudentIds.length === monthlyAbsentStudents.filter(s => s.unscheduledCount > 0).length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                  </button>
                </div>

                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50 space-y-1">
                  {monthlyAbsentStudents
                    .filter((s) => s.unscheduledCount > 0)
                    .map((s) => {
                      const isChecked = surveySelectedStudentIds.includes(s.studentId);
                      return (
                        <label
                          key={s.studentId}
                          className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:bg-indigo-50/50"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSurveySelectedStudentIds((prev) => [...prev, s.studentId]);
                                } else {
                                  setSurveySelectedStudentIds((prev) => prev.filter((id) => id !== s.studentId));
                                }
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <div>
                              <span className="font-bold text-slate-900">{s.studentName}</span>
                              <span className="text-[10px] text-slate-500 ml-1">({s.className})</span>
                              <div className="text-[10px] text-slate-400">PH: {students.find((stu) => stu.id === s.studentId)?.parentName || s.parentName} ({students.find((stu) => stu.id === s.studentId)?.parentPhone || s.parentPhone})</div>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-100 text-rose-800">
                            {s.unscheduledCount} buổi chưa bù
                          </span>
                        </label>
                      );
                    })}
                </div>
              </div>

              {/* Ô soạn tin nhắn mẫu tùy chỉnh */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Soạn tin nhắn khảo sát (Admin chỉnh sửa tự do):</label>
                  <button
                    type="button"
                    onClick={() => setSurveyTemplate(DEFAULT_SURVEY_TEMPLATE)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    Khôi phục mẫu chuẩn
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={surveyTemplate}
                  onChange={(e) => setSurveyTemplate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
                <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-500 mt-1">
                  <span className="font-bold">Các biến tự động:</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-200 font-mono">&#123;studentName&#125;</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-200 font-mono">&#123;parentName&#125;</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-200 font-mono">&#123;month&#125;</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-200 font-mono">&#123;className&#125;</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-200 font-mono">&#123;absentCount&#125;</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-200 font-mono">&#123;absentDates&#125;</span>
                </div>
              </div>

              {/* Live Preview tin nhắn */}
              {surveySelectedStudentIds.length > 0 && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Xem trước tin nhắn thực tế gửi cho phụ huynh đầu tiên:</label>
                  {(() => {
                    const firstStudent = monthlyAbsentStudents.find((s) => s.studentId === surveySelectedStudentIds[0]);
                    if (!firstStudent) return null;
                    const previewDates = firstStudent.absentSessions.filter((sess) => sess.status === "UNSCHEDULED").map((sess) => sess.dateStr);
                    const previewMsg = (() => {
                      try {
                        return renderZaloTemplate("makeupSurvey", {
                          studentName: firstStudent.studentName,
                          parentName: firstStudent.parentName,
                          absentCount: String(firstStudent.unscheduledCount),
                          absentDates: previewDates.join(", "),
                          month: selectedMonth,
                          className: firstStudent.className,
                        });
                      } catch {
                        return generateMakeupSurveyMessage(
                          firstStudent.studentName,
                          firstStudent.parentName,
                          firstStudent.unscheduledCount,
                          previewDates,
                          selectedMonth,
                          firstStudent.className,
                          surveyTemplate
                        );
                      }
                    })();
                    return (
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 font-mono text-[11px] text-slate-800 whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto">
                        {previewMsg}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* CHỈ DẪN KÊNH RÕ RÀNG */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 text-xs">
                <div className="font-bold text-amber-950 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>CHỈ DẪN PHÂN BIỆT 2 KÊNH GỬI THÔNG BÁO</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700">
                  <div className="p-2 rounded-xl bg-white border border-amber-100 shadow-2xs">
                    <span className="font-bold text-emerald-700 block mb-0.5">💬 Kênh Zalo Trực Tiếp (Bên Ngoài)</span>
                    Gửi tin nhắn trực tiếp tới số Zalo của phụ huynh. Gửi từ 2 phụ huynh trở lên sẽ kích hoạt Hàng đợi giãn cách 2-3 phút/tin để bảo vệ tài khoản khỏi quét spam.
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-amber-100 shadow-2xs">
                    <span className="font-bold text-indigo-700 block mb-0.5">📲 Kênh Nội Bộ Cổng Phụ Huynh</span>
                    Đăng thông báo khảo sát trực tiếp vào Sổ liên lạc Cổng Phụ Huynh trên ứng dụng web, phụ huynh đăng nhập bằng SĐT là thấy ngay lập tức.
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSurveyModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={() => handleConfirmSendSurvey("APP_ONLY")}
                disabled={surveySelectedStudentIds.length === 0}
                className={`w-full sm:flex-1 py-2.5 rounded-xl font-bold text-xs border transition flex items-center justify-center gap-1.5 ${
                  surveySelectedStudentIds.length === 0
                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                    : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 shadow-xs cursor-pointer"
                }`}
                title="Chỉ cập nhật thông báo khảo sát lên Sổ liên lạc Cổng Phụ Huynh (không gửi Zalo)"
              >
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                <span>📲 Chỉ Gửi Cổng App ({surveySelectedStudentIds.length})</span>
              </button>
              <button
                type="button"
                onClick={() => handleConfirmSendSurvey("ZALO_AND_APP")}
                disabled={surveySelectedStudentIds.length === 0}
                className={`w-full sm:flex-1 py-2.5 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 ${
                  surveySelectedStudentIds.length === 0
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                }`}
                title="Bật hàng đợi tự động gửi Zalo tới từng phụ huynh (giãn cách 2-3 phút) kèm đồng bộ Cổng Phụ Huynh"
              >
                <Send className="w-4 h-4" />
                <span>💬 Bật Hàng Đợi Gửi Zalo ({surveySelectedStudentIds.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: TRỢ GIẢNG / GIÁO VIÊN GỬI NỘI DUNG HỌC BÙ CHO PHỤ HUYNH */}
      {/* ========================================================================= */}
      {contentModalClass && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                  <span>Báo Cáo Nội Dung Buổi Bù (Trợ Giảng phụ trách - Admin kiểm soát)</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Lớp: <strong>{contentModalClass.title}</strong> • Phụ trách: <strong>{contentModalClass.teacherOrAssistantName}</strong>
                </p>
              </div>
              <button
                onClick={() => setContentModalClass(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Chỉ dẫn kênh minh bạch */}
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl text-xs space-y-1.5 text-purple-900 leading-relaxed">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-purple-600" />
                  <span>CHỈ DẪN KÊNH BÁO CÁO NỘI DUNG BUỔI BÙ</span>
                </div>
                <div className="text-[11px] text-slate-700">
                  Báo cáo này được cập nhật trực tiếp lên <strong>Sổ liên lạc Cổng Phụ Huynh</strong> (nội bộ hệ thống) để phụ huynh xem mọi lúc, đồng thời kích hoạt gửi thông báo qua <strong>Zalo</strong> tới phụ huynh của các con trong lớp bù.
                </div>
              </div>

              {/* Nội dung buổi học bù */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nội dung buổi học bù đã giảng dạy (Chủ đề, từ vựng, ngữ pháp đã củng cố):
                </label>
                <textarea
                  rows={3}
                  value={formLessonContent}
                  onChange={(e) => setFormLessonContent(e.target.value)}
                  placeholder="Ví dụ: Đã ôn tập toàn bộ từ vựng Unit 4, củng cố thì hiện tại đơn, luyện phát âm /s/ và /es/..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Bài tập về nhà / Dặn dò */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Bài tập về nhà / Dặn dò ôn luyện:
                </label>
                <textarea
                  rows={2}
                  value={formHomework}
                  onChange={(e) => setFormHomework(e.target.value)}
                  placeholder="Ví dụ: Hoàn thiện nốt trang 24-25 sách Workbook, quay video đọc 5 câu mẫu..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Nhận xét của Trợ giảng */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nhận xét của Trợ giảng / Giáo viên về tinh thần buổi bù:
                </label>
                <textarea
                  rows={2}
                  value={formAssistantFeedback}
                  onChange={(e) => setFormAssistantFeedback(e.target.value)}
                  placeholder="Ví dụ: Các con học tập rất tập trung, hăng hái phát biểu và đã hiểu bài chắc chắn..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setContentModalClass(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmSendContent}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Gửi Báo Cáo Cho Phụ Huynh</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: XÁC NHẬN CHỐT THÁNG & RESET QUYỀN LỢI HỌC BÙ (YÊU CẦU 4) */}
      {/* ========================================================================= */}
      {isResetConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-base text-rose-700 flex items-center gap-2">
                  <AlertOctagon className="w-5 h-5 text-rose-600" />
                  <span>Kết Thúc Tháng & Reset Quyền Lợi Học Bù</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Chốt chu kỳ {selectedMonth} và reset quyền lợi của các buổi vắng chưa bù.
                </p>
              </div>
              <button
                onClick={() => setIsResetConfirmModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 leading-relaxed">
                Xác nhận kết thúc tháng {selectedMonth}. Có <strong className="font-bold">{summary.unscheduledSessions} buổi vắng</strong> chưa sắp xếp học bù sẽ được chuyển sang trạng thái hết hạn quyền lợi.
              </div>

              {/* Danh sách học sinh sẽ bị mất quyền lợi */}
              {summary.unscheduledSessions > 0 && (
                <div>
                  <span className="font-semibold text-slate-700 block mb-1">
                    Danh sách học sinh sẽ bị hết hạn quyền lợi bù:
                  </span>
                  <div className="space-y-1 max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50">
                    {monthlyAbsentStudents
                      .filter((stu) => stu.unscheduledCount > 0)
                      .map((stu) => (
                        <div key={stu.studentId} className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-slate-200">
                          <div>
                            <span className="font-bold text-slate-900">{stu.studentName}</span>
                            <span className="text-[10px] text-slate-500 ml-1.5">({stu.className})</span>
                          </div>
                          <span className="font-bold text-rose-700 font-mono text-[11px]">
                            {stu.unscheduledCount} buổi chưa bù
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-500">
                Khi sang tháng mới, hệ thống sẽ tính số buổi học bù mới từ đầu theo các buổi vắng phát sinh của tháng mới.
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsResetConfirmModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmResetMonth}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Xác Nhận Reset Tháng</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HÀNG ĐỢI TỰ ĐỘNG GỬI ZALO CHO LỚP BÙ (GIÃN CÁCH 2-3 PHÚT CHỐNG SPAM) */}
      <ZaloBatchQueueModal
        isOpen={isZaloQueueOpen}
        onClose={() => setIsZaloQueueOpen(false)}
        title={zaloQueueTitle}
        initialItems={zaloQueueItems}
        onAllCompleted={(count) => {
          showToast(`🎉 Hoàn thành gửi tự động Zalo tới ${count} phụ huynh học sinh!`);
        }}
        senderRole="ADMIN"
        senderName="Ms. Dung (Hotline Trung Tâm)"
        senderPhone="0964645174"
      />
    </div>
  );
}
