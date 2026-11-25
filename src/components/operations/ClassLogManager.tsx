"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useCenter } from "@/context/CenterContext";
import { 
  ClassLogItem, 
  StudentRemark, 
  StudentAttitude, 
  HomeworkSubmissionType, 
  ClassItem, 
  ScheduleSlot, 
  buildClassThemeMap, 
  CLASS_THEMES 
} from "@/data/centerData";
import { 
  BookOpen, 
  Award,
  Send, 
  Save, 
  Sparkles, 
  Calendar, 
  Clock, 
  GraduationCap, 
  UserCheck, 
  Video, 
  Mic, 
  FileEdit, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Smartphone, 
  Monitor, 
  Users, 
  DoorOpen, 
  Flame, 
  Eye, 
  RotateCcw,
  Tag,
  Check,
  ChevronRight,
  Paperclip,
  FileUp,
  FolderOpen,
  MessageSquare
} from "lucide-react";
import { 
  generateClassGroupPostMessage, 
  generateClassLogZaloMessage 
} from "@/utils/zaloHelper";
import EditZaloMessageModal from "@/components/common/EditZaloMessageModal";
import ZaloBatchQueueModal, { ZaloQueueItem } from "@/components/common/ZaloBatchQueueModal";
import { getTodayDateString } from "@/utils/dateHelper";


export interface ClassLogManagerProps {
  userRole?: "ASSISTANT" | "TEACHER" | "ADMIN";
  currentStaffId?: string; // id của GV ("staff-t1") hoặc TA ("staff-ta1")
}

function getDayOfWeekFromDate(dateStr: string): number {
  const d = new Date(dateStr);
  const jsDay = d.getDay();
  return jsDay === 0 ? 8 : jsDay + 1; // 2: Thứ 2, ..., 8: Chủ Nhật
}

export default function ClassLogManager({
  userRole = "TEACHER",
  currentStaffId = "staff-t1",
}: ClassLogManagerProps) {
  const { 
    classes, 
    students, 
    staff, 
    substitutions, 
    classLogs, 
    saveClassLog,
    attendance,
    assignments,
    createAssignment,
    sendZaloClassGroupMessage,
    sendZaloMessageToParent,
    renderZaloTemplate
  } = useCenter();

  const isReadOnly = userRole === "ADMIN";

  // Bản đồ màu sắc lớp học
  const themeMap = useMemo(() => buildClassThemeMap(classes), [classes]);

  // Bộ chọn ngày (Tracking thời gian thực)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => getTodayDateString());
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  // Modal Chỉnh Sửa Tin Nhắn Zalo Trước Khi Gửi (Nhóm lớp)
  const [editZaloModal, setEditZaloModal] = useState<{
    isOpen: boolean;
    title: string;
    recipientName: string;
    recipientPhone: string;
    className?: string;
    initialContent: string;
    templateBadge?: string;
    type: "CLASS_GROUP";
  } | null>(null);

  // Subtab điều hướng trong form Class Log: 1: Nội dung buổi học, 2: Giao BTVN & File Đính Kèm (PDF)
  const [activeTab, setActiveTab] = useState<"LESSON_CONTENT" | "HOMEWORK_ASSIGNMENT">("LESSON_CONTENT");

  // Mobile frame simulator toggle
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(false);

  // Success message toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form state
  const [lessonContent, setLessonContent] = useState<string>("");
  const [lessonTopic, setLessonTopic] = useState<string>("");
  const [vocabularyTaught, setVocabularyTaught] = useState<string>("");
  const [grammarFocus, setGrammarFocus] = useState<string>("");
  const [homeworkTitle, setHomeworkTitle] = useState<string>("");
  const [homeworkDescription, setHomeworkDescription] = useState<string>("");
  const [homeworkDeadline, setHomeworkDeadline] = useState<string>("2026-11-08 20:00");
  const [submissionType, setSubmissionType] = useState<HomeworkSubmissionType>("BOTH");
  const [attachmentFileName, setAttachmentFileName] = useState<string>("Phieu_BTVN_Unit4_Family.pdf");
  const [attachmentFileSize, setAttachmentFileSize] = useState<string>("285 KB");
  const [generalFeedback, setGeneralFeedback] = useState<string>("");
  const [remarks, setRemarks] = useState<StudentRemark[]>([]);
  const [logStatus, setLogStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");
  const [publishedAt, setPublishedAt] = useState<string | undefined>(undefined);
  const [isZaloQueueOpen, setIsZaloQueueOpen] = useState<boolean>(false);
  const [zaloQueueItems, setZaloQueueItems] = useState<ZaloQueueItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachmentFileName(file.name);
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    const sizeKb = (file.size / 1024).toFixed(0);
    const sizeStr = file.size > 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;
    setAttachmentFileSize(sizeStr);
    setToastMessage(`✓ Đã chọn tệp đính kèm: "${file.name}" (${sizeStr}) từ máy tính!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const dayOfWeek = useMemo(() => getDayOfWeekFromDate(selectedDateStr), [selectedDateStr]);

  // Nhân sự đang thao tác
  const activeStaff = useMemo(() => {
    return staff.find((s) => s.id === currentStaffId) || staff.find((s) => s.role === userRole) || staff[0] || { id: "", fullName: userRole === "TEACHER" ? "Giáo viên" : "Trợ giảng", role: userRole };
  }, [staff, currentStaffId, userRole]);

  // Danh sách lớp liên quan theo vai trò
  const relevantClasses = useMemo(() => {
    if (userRole === "ADMIN") return classes;
    if (userRole === "TEACHER") {
      return classes.filter((cls) => {
        const sub = substitutions.find((s) => s.classId === cls.id && s.dateStr === selectedDateStr);
        if (sub?.subTeacherId) return sub.subTeacherId === activeStaff.id;
        const todaySlot = cls.schedules.find((sch) => sch.dayOfWeek === dayOfWeek);
        const slotTeacherId = todaySlot?.teacherId || cls.teacherId;
        return slotTeacherId === activeStaff.id;
      });
    }
    // userRole === "ASSISTANT"
    return classes.filter((cls) => {
      const sub = substitutions.find((s) => s.classId === cls.id && s.dateStr === selectedDateStr);
      if (sub?.subAssistantId) return sub.subAssistantId === activeStaff.id;
      const todaySlot = cls.schedules.find((sch) => sch.dayOfWeek === dayOfWeek);
      const slotAssistantId = todaySlot?.assistantId || cls.assistantId;
      return slotAssistantId === activeStaff.id;
    });
  }, [classes, userRole, activeStaff, substitutions, selectedDateStr, dayOfWeek]);

  // Queue ca học hôm nay
  const todaySessionsQueue = useMemo(() => {
    return relevantClasses
      .map((cls) => {
        const sch = cls.schedules.find((s) => s.dayOfWeek === dayOfWeek);
        if (!sch) return null;

        const existingLog = classLogs.find((l) => l.classId === cls.id && l.dateStr === selectedDateStr);
        const hasLog = !!existingLog;
        const isPublished = existingLog?.status === "PUBLISHED";

        return {
          classItem: cls,
          schedule: sch,
          hasLog,
          isPublished,
          existingLog,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.schedule.startTime.localeCompare(b.schedule.startTime));
  }, [relevantClasses, dayOfWeek, selectedDateStr, classLogs]);

  // Tự động chọn lớp đầu tiên trong danh sách nếu chưa chọn
  useEffect(() => {
    if (todaySessionsQueue.length > 0) {
      const inQueue = todaySessionsQueue.some((q) => q.classItem.id === selectedClassId);
      if (!inQueue || !selectedClassId) {
        setSelectedClassId(todaySessionsQueue[0].classItem.id);
      }
    } else if (relevantClasses.length > 0 && !selectedClassId) {
      setSelectedClassId(relevantClasses[0].id);
    }
  }, [todaySessionsQueue, relevantClasses, selectedClassId]);

  // Lớp đang chọn
  const currentClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId) || relevantClasses[0] || classes[0];
  }, [classes, selectedClassId, relevantClasses]);

  // Dạy thay nếu có
  const currentSubstitution = useMemo(() => {
    if (!currentClass) return undefined;
    return substitutions.find((s) => s.classId === currentClass.id && s.dateStr === selectedDateStr);
  }, [substitutions, currentClass, selectedDateStr]);

  const effectiveTeacher = currentSubstitution?.subTeacherName || currentClass?.teacherName || "Giáo viên";
  const effectiveAssistant = currentSubstitution?.subAssistantName || currentClass?.assistantName || "Trợ giảng";

  // Học sinh của lớp (Tự động loại trừ học sinh đã nghỉ hẳn)
  const classStudents = useMemo(() => {
    if (!currentClass) return [];
    return students.filter((s) => s.classId === currentClass.id && s.learningStatus !== "DROPPED");
  }, [students, currentClass]);

  // Điểm danh của buổi học này (để biết học sinh nào có mặt / vắng mặt khi nhận xét)
  const sessionAttendance = useMemo(() => {
    if (!currentClass) return new Map();
    const map = new Map();
    attendance
      .filter((a) => a.classId === currentClass.id && a.dateStr === selectedDateStr)
      .forEach((a) => map.set(a.studentId, a));
    return map;
  }, [attendance, currentClass, selectedDateStr]);

  // Nạp dữ liệu Class Log hiện có hoặc khởi tạo form mới
  useEffect(() => {
    if (!currentClass) return;

    const existingLog = classLogs.find(
      (l) => l.classId === currentClass.id && l.dateStr === selectedDateStr
    );

    if (existingLog) {
      setLessonTopic(existingLog.lessonTopic || "");
      setLessonContent(
        existingLog.lessonContent ||
        [
          existingLog.lessonTopic ? `Chủ đề: ${existingLog.lessonTopic}` : "",
          existingLog.vocabularyTaught ? `Từ vựng: ${existingLog.vocabularyTaught}` : "",
          existingLog.grammarFocus ? `Ngữ pháp: ${existingLog.grammarFocus}` : "",
          existingLog.generalFeedback ? `Tình hình lớp: ${existingLog.generalFeedback}` : "",
        ].filter(Boolean).join("\n")
      );
      setVocabularyTaught(existingLog.vocabularyTaught || "");
      setGrammarFocus(existingLog.grammarFocus || "");
      setHomeworkTitle(existingLog.homeworkTitle || "");
      setHomeworkDescription(existingLog.homeworkDescription || "");
      setHomeworkDeadline(existingLog.homeworkDeadline || "2026-11-08 20:00");
      setSubmissionType(
        existingLog.submissionType === "BOTH"
          ? "BOTH"
          : existingLog.submissionType === "WORKBOOK" || existingLog.submissionType === "WORKSHEET"
          ? "WORKBOOK"
          : "VIDEO"
      );
      setAttachmentFileName(existingLog.attachmentFileName || "Phieu_BTVN_Unit4_Family.pdf");
      setAttachmentFileSize(existingLog.attachmentFileSize || "285 KB");
      setGeneralFeedback(existingLog.generalFeedback || "");
      setLogStatus(existingLog.status);
      setPublishedAt(existingLog.publishedAt);

      // Đồng bộ remarks với danh sách học sinh hiện tại của lớp
      const remarkMap = new Map<string, StudentRemark>();
      existingLog.studentRemarks.forEach((r) => remarkMap.set(r.studentId, r));

      const mergedRemarks: StudentRemark[] = classStudents.map((st) => {
        const found = remarkMap.get(st.id);
        if (found) return found;
        return {
          studentId: st.id,
          studentName: st.fullName,
          attitude: "EXCELLENT",
          quickTags: ["Hăng hái phát biểu"],
          feedback: "Con học rất chăm chú và tương tác tích cực với cô và các bạn.",
        };
      });
      setRemarks(mergedRemarks);
    } else {
      // Dữ liệu mẫu khởi tạo mặc định theo giáo trình
      const defaultTopic = `Unit ${Math.min(currentClass.schedules.length + 3, 10)}: Speaking & Communication Practice`;
      setLessonTopic(defaultTopic);
      setLessonContent(
        `Hôm nay lớp học ${defaultTopic}.\n- Từ vựng trọng tâm: family, father, mother, brother, sister, favorite hobbies\n- Ngữ pháp: "This is my... / I like playing with my..."\n- Tình hình lớp học: Cả lớp học rất hào hứng, tương tác sôi nổi trong trò chơi từ vựng và tự tin phát âm.`
      );
      setVocabularyTaught("family, father, mother, brother, sister, favorite hobbies");
      setGrammarFocus("This is my... / I like playing with my...");
      setHomeworkTitle("Quay video 1-2 phút giới thiệu chủ đề buổi học & Làm bài tập");
      setHomeworkDescription("Con quay video tự tin nói 3-5 câu về nội dung vừa học và hoàn thành bài tập trong sách.");
      setHomeworkDeadline("2026-11-08 20:00");
      setSubmissionType("BOTH");
      setAttachmentFileName("Phieu_BTVN_Unit4_Family.pdf");
      setAttachmentFileSize("285 KB");
      setGeneralFeedback("Lớp học hôm nay rất hào hứng, các con tiếp thu tốt và tham gia sôi nổi.");
      setLogStatus("DRAFT");
      setPublishedAt(undefined);

      const defaultRemarks: StudentRemark[] = classStudents.map((st) => ({
        studentId: st.id,
        studentName: st.fullName,
        attitude: "EXCELLENT",
        quickTags: ["Hăng hái phát biểu", "Tự tin giao tiếp"],
        feedback: "Con học rất tập trung, phát âm to rõ ràng và phản xạ nhanh.",
      }));
      setRemarks(defaultRemarks);
    }
  }, [currentClass, selectedDateStr, classLogs, classStudents]);

  // Lưu bản nháp (Save Draft)
  const handleSaveDraft = () => {
    if (!currentClass) return;

    const existingLog = classLogs.find(
      (l) => l.classId === currentClass.id && l.dateStr === selectedDateStr
    );

    const logToSave: Omit<ClassLogItem, "id"> & { id?: string } = {
      id: existingLog?.id,
      classId: currentClass.id,
      className: currentClass.name,
      dateStr: selectedDateStr,
      lessonContent,
      lessonTopic: lessonTopic || (lessonContent ? lessonContent.split("\n")[0].slice(0, 60) : "Nội dung buổi học"),
      vocabularyTaught,
      grammarFocus,
      homeworkTitle,
      homeworkDescription,
      homeworkDeadline,
      submissionType,
      attachmentFileName: attachmentFileName || undefined,
      attachmentFileSize: attachmentFileSize || undefined,
      generalFeedback,
      studentRemarks: remarks,
      status: "DRAFT",
      publishedAt: existingLog?.publishedAt,
      authorName: `${effectiveTeacher} & ${effectiveAssistant}`,
    };

    saveClassLog(logToSave);
    setLogStatus("DRAFT");
    setToastMessage("💾 Đã lưu bản nháp nhật ký buổi học. (Chưa gửi phụ huynh)");
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Gửi trực tiếp vào Nhóm Zalo của Lớp (Mở modal chỉnh sửa trước khi gửi)
  const handleSendClassGroupZalo = async () => {
    if (!currentClass) return;

    if (!lessonContent.trim() && !lessonTopic.trim()) {
      alert("Vui lòng nhập Nội dung buổi học trước khi gửi lên Nhóm Zalo lớp!");
      return;
    }

    let postMessage: string;
    try {
      postMessage = renderZaloTemplate("classLogGroup", {
        className: currentClass.name,
        teacherName: effectiveTeacher,
        assistantName: effectiveAssistant || "",
        dateStr: selectedDateStr,
        lessonTopic: lessonTopic || "Nội dung buổi học",
        lessonContent: lessonContent || "",
        homeworkTitle: homeworkTitle || "",
        homeworkDescription: homeworkDescription || "",
        homeworkDeadline: homeworkDeadline || "",
        submissionType: submissionType || "BOTH",
        attachmentFileName: attachmentFileName || "",
      });
    } catch {
      postMessage = generateClassGroupPostMessage({
        className: currentClass.name,
        teacherName: effectiveTeacher,
        assistantName: effectiveAssistant,
        dateStr: selectedDateStr,
        lessonTopic: lessonTopic || "Nội dung buổi học",
        lessonContent,
        homeworkTitle,
        homeworkDescription,
        homeworkDeadline,
        submissionType: submissionType as any,
        attachmentFileName: attachmentFileName || undefined,
      });
    }

    setEditZaloModal({
      isOpen: true,
      title: `Chỉnh Sửa Tin Nhóm Zalo Lớp ${currentClass.name}`,
      recipientName: `Nhóm Zalo Lớp ${currentClass.name}`,
      recipientPhone: currentClass.zaloGroupUrl || "Zalo Group Link",
      className: currentClass.name,
      initialContent: postMessage,
      templateBadge: "Nhật Ký & BTVN Nhóm Lớp",
      type: "CLASS_GROUP",
    });
  };

  // Xác nhận gửi tin nhắn Nhóm Zalo đã được chỉnh sửa (Tự động gửi 100%, không cần Ctrl+V)
  const handleConfirmSendEditedZalo = async (editedContent: string, groupUrl?: string, groupId?: string) => {
    if (!editZaloModal || !currentClass) return;

    if (editZaloModal.type === "CLASS_GROUP") {
      const res = await sendZaloClassGroupMessage(
        currentClass.id, 
        editedContent, 
        (userRole as any) || "TEACHER", 
        currentStaffId,
        groupUrl,
        groupId
      );
      setToastMessage(`📢 ${res.message}`);
      setTimeout(() => setToastMessage(null), 4500);
    }
    setEditZaloModal(null);
  };

  // 3. CHỈ XUẤT BẢN CỔNG PHỤ HUYNH NỘI BỘ (KHÔNG BẮN TIN NHẮN ZALO)
  const handlePublishToAppOnly = () => {
    if (!currentClass) return;

    if (!lessonContent.trim() && !lessonTopic.trim()) {
      alert("Vui lòng nhập Nội dung buổi học trước khi xuất bản!");
      return;
    }

    const nowIso = new Date().toISOString();

    const existingLog = classLogs.find(
      (l) => l.classId === currentClass.id && l.dateStr === selectedDateStr
    );

    const logToSave: Omit<ClassLogItem, "id"> & { id?: string } = {
      id: existingLog?.id,
      classId: currentClass.id,
      className: currentClass.name,
      dateStr: selectedDateStr,
      lessonContent,
      lessonTopic: lessonTopic || (lessonContent ? lessonContent.split("\n")[0].slice(0, 60) : "Nội dung buổi học"),
      vocabularyTaught,
      grammarFocus,
      homeworkTitle,
      homeworkDescription,
      homeworkDeadline,
      submissionType,
      attachmentFileName: attachmentFileName || undefined,
      attachmentFileSize: attachmentFileSize || undefined,
      generalFeedback,
      studentRemarks: remarks,
      status: "PUBLISHED",
      publishedAt: nowIso,
      authorName: `${effectiveTeacher} & ${effectiveAssistant}`,
    };

    saveClassLog(logToSave);

    const existingAssign = (assignments || []).find(
      (a) => a.classId === currentClass.id && a.sessionDate === selectedDateStr
    );
    if (!existingAssign && (homeworkTitle.trim() || homeworkDescription.trim())) {
      createAssignment({
        classId: currentClass.id,
        className: currentClass.name,
        sessionDate: selectedDateStr,
        sessionTitle: `Buổi ${selectedDateStr}: ${lessonTopic || "Tiếng Anh"}`,
        title: homeworkTitle || "Bài tập về nhà buổi học",
        instructions: homeworkDescription || "Con hoàn thành bài tập về nhà theo hướng dẫn của thầy cô.",
        submissionType: submissionType as any,
        dueDateTime: homeworkDeadline || "2026-11-08 20:00",
        points: 10,
        referenceFileName: attachmentFileName || undefined,
        status: "ACTIVE",
        createdBy: effectiveTeacher,
      });
    }

    setLogStatus("PUBLISHED");
    setPublishedAt(nowIso);
    setToastMessage("📲 Đã xuất bản Nhật ký & BTVN lên Sổ liên lạc Cổng Phụ Huynh thành công!");
  };

  // 2. GỬI TRỰC TIẾP 1-CHẠM CHO TOÀN BỘ PHỤ HUYNH LỚP (TỰ ĐỘNG GỬI, KHÔNG CẦN CTRL+V)
  const handleDirectOneTouchSendToAllParents = async () => {
    if (!currentClass) return;

    if (!lessonContent.trim() && !lessonTopic.trim()) {
      alert("Vui lòng nhập Nội dung buổi học trước khi gửi cho Phụ huynh!");
      return;
    }

    const nowIso = new Date().toISOString();

    // 1. Lưu và phát hành ClassLog trạng thái PUBLISHED
    const existingLog = classLogs.find(
      (l) => l.classId === currentClass.id && l.dateStr === selectedDateStr
    );

    const logToSave: Omit<ClassLogItem, "id"> & { id?: string } = {
      id: existingLog?.id,
      classId: currentClass.id,
      className: currentClass.name,
      dateStr: selectedDateStr,
      lessonContent,
      lessonTopic: lessonTopic || (lessonContent ? lessonContent.split("\n")[0].slice(0, 60) : "Nội dung buổi học"),
      vocabularyTaught,
      grammarFocus,
      homeworkTitle,
      homeworkDescription,
      homeworkDeadline,
      submissionType,
      attachmentFileName: attachmentFileName || undefined,
      attachmentFileSize: attachmentFileSize || undefined,
      generalFeedback,
      studentRemarks: remarks,
      status: "PUBLISHED",
      publishedAt: nowIso,
      authorName: `${effectiveTeacher} & ${effectiveAssistant}`,
    };

    saveClassLog(logToSave);

    // 2. Đồng bộ tạo Assignment MS Teams
    const existingAssign = (assignments || []).find(
      (a) => a.classId === currentClass.id && a.sessionDate === selectedDateStr
    );
    if (!existingAssign && (homeworkTitle.trim() || homeworkDescription.trim())) {
      createAssignment({
        classId: currentClass.id,
        className: currentClass.name,
        sessionDate: selectedDateStr,
        sessionTitle: `Buổi ${selectedDateStr}: ${lessonTopic || "Tiếng Anh"}`,
        title: homeworkTitle || "Bài tập về nhà buổi học",
        instructions: homeworkDescription || "Con hoàn thành bài tập về nhà theo hướng dẫn của thầy cô.",
        submissionType: submissionType as any,
        dueDateTime: homeworkDeadline || "2026-11-08 20:00",
        points: 10,
        referenceFileName: attachmentFileName || undefined,
        status: "ACTIVE",
        createdBy: effectiveTeacher,
      });
    }

    // 3. Lọc danh sách học sinh đang học trong lớp
    const targetStudents = students.filter(
      (s) => s.classId === currentClass.id && s.learningStatus !== "DROPPED"
    );

    setLogStatus("PUBLISHED");
    setPublishedAt(nowIso);

    // 4. Nếu có nhiều học sinh (> 1): Kích hoạt Hàng đợi tự động gửi giãn cách 2-3 phút để chống quét spam Zalo
    if (targetStudents.length > 1) {
      const items: ZaloQueueItem[] = targetStudents.map((stu) => {
        const parentPhone = stu.parentPhone || (stu as any).phone || "0912345678";
        const parentName = stu.parentName || "Phụ huynh";
        const remarkObj = remarks.find((r) => r.studentId === stu.id);

        let messageContent: string;
        try {
          messageContent = renderZaloTemplate("classLogParent", {
            studentName: stu.fullName,
            parentName,
            teacherName: effectiveTeacher,
            assistantName: effectiveAssistant || "",
            className: currentClass.name,
            dateStr: selectedDateStr,
            lessonTopic: lessonTopic || "Nội dung buổi học",
            lessonContent: lessonContent || "",
            homeworkTitle: homeworkTitle || "",
            homeworkDescription: homeworkDescription || "",
            homeworkDeadline: homeworkDeadline || "",
            submissionType: submissionType || "BOTH",
            attachmentFileName: attachmentFileName || "",
          });
        } catch {
          messageContent = generateClassLogZaloMessage({
            studentName: stu.fullName,
            parentName,
            teacherName: effectiveTeacher,
            assistantName: effectiveAssistant,
            className: currentClass.name,
            dateStr: selectedDateStr,
            lessonTopic: lessonTopic || "Nội dung buổi học",
            lessonContent,
            homeworkTitle,
            homeworkDescription,
            homeworkDeadline,
            submissionType: submissionType as any,
            attachmentFileName: attachmentFileName || undefined,
            studentRemark: remarkObj?.feedback,
          });
        }

        return {
          id: `log-${currentClass.id}-${stu.id}`,
          studentId: stu.id,
          studentName: stu.fullName,
          parentName,
          parentPhone,
          className: currentClass.name,
          messageType: "CLASS_LOG",
          title: `Nhật Ký & BTVN: ${currentClass.name}`,
          content: messageContent,
          isFriended: stu.zaloFriendshipStatus !== "NOT_FRIENDED",
          status: "PENDING",
        };
      });

      setZaloQueueItems(items);
      setIsZaloQueueOpen(true);
      setToastMessage(
        `🛡️ Đã xuất bản buổi học & Bật Hàng đợi tự động gửi Zalo (${items.length} phụ huynh - giãn cách 2-3 phút chống spam)!`
      );
      setTimeout(() => setToastMessage(null), 5500);
      return;
    }

    // 5. Nếu chỉ có 1 học sinh: Gửi trực tiếp tự động 1-chạm (không cần Ctrl+V)
    let sentCount = 0;
    for (const stu of targetStudents) {
      const parentPhone = stu.parentPhone || (stu as any).phone || "0912345678";
      const parentName = stu.parentName || "Phụ huynh";

      let messageContent: string;
      try {
        messageContent = renderZaloTemplate("classLogParent", {
          studentName: stu.fullName,
          parentName,
          teacherName: effectiveTeacher,
          assistantName: effectiveAssistant || "",
          className: currentClass.name,
          dateStr: selectedDateStr,
          lessonTopic: lessonTopic || "Nội dung buổi học",
          lessonContent: lessonContent || "",
          homeworkTitle: homeworkTitle || "",
          homeworkDescription: homeworkDescription || "",
          homeworkDeadline: homeworkDeadline || "",
          submissionType: submissionType || "BOTH",
          attachmentFileName: attachmentFileName || "",
        });
      } catch {
        messageContent = generateClassLogZaloMessage({
          studentName: stu.fullName,
          parentName,
          teacherName: effectiveTeacher,
          assistantName: effectiveAssistant,
          className: currentClass.name,
          dateStr: selectedDateStr,
          lessonTopic: lessonTopic || "Nội dung buổi học",
          lessonContent,
          homeworkTitle,
          homeworkDescription,
          homeworkDeadline,
          submissionType: submissionType as any,
          attachmentFileName: attachmentFileName || undefined,
        });
      }

      await sendZaloMessageToParent({
        recipientPhone: parentPhone,
        recipientName: parentName,
        studentId: stu.id,
        studentName: stu.fullName,
        studentCode: stu.studentCode,
        className: currentClass.name,
        messageType: "CLASS_LOG",
        title: `Nhật Ký & BTVN: ${currentClass.name}`,
        content: messageContent,
        senderRole: (userRole as any) || "TEACHER",
        senderStaffId: currentStaffId,
        senderName: effectiveTeacher,
        openChatWindow: false,
      });
      sentCount++;
    }

    setToastMessage(
      `🎉 GỬI TỰ ĐỘNG THÀNH CÔNG: Đã gửi Nhật ký & BTVN tới Phụ huynh qua Zalo & Cổng Phụ Huynh!`
    );
    setTimeout(() => setToastMessage(null), 5500);
  };

  if (classes.length === 0 || !currentClass) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
        <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
        <h4 className="font-bold text-base text-slate-800">Chưa Có Dữ Liệu Lớp Học</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Hiện tại trung tâm chưa có lớp học nào được tạo. Vui lòng tạo lớp học tại mục Quản lý Lớp học để bắt đầu biên soạn nhật ký và giao bài tập về nhà.
        </p>
      </div>
    );
  }

  const classTheme = currentClass ? themeMap.get(currentClass.id) || CLASS_THEMES[0] : CLASS_THEMES[0];

  return (
    <div className="space-y-3.5">
      {/* ============================================================== */}
      {/* 1. TOP HEADER: PHÂN QUYỀN, NGÀY GIỜ VÀ HÀNG CA HỌC HÔM NAY */}
      {/* ============================================================== */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Role Status Indicator */}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
                <BookOpen className="w-5 h-5 text-amber-500" />
                {userRole === "ADMIN"
                  ? "Giám Sát Nhật Ký Buổi Học (Quản Trị Viên)"
                  : userRole === "TEACHER"
                  ? `Biên Soạn Nhật Ký & Giao Bài Tập (Giáo Viên: ${activeStaff.fullName})`
                  : `Nhật Ký Buổi Học & Nhận Xét Học Viên (Trợ Giảng: ${activeStaff.fullName})`}
              </h3>

              {logStatus === "PUBLISHED" ? (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã Gửi Phụ Huynh
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  ✏️ Bản Nháp
                </span>
              )}
            </div>
          </div>

          {/* Controls: Date Picker & Mobile simulator toggle */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
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

        {/* Hàng chọn ca học hôm nay */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Flame className="w-3 h-3 text-rose-500" /> Ca Học Trong Ngày ({todaySessionsQueue.length} ca):
            </span>
          </div>

          {todaySessionsQueue.length === 0 ? (
            <div className="p-2.5 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500 text-center">
              Không có lớp nào có lịch trong ngày {selectedDateStr}.
            </div>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {todaySessionsQueue.map((item) => {
                const isSelected = item.classItem.id === selectedClassId;
                const theme = themeMap.get(item.classItem.id) || CLASS_THEMES[0];

                return (
                  <button
                    key={`${item.classItem.id}-${item.schedule.id}`}
                    type="button"
                    onClick={() => setSelectedClassId(item.classItem.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-left transition shrink-0 ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-amber-400"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${theme.dot} shrink-0`} />
                    <div className="text-xs">
                      <div className="font-bold flex items-center gap-1.5">
                        <span>{item.classItem.name}</span>
                        <span className="text-[9.5px] px-1.5 py-0.2 rounded-md bg-slate-200/50 text-slate-700">
                          {item.schedule.startTime} - {item.schedule.endTime}
                        </span>
                      </div>
                      <div className={`text-[10px] flex items-center gap-1 mt-0.5 ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                        <span>{item.schedule.classroom || item.classItem.classroom}</span>
                        <span>•</span>
                        {item.isPublished ? (
                          <span className="text-emerald-400 font-semibold">Đã gửi phụ huynh</span>
                        ) : item.hasLog ? (
                          <span className="text-amber-400 font-semibold">Bản nháp</span>
                        ) : (
                          <span>Chưa có nhật ký</span>
                        )}
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
      {/* 2. KHUNG LÀM VIỆC NHẬT KÝ BUỔI HỌC */}
      {/* ============================================================== */}
      <div className={`mx-auto transition-all duration-300 ${isMobileFrame ? "max-w-[440px] shadow-2xl rounded-3xl border-4 border-slate-800 bg-slate-100 p-2 sm:p-3" : "w-full"}`}>
        
        {isMobileFrame && (
          <div className="bg-slate-800 text-white rounded-t-2xl py-1 px-3 mb-2 flex items-center justify-between text-[10px]">
            <span className="font-bold font-mono">19:00</span>
            <span className="text-[9.5px] text-slate-400">Class Log & Homework Mobile</span>
            <span>📶 100%</span>
          </div>
        )}

        <div className="space-y-3">
          {/* Card Thông tin lớp học & Thanh điều hướng Tab */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${classTheme.dot} shrink-0`} />
                <div>
                  <div className="font-bold text-sm text-slate-900 leading-tight flex items-center gap-1.5">
                    <span>{currentClass?.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-0.5">
                      <DoorOpen className="w-3 h-3 text-slate-400" /> {currentClass?.schedules.find((s) => s.dayOfWeek === dayOfWeek)?.classroom || currentClass?.classroom}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <GraduationCap className="w-3 h-3 text-amber-600" /> {effectiveTeacher}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5 font-semibold text-blue-900">
                      <UserCheck className="w-3 h-3 text-blue-600" /> {effectiveAssistant}
                    </span>
                  </div>

                  {/* Visual Delivery Status Badges */}
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {logStatus === "PUBLISHED" ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> App: Đã phát hành
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                        ✏️ App: Bản nháp
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Save Draft, App Only & Auto-Send Zalo */}
              {!isReadOnly && (
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSendClassGroupZalo}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    title="Đăng tóm tắt bài học và BTVN chung trực tiếp vào Nhóm Zalo của lớp"
                  >
                    <span className="text-sm">📢</span>
                    <span>Đăng Nhóm Zalo Lớp</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition flex items-center gap-1 active:scale-95 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-slate-500" />
                    <span>Lưu Nháp</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePublishToAppOnly}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition flex items-center gap-1 active:scale-95 cursor-pointer"
                    title="Chỉ phát hành Nhật ký & BTVN lên Sổ liên lạc Cổng Phụ Huynh trên web (không gửi Zalo)"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>📲 Chỉ Gửi Cổng App</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDirectOneTouchSendToAllParents}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1 active:scale-95 cursor-pointer"
                    title="Bắn tin nhắn Zalo kèm hàng đợi 2-3 phút/tin cho 100% Phụ huynh trong lớp & Đồng bộ Cổng App"
                  >
                    <Send className="w-3.5 h-3.5 text-white" />
                    <span>💬 Gửi Zalo Cho 100% PH</span>
                  </button>
                </div>
              )}
            </div>

            {/* Banner chỉ dẫn phân biệt 2 kênh */}
            <div className="mx-6 mt-3 p-2.5 bg-gradient-to-r from-amber-50 to-indigo-50 border border-amber-200 rounded-2xl flex items-center gap-2 text-xs text-slate-800">
              <span className="text-base shrink-0">🛡️</span>
              <div>
                <strong>Chỉ dẫn kênh:</strong> Chọn <span className="text-indigo-700 font-bold">📲 Chỉ Gửi Cổng App</span> để đăng nội bộ lên Sổ liên lạc web, hoặc <span className="text-emerald-700 font-bold">💬 Gửi Zalo</span> để bắn tin nhắn Zalo trực tiếp tới SĐT phụ huynh (tự động qua hàng đợi 2-3 phút chống spam).
              </div>
            </div>

            {/* Subtabs Switching - Tách riêng Nội dung buổi học và Giao BTVN */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("LESSON_CONTENT")}
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === "LESSON_CONTENT"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                  <span>1. Nội Dung Buổi Học</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("HOMEWORK_ASSIGNMENT")}
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeTab === "HOMEWORK_ASSIGNMENT"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>2. Giao BTVN & File Đính Kèm (PDF)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl p-2.5 text-xs flex items-center gap-2 shadow-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{toastMessage}</span>
            </div>
          )}

          {/* TAB 1: NỘI DUNG BUỔI HỌC (TÁCH RIÊNG KHỎI BTVN) */}
          {activeTab === "LESSON_CONTENT" && (
            <div className="space-y-3">
              <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                      📖
                    </div>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900">Nội Dung Bài Học Hôm Nay</h4>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Nội dung bài học & Tình hình lớp học: <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={8}
                      disabled={isReadOnly}
                      value={lessonContent}
                      onChange={(e) => setLessonContent(e.target.value)}
                      placeholder="Nhập toàn bộ nội dung buổi học hôm nay (Chủ đề bài học, từ vựng, ngữ pháp, các hoạt động lớp và nhận xét không khí chung toàn lớp)..."
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs font-normal leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* Chuyển sang Tab 2 */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("HOMEWORK_ASSIGNMENT")}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 active:scale-95"
                >
                  <span>Tiếp tục: 2. Giao BTVN & File Đính Kèm (PDF)</span>
                  <ChevronRight className="w-4 h-4 text-amber-400" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: GIAO BÀI TẬP VỀ NHÀ (TÁCH RIÊNG) */}
          {activeTab === "HOMEWORK_ASSIGNMENT" && (
            <div className="space-y-3">
              <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                      ✍️
                    </div>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900">Giao Bài Tập Về Nhà (Homework)</h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Submission Type Selector: VIDEO, WORKBOOK, BOTH */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                      {[
                        { type: "VIDEO", label: "📹 Chỉ Quay video", icon: Video },
                        { type: "WORKBOOK", label: "📖 Chỉ Workbook/Vở", icon: FileText },
                        { type: "BOTH", label: "🌟 Cả Video & Workbook", icon: Sparkles },
                      ].map((item) => {
                        const Icon = item.icon;
                        const isSelected = submissionType === item.type;
                        return (
                          <button
                            key={item.type}
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => {
                              const newType = item.type as HomeworkSubmissionType;
                              setSubmissionType(newType);
                              if (newType === "BOTH") {
                                if (!homeworkTitle || homeworkTitle.includes("Quay video 1-2 phút")) {
                                  setHomeworkTitle("[Unit 4] Quay video nói về gia đình & Làm bài tập trang 34-35 Workbook");
                                }
                                if (!homeworkDescription || homeworkDescription.includes("Con quay video")) {
                                  setHomeworkDescription(
                                    "1. Phần Quay video: Con quay 1 video ngắn 1-2 phút tự tin giới thiệu về 3 người thân trong gia đình.\n2. Phần Sách bài tập: Hoàn thành bài tập trang 34, 35 trong Workbook/Worksheet."
                                  );
                                }
                              }
                            }}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                              isSelected
                                ? item.type === "BOTH"
                                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-xs"
                                  : "bg-blue-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-slate-900 hover:bg-white"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {submissionType === "BOTH" && (
                  <div className="p-2.5 bg-amber-50/90 rounded-xl border border-amber-300 text-[11px] text-amber-950 flex items-start gap-2 animate-in fade-in">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Giải pháp giao bài tập kết hợp cả 2 hình thức:</span> Phụ huynh sẽ thấy 2 khu vực nộp riêng trên Sổ liên lạc: 1 phần nộp Video clip phát âm + 1 phần chụp ảnh các trang sách Workbook/Vở viết. Trợ giảng sẽ chấm điểm và nhận xét cả 2 phần.
                    </div>
                  </div>
                )}

                <div className="space-y-2.5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="font-semibold text-slate-700 block mb-1">
                        Tiêu đề bài tập về nhà: <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={homeworkTitle}
                        onChange={(e) => setHomeworkTitle(e.target.value)}
                        placeholder={
                          submissionType === "BOTH"
                            ? "Ví dụ: [Unit 4] Quay video 1-2 phút giới thiệu về gia đình & Làm bài tập trang 34-35"
                            : submissionType === "WORKBOOK"
                            ? "Ví dụ: Hoàn thành bài tập trắc nghiệm và điền từ trang 34-35 Sách Bài Tập"
                            : "Ví dụ: Quay video 1-2 phút tự tin giới thiệu về 3 người thân trong gia đình"
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Hạn nộp bài (Deadline):
                      </label>
                      <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          disabled={isReadOnly}
                          value={homeworkDeadline}
                          onChange={(e) => setHomeworkDeadline(e.target.value)}
                          placeholder="2026-11-08 20:00"
                          className="w-full bg-transparent text-xs font-mono font-medium focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Hướng dẫn chi tiết cách làm bài:
                    </label>
                    <textarea
                      rows={3}
                      disabled={isReadOnly}
                      value={homeworkDescription}
                      onChange={(e) => setHomeworkDescription(e.target.value)}
                      placeholder={
                        submissionType === "BOTH"
                          ? "1. Phần Quay video: Con quay video 1-2 phút giới thiệu về người thân...\n2. Phần Workbook: Hoàn thành trang 34, 35 trong Sách bài tập."
                          : "Con quay 1 video ngắn (1-2 phút) tự tin giới thiệu về 3 người thân trong gia đình hoặc hoàn thành trang 34, 35 trong Workbook."
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                    />
                  </div>

                  {/* ĐÍNH KÈM FILE BÀI TẬP (HỖ TRỢ CHỌN THƯ MỤC TRÊN MÁY TÍNH) */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                        <span>Đính kèm tệp bài tập / tài liệu từ máy tính (nếu có):</span>
                      </label>
                      {attachmentFileName && (
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          ✓ Đã đính kèm tệp
                        </span>
                      )}
                    </div>

                    {/* Hidden Native File Input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileInputChange}
                      disabled={isReadOnly}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.zip,.rar"
                    />

                    {attachmentFileName ? (
                      /* Active Attached File Card */
                      <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                            {attachmentFileName.endsWith(".pdf") ? "PDF" : attachmentFileName.endsWith(".doc") || attachmentFileName.endsWith(".docx") ? "DOC" : attachmentFileName.match(/\.(png|jpg|jpeg)$/i) ? "IMG" : "FILE"}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-blue-950 truncate flex items-center gap-1.5 flex-wrap">
                              <span>{attachmentFileName}</span>
                              <span className="text-[10px] font-mono text-blue-700 bg-white px-1.5 py-0.2 rounded border border-blue-200 font-bold">
                                {attachmentFileSize || "285 KB"}
                              </span>
                              {attachmentFileName.toLowerCase().endsWith(".pdf") && (
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                                  📄 Tệp PDF Bài Tập
                                </span>
                              )}
                            </div>
                            <div className="text-[10.5px] text-blue-700 mt-0.5">
                              {attachmentFileName.toLowerCase().endsWith(".pdf")
                                ? "✓ Tệp PDF sẽ tự động tạo liên kết tải trực tiếp khi gửi Zalo và trên Cổng Phụ Huynh."
                                : "Tệp đã được đính kèm từ máy tính • Phụ huynh có thể tải về làm bài"}
                            </div>
                          </div>
                        </div>

                        {!isReadOnly && (
                          <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-blue-100 text-blue-800 border border-blue-300 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                            >
                              <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
                              <span>Chọn Tệp Khác</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAttachmentFileName("");
                                setAttachmentFileSize("");
                              }}
                              className="px-2 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-rose-200 font-bold text-xs transition cursor-pointer"
                              title="Gỡ bỏ tệp này"
                            >
                              ✕ Gỡ
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* File Picker Trigger Zone */
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <button
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-1 p-3 rounded-xl border border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50 text-blue-800 transition flex items-center justify-center gap-2 text-xs font-bold cursor-pointer"
                        >
                          <FolderOpen className="w-4 h-4 text-blue-600" />
                          <span>📁 Duyệt & Chọn Tệp Từ Máy Tính (PDF, Word, Ảnh, Zip...)</span>
                        </button>

                        {/* Quick sample chips */}
                        {!isReadOnly && (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] text-slate-400">Mẫu:</span>
                            {["Phieu_BTVN_Unit4.pdf", "Workbook_Unit4.png"].map((f) => (
                              <button
                                key={f}
                                type="button"
                                onClick={() => {
                                  setAttachmentFileName(f);
                                  setAttachmentFileSize("320 KB");
                                }}
                                className="px-2 py-1 rounded-lg text-[10.5px] font-mono border bg-white hover:bg-slate-100 text-slate-700 border-slate-200 cursor-pointer"
                              >
                                {f.split(".")[0].slice(-9)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Actions: 1-Touch Direct Send + Zalo Group + Save Draft */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTab("LESSON_CONTENT")}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold self-start sm:self-auto cursor-pointer"
                >
                  ← Quay lại: 1. Nội Dung Buổi Học
                </button>

                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                  {!isReadOnly && (
                    <>
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                        title="Lưu lại bản nháp nội dung bài học & BTVN"
                      >
                        <Save className="w-3.5 h-3.5 text-slate-500" />
                        <span>Lưu Bản Nháp</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSendClassGroupZalo}
                        className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                        title="Đăng thông báo buổi học và bài tập về nhà lên Nhóm Zalo của lớp"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                        <span>📢 Đăng Nhóm Zalo Lớp</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePublishToAppOnly}
                        className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                        title="Chỉ phát hành Nhật ký & BTVN lên Sổ liên lạc Cổng Phụ Huynh trên web (không gửi Zalo)"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>📲 Chỉ Xuất Bản Cổng App</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDirectOneTouchSendToAllParents}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                        title="Gửi trực tiếp tin nhắn Zalo tới 100% phụ huynh học sinh (tự động qua hàng đợi 2-3 phút) & Đồng bộ Cổng App"
                      >
                        <Send className="w-3.5 h-3.5 text-white" />
                        <span>💬 GỬI ZALO CHO 100% PHỤ HUYNH</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL CHỈNH SỬA TIN NHẮN ZALO TRƯỚC KHI GỬI (NHÓM LỚP) */}
      {editZaloModal && (
        <EditZaloMessageModal
          isOpen={editZaloModal.isOpen}
          onClose={() => setEditZaloModal(null)}
          title={editZaloModal.title}
          recipientName={editZaloModal.recipientName}
          recipientPhone={editZaloModal.recipientPhone}
          className={editZaloModal.className}
          initialContent={editZaloModal.initialContent}
          templateBadge={editZaloModal.templateBadge}
          isClassGroup={editZaloModal.type === "CLASS_GROUP"}
          initialGroupUrl={currentClass?.zaloGroupUrl || ""}
          initialGroupId={currentClass?.zaloGroupId || ""}
          senderRole={(userRole as any) || "TEACHER"}
          senderStaffId={currentStaffId || activeStaff.id}
          senderPhone={activeStaff.phone}
          onSend={handleConfirmSendEditedZalo}
        />
      )}

      {/* HÀNG ĐỢI TỰ ĐỘNG GỬI ZALO CHO TOÀN BỘ PHỤ HUYNH LỚP (GIÃN CÁCH 2-3 PHÚT CHỐNG SPAM) */}
      <ZaloBatchQueueModal
        isOpen={isZaloQueueOpen}
        onClose={() => setIsZaloQueueOpen(false)}
        title={`Hàng Đợi Gửi Nhật Ký & BTVN: Lớp ${currentClass?.name || ""}`}
        initialItems={zaloQueueItems}
        onAllCompleted={(count) => {
          setToastMessage(`🎉 Hoàn thành gửi tự động Nhật ký & BTVN tới ${count} phụ huynh lớp ${currentClass?.name || ""} qua Zalo!`);
        }}
        senderRole={(userRole as any) || "TEACHER"}
        senderStaffId={currentStaffId || activeStaff.id}
        senderName={effectiveTeacher}
        senderPhone={activeStaff.phone}
      />
    </div>
  );
}
