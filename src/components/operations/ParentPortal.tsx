"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useCenter } from "@/context/CenterContext";
import { 
  AssignmentItem,
  ClassLogItem,
  CENTER_BANK_CONFIG
} from "@/data/centerData";
import {
  saveMediaBlob,
  getMediaBlob,
  getMediaBlobUrl,
  fileToSmallDataUrl,
  uploadHomeworkMediaToCloud,
  downloadHomeworkMedia,
} from "@/utils/mediaStorage";
import { getStudentDebtSummary, formatVND, calculateMonthLessons, computeStudentTuitionBreakdown } from "@/utils/tuitionHelper";
import { getTodayDateString, parseLocalDate, getDayOfWeekLabel, getCurrentBillingMonth, getBillingMonthOptions, getDefaultTuitionDueDate } from "@/utils/dateHelper";

function getWeekMondayKey(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMon);
  const y = mon.getFullYear();
  const m = String(mon.getMonth() + 1).padStart(2, "0");
  const dd = String(mon.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  AlertCircle, 
  Sparkles, 
  Award, 
  BookCheck, 
  FileCheck, 
  FileCheck2, 
  Coins, 
  QrCode, 
  Send, 
  Video, 
  Mic, 
  Download, 
  User, 
  Users, 
  ChevronRight, 
  DoorOpen, 
  Plus, 
  FileText, 
  Check, 
  PhoneCall,
  Camera,
  GraduationCap,
  RotateCcw,
  ShieldCheck,
  AlertOctagon,
  Layers,
  CalendarCheck,
  Paperclip,
  FolderOpen,
  Upload,
  Trash2,
  Copy,
  ExternalLink,
  Smartphone,
  Eye,
  Play,
  X
} from "lucide-react";
import { normalizePhoneNumber } from "@/utils/authHelper";
import QRCodeRenderer from "@/components/common/QRCodeRenderer";

export default function ParentPortal() {
  const { 
    classes, 
    students, 
    staff, 
    attendance, 
    classLogs, 
    workbookChecks, 
    incidentNotes, 
    monthlyExamReports,
    homeworkSubmissions,
    tuitionPayments,
    studentTuitionBills,
    assignments,
    makeupClasses,
    submitHomework,
    patchHomeworkSubmissionMedia,
    addTuitionPayment,
    markTuitionBillPaid,
    markMultiMonthTuitionPaid,
    currentUserAccount
  } = useCenter();

  // Lọc chỉ đúng danh sách con của phụ huynh này đăng nhập (Bảo mật tuyệt đối)
  const myChildren = useMemo(() => {
    if (!currentUserAccount) return students;
    // Nếu Quản trị viên đang ở chế độ xem trước (preview) cổng phụ huynh, cho phép xem toàn bộ
    if (currentUserAccount.role === "ADMIN") {
      return students;
    }
    // Tài khoản Phụ huynh: Lọc chính xác 100% theo SĐT đăng nhập hoặc studentId của con
    const cleanLoginPhone = normalizePhoneNumber(currentUserAccount.phone);
    const matched = (students || []).filter((stu) => {
      const stuParentPhone = normalizePhoneNumber(stu.parentPhone);
      return (
        (cleanLoginPhone && stuParentPhone === cleanLoginPhone) ||
        (currentUserAccount.studentId && stu.id === currentUserAccount.studentId)
      );
    });
    return matched;
  }, [students, currentUserAccount]);

  // Child selection state
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  useEffect(() => {
    if (myChildren.length > 0) {
      if (!selectedStudentId || !myChildren.some((c) => c.id === selectedStudentId)) {
        setSelectedStudentId(myChildren[0].id);
      }
    } else {
      setSelectedStudentId("");
    }
  }, [myChildren, selectedStudentId]);

  const [activeTab, setActiveTab] = useState<"FEED" | "TIMETABLE" | "HOMEWORK" | "EXAM_REPORTS" | "TUITION_LEAVE">("FEED");

  // Microsoft Teams Assignments view state: Cần nộp (ASSIGNED) vs Đã hoàn thành (COMPLETED)
  const [teamsHwTab, setTeamsHwTab] = useState<"ASSIGNED" | "COMPLETED">("ASSIGNED");
  const [selectedAssignmentForSubmission, setSelectedAssignmentForSubmission] = useState<AssignmentItem | null>(null);

  // Homework Submission Modal State
  const [isHomeworkModalOpen, setIsHomeworkModalOpen] = useState(false);
  const [homeworkType, setHomeworkType] = useState<"VIDEO" | "AUDIO" | "WORKBOOK" | "BOTH">("BOTH");
  const [submissionTitle, setSubmissionTitle] = useState("");
  const [workbookFileName, setWorkbookFileName] = useState("");
  const [studentComment, setStudentComment] = useState("");
  const [isShowAllLogs, setIsShowAllLogs] = useState(false);
  const [isUploadingHomework, setIsUploadingHomework] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const syncedSubmissionKeysRef = useRef<Set<string>>(new Set());

  // Parent Submission Viewer Modal State (Xem lại & bổ sung video/file đã nộp)
  const [viewingSubmissionId, setViewingSubmissionId] = useState<string | null>(null);
  const [resolvedSubMediaUrl, setResolvedSubMediaUrl] = useState<string | null>(null);
  const [resolvedSubWbUrl, setResolvedSubWbUrl] = useState<string | null>(null);
  const [isLoadingSubMedia, setIsLoadingSubMedia] = useState(false);
  const [subVideoPlayError, setSubVideoPlayError] = useState(false);
  const [subDownloadProgress, setSubDownloadProgress] = useState<number | null>(null);
  const [reuploadProgress, setReuploadProgress] = useState<number | null>(null);
  const reuploadFileInputRef = useRef<HTMLInputElement>(null);

  // Homework File Attachment State
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    size: string;
    type: string;
    file?: File;
  } | null>(null);

  const [attachedWorkbookFile, setAttachedWorkbookFile] = useState<{
    name: string;
    size: string;
    type: string;
    file?: File;
  } | null>(null);

  const mainFileInputRef = useRef<HTMLInputElement>(null);
  const workbookFileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleMainFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile({
        name: file.name,
        size: formatFileSize(file.size),
        type: file.type,
        file,
      });
      if (!submissionTitle) {
        setSubmissionTitle(file.name);
      }
    }
  };

  const handleWorkbookFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedWorkbookFile({
        name: file.name,
        size: formatFileSize(file.size),
        type: file.type,
        file,
      });
      setWorkbookFileName(file.name);
    }
  };

  // VietQR Modal State (Đóng học phí theo tháng)
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<{ monthLabel: string; amount: number; label: string; sub: string }>(() => {
    const curM = getCurrentBillingMonth();
    return {
      monthLabel: curM,
      amount: 0,
      label: `Học Phí ${curM}`,
      sub: "Đang tính theo kỳ học",
    };
  });

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  // Active student details (Lấy từ danh sách con đã lọc bảo mật)
  const activeStudent = useMemo(() => {
    if (myChildren.length === 0) return null;
    return myChildren.find((s) => s.id === selectedStudentId) || myChildren[0];
  }, [myChildren, selectedStudentId]);

  // Active student's class (không fallback sang lớp khác)
  const activeClass = useMemo(() => {
    if (!activeStudent?.classId) return undefined;
    return (classes || []).find((c) => c.id === activeStudent.classId);
  }, [classes, activeStudent]);

  // Active student's teacher and TA
  const classTeacher = useMemo(() => {
    return (staff || []).find((s) => s.id === activeClass?.teacherId) || { fullName: activeClass?.teacherName || "Giáo viên", phone: "" };
  }, [staff, activeClass]);

  const classAssistant = useMemo(() => {
    return (staff || []).find((s) => s.id === activeClass?.assistantId) || { fullName: activeClass?.assistantName || "Trợ giảng", phone: "" };
  }, [staff, activeClass]);

  // Attendance for active student today / latest session
  const studentAttendance = useMemo(() => {
    if (!activeStudent) return undefined;
    const attList = attendance || [];
    const todayStr = getTodayDateString();
    return (
      attList.find((a) => a.studentId === activeStudent.id && a.dateStr === todayStr) ||
      attList.find((a) => a.studentId === activeStudent.id)
    );
  }, [attendance, activeStudent]);

  // Workbook check for active student (today or latest)
  const studentWorkbookRecord = useMemo(() => {
    if (!activeStudent) return undefined;
    const checks = workbookChecks || [];
    const todayStr = getTodayDateString();
    return (
      checks.find((w) => w.studentId === activeStudent.id && w.dateStr === todayStr) ||
      checks.find((w) => w.studentId === activeStudent.id)
    );
  }, [workbookChecks, activeStudent]);

  // Incident notes for active student
  const studentIncidents = useMemo(() => {
    if (!activeStudent) return [];
    return (incidentNotes || []).filter((n) => n.studentId === activeStudent.id);
  }, [incidentNotes, activeStudent]);

  // All PUBLISHED Class Logs for student's class (newest first)
  const classPublishedLogs = useMemo(() => {
    if (!activeStudent?.classId) return [] as ClassLogItem[];
    return (classLogs || [])
      .filter((l) => l.classId === activeStudent.classId && l.status === "PUBLISHED")
      .sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  }, [classLogs, activeStudent]);

  // Toàn bộ các buổi đã phát hành trong tuần học hiện tại (hoặc tuần mới nhất có nhật ký)
  const currentWeekPublishedLogs = useMemo(() => {
    if (classPublishedLogs.length === 0) return [] as ClassLogItem[];
    const thisWeekKey = getWeekMondayKey(getTodayDateString());
    const inThisWeek = classPublishedLogs.filter((l) => getWeekMondayKey(l.dateStr) === thisWeekKey);
    if (inThisWeek.length > 0) {
      return [...inThisWeek].sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    }
    const latestWeekKey = getWeekMondayKey(classPublishedLogs[0].dateStr);
    return classPublishedLogs
      .filter((l) => getWeekMondayKey(l.dateStr) === latestWeekKey)
      .sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }, [classPublishedLogs]);

  const visiblePublishedLogs = useMemo(() => {
    if (isShowAllLogs) return classPublishedLogs;
    return currentWeekPublishedLogs;
  }, [isShowAllLogs, classPublishedLogs, currentWeekPublishedLogs]);

  // Latest Class Log (for backward-compatible single references)
  const currentClassLog = useMemo(() => {
    if (!activeStudent?.classId) return undefined;
    return (
      classPublishedLogs[0] ||
      (classLogs || []).find((l) => l.classId === activeStudent.classId)
    );
  }, [classPublishedLogs, classLogs, activeStudent]);

  // Homework submissions for this student
  const studentSubmissions = useMemo(() => {
    if (!activeStudent) return [];
    return (homeworkSubmissions || []).filter((s) => s.studentId === activeStudent.id);
  }, [homeworkSubmissions, activeStudent]);

  const activeViewingSubmission = useMemo(() => {
    if (!viewingSubmissionId) return null;
    return (homeworkSubmissions || []).find((s) => s.id === viewingSubmissionId) || null;
  }, [homeworkSubmissions, viewingSubmissionId]);

  useEffect(() => {
    let isCancelled = false;
    const createdObjectUrls: string[] = [];

    async function loadParentSubmissionMedia() {
      if (!activeViewingSubmission) {
        setResolvedSubMediaUrl(null);
        setResolvedSubWbUrl(null);
        setIsLoadingSubMedia(false);
        return;
      }

      setIsLoadingSubMedia(true);
      setSubVideoPlayError(false);
      try {
        let nextMain: string | null =
          activeViewingSubmission.mediaUrl || activeViewingSubmission.attachmentFileUrl || null;
        if (!nextMain && activeViewingSubmission.mediaStorageKey) {
          const blobUrl = await getMediaBlobUrl(activeViewingSubmission.mediaStorageKey);
          if (blobUrl) {
            createdObjectUrls.push(blobUrl);
            nextMain = blobUrl;
          }
        }

        let nextWb: string | null = activeViewingSubmission.workbookImageUrl || null;
        if (!nextWb && activeViewingSubmission.workbookStorageKey) {
          const wbUrl = await getMediaBlobUrl(activeViewingSubmission.workbookStorageKey);
          if (wbUrl) {
            createdObjectUrls.push(wbUrl);
            nextWb = wbUrl;
          }
        }

        if (!isCancelled) {
          setResolvedSubMediaUrl(nextMain);
          setResolvedSubWbUrl(nextWb);
        } else {
          createdObjectUrls.forEach((u) => URL.revokeObjectURL(u));
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingSubMedia(false);
        }
      }
    }

    void loadParentSubmissionMedia();
    return () => {
      isCancelled = true;
      createdObjectUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [activeViewingSubmission]);

  const handleReuploadSubmissionFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !activeViewingSubmission) return;

    const newKey = `hw_media_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const mimeType = file.type || "video/mp4";
    const sizeStr = formatFileSize(file.size);

    try {
      await saveMediaBlob(newKey, file);
    } catch {}

    setReuploadProgress(0);
    const cloudUrl = await uploadHomeworkMediaToCloud(file, file.name, mimeType, (pct) =>
      setReuploadProgress(pct)
    );
    setReuploadProgress(null);

    if (!cloudUrl) {
      alert("Không thể tải tệp lên Cloud DB. Vui lòng kiểm tra kết nối mạng (tối đa 100MB) và thử lại!");
      return;
    }

    patchHomeworkSubmissionMedia(activeViewingSubmission.id, {
      mediaUrl: cloudUrl,
      attachmentFileUrl: cloudUrl,
      attachmentFileName: file.name,
      attachmentFileSize: sizeStr,
      mediaMimeType: mimeType,
      mediaTitle: file.name,
      mediaStorageKey: newKey,
      ...(activeViewingSubmission.submissionType === "WORKBOOK"
        ? {
            workbookImageUrl: cloudUrl,
            workbookImageFileName: file.name,
            workbookFileSize: sizeStr,
            workbookMimeType: mimeType,
            workbookStorageKey: newKey,
          }
        : {}),
    });
    setResolvedSubMediaUrl(cloudUrl);
    setSubVideoPlayError(false);
    showToast(`✓ Đã cập nhật tệp "${file.name}" lên Cloud thành công!`);
  };

  // Tự động đồng bộ các tệp video/workbook từng nộp trước đây (chỉ có trong IndexedDB máy này) lên Cloud để GV & TA xem được
  useEffect(() => {
    let isCancelled = false;
    async function syncPendingLocalMedia() {
      for (const sub of studentSubmissions) {
        if (isCancelled) return;
        const needsMain = !sub.mediaUrl && !sub.attachmentFileUrl && Boolean(sub.mediaStorageKey);
        const needsWb = !sub.workbookImageUrl && Boolean(sub.workbookStorageKey);
        if ((!needsMain && !needsWb) || syncedSubmissionKeysRef.current.has(sub.id)) continue;
        syncedSubmissionKeysRef.current.add(sub.id);

        const updates: { mediaUrl?: string; attachmentFileUrl?: string; workbookImageUrl?: string } = {};
        if (needsMain && sub.mediaStorageKey) {
          const blob = await getMediaBlob(sub.mediaStorageKey);
          if (blob) {
            const url = await uploadHomeworkMediaToCloud(
              blob,
              sub.attachmentFileName || sub.mediaTitle || "homework.mp4",
              sub.mediaMimeType || blob.type
            );
            if (url) {
              updates.mediaUrl = url;
              updates.attachmentFileUrl = url;
              if (sub.submissionType === "WORKBOOK") updates.workbookImageUrl = url;
            }
          }
        }
        if (needsWb && sub.workbookStorageKey && !updates.workbookImageUrl) {
          const wbBlob = await getMediaBlob(sub.workbookStorageKey);
          if (wbBlob) {
            const wbUrl = await uploadHomeworkMediaToCloud(
              wbBlob,
              sub.workbookImageFileName || "workbook",
              sub.workbookMimeType || wbBlob.type
            );
            if (wbUrl) updates.workbookImageUrl = wbUrl;
          }
        }
        if (!isCancelled && Object.keys(updates).length > 0) {
          patchHomeworkSubmissionMedia(sub.id, updates);
        }
      }
    }
    void syncPendingLocalMedia();
    return () => {
      isCancelled = true;
    };
  }, [studentSubmissions, patchHomeworkSubmissionMedia]);

  // Assignments for active class (MS Teams style + đồng bộ từ mọi ClassLog PUBLISHED có BTVN)
  const classAssignments = useMemo(() => {
    if (!activeClass) return [];
    const directAssigns = (assignments || []).filter((a) => a.classId === activeClass.id);
    const merged: AssignmentItem[] = [...directAssigns];
    const coveredDates = new Set(directAssigns.map((a) => a.sessionDate));

    classPublishedLogs.forEach((log) => {
      const hasHw = Boolean(log.homeworkTitle?.trim() || log.homeworkDescription?.trim());
      if (!hasHw || coveredDates.has(log.dateStr)) return;
      coveredDates.add(log.dateStr);
      merged.push({
        id: `log-assign-${log.id}`,
        classId: log.classId,
        className: log.className || activeClass.name,
        sessionDate: log.dateStr,
        sessionTitle: `Buổi ${log.dateStr}: ${log.lessonTopic || "Tiếng Anh"}`,
        title: log.homeworkTitle?.trim() || "Bài tập về nhà buổi học",
        instructions: log.homeworkDescription?.trim() || "Con hoàn thành bài tập về nhà theo hướng dẫn của thầy cô.",
        submissionType: (log.submissionType || "BOTH") as any,
        dueDateTime: log.homeworkDeadline || log.dateStr,
        points: 10,
        referenceFileName: log.attachmentFileName,
        status: "ACTIVE",
        createdAt: log.publishedAt || log.dateStr,
        createdBy: log.authorName || activeClass.teacherName || "Giáo viên",
      });
    });

    return merged.sort((a, b) => (b.sessionDate || "").localeCompare(a.sessionDate || ""));
  }, [assignments, activeClass, classPublishedLogs]);

  // Lớp học bù của bé trong tháng nếu có
  const studentMakeupClasses = useMemo(() => {
    if (!activeStudent) return [];
    return (makeupClasses || []).filter((mc) =>
      mc.students.some((s) => s.studentId === activeStudent.id)
    );
  }, [makeupClasses, activeStudent]);

  // MS Teams: Cần nộp (ASSIGNED) vs Đã nộp (COMPLETED) — tách riêng từng buổi theo assignmentId
  const assignedList = useMemo(() => {
    return classAssignments.filter((assign) => {
      const hasSubmitted = studentSubmissions.some((sub) => {
        if (sub.assignmentId) {
          return sub.assignmentId === assign.id;
        }
        return (
          sub.assignmentTitle === assign.title &&
          (!sub.sessionTitle || !assign.sessionDate || sub.sessionTitle.includes(assign.sessionDate))
        );
      });
      return !hasSubmitted;
    });
  }, [classAssignments, studentSubmissions]);

  const completedList = useMemo(() => {
    return studentSubmissions.map((sub) => {
      const matchedAssign = classAssignments.find(
        (a) => a.id === sub.assignmentId || (!sub.assignmentId && a.title === sub.assignmentTitle)
      );
      return {
        submission: sub,
        assignment: matchedAssign,
      };
    });
  }, [studentSubmissions, classAssignments]);

  // Monthly Exam Reports for this student
  const studentExamReports = useMemo(() => {
    if (!activeStudent) return [];
    return (monthlyExamReports || []).filter((r) => r.studentId === activeStudent.id);
  }, [monthlyExamReports, activeStudent]);

  // Tuition Payments for this student
  const studentPayments = useMemo(() => {
    if (!activeStudent) return [];
    return (tuitionPayments || []).filter((p) => p.studentId === activeStudent.id);
  }, [tuitionPayments, activeStudent]);

  // Current Month Tuition Bill (Tính theo số buổi trong tháng)
  const currentTuitionBill = useMemo(() => {
    if (!activeStudent) return null;
    const currentMonth = activeStudent.currentBillingMonth || getCurrentBillingMonth();
    return (studentTuitionBills || []).find(
      (b) => b.studentId === activeStudent.id && b.billingMonth === currentMonth
    );
  }, [studentTuitionBills, activeStudent]);

  // Công nợ lũy kế nhiều tháng của bé
  const debtSummary = useMemo(() => {
    if (!activeStudent) return null;
    return getStudentDebtSummary(activeStudent.id, studentTuitionBills || []);
  }, [activeStudent, studentTuitionBills]);

  // --- ACTIONS ---

  // Submit Homework Handler (MS Teams Style - gắn chặt với buổi học & assignment)
  const handleSendHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent || !activeClass) return;

    const isBoth = homeworkType === "BOTH";

    const autoMediaTitle = attachedFile?.name || submissionTitle || (
      isBoth
        ? `Video_${(activeStudent.fullName || "").replace(/\s+/g, "")}.mp4`
        : homeworkType === "VIDEO" 
        ? `Video_${(activeStudent.fullName || "").replace(/\s+/g, "")}.mp4`
        : homeworkType === "AUDIO"
        ? `Audio_${(activeStudent.fullName || "").replace(/\s+/g, "")}.m4a`
        : `Workbook_${(activeStudent.fullName || "").replace(/\s+/g, "")}.jpg`
    );

    const assignmentTitleToSave = selectedAssignmentForSubmission?.title || currentClassLog?.homeworkTitle || "Bài tập về nhà";
    const sessionTitleToSave = selectedAssignmentForSubmission?.sessionTitle || `Buổi học lớp ${activeClass.name}`;

    let mediaStorageKey: string | undefined;
    let mediaUrl: string | undefined;
    let mediaMimeType: string | undefined;
    let workbookStorageKey: string | undefined;
    let workbookImageUrl: string | undefined;
    let workbookMimeType: string | undefined;

    const uploadMediaFile = async (file: File): Promise<string | undefined> => {
      setUploadProgress(0);
      const cloudUrl = await uploadHomeworkMediaToCloud(
        file,
        file.name,
        file.type,
        (pct) => setUploadProgress(pct)
      );
      if (cloudUrl) return cloudUrl;
      return await fileToSmallDataUrl(file);
    };

    setIsUploadingHomework(true);
    setUploadProgress(null);
    try {
      if (attachedFile?.file) {
        mediaStorageKey = `hw_media_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        mediaMimeType = attachedFile.type || attachedFile.file.type;
        try {
          await saveMediaBlob(mediaStorageKey, attachedFile.file);
        } catch (err) {
          console.warn("Không thể lưu tệp media vào IndexedDB:", err);
        }
        mediaUrl = await uploadMediaFile(attachedFile.file);
        if (!mediaUrl) {
          alert("Không thể tải tệp bài tập lên Cloud DB (kiểm tra kết nối mạng hoặc dung lượng tệp tối đa 100MB). Vui lòng thử lại để Giáo viên & Trợ giảng xem được bài nộp!");
          return;
        }
        if (homeworkType === "WORKBOOK") {
          workbookStorageKey = mediaStorageKey;
          workbookMimeType = mediaMimeType;
          workbookImageUrl = mediaUrl;
        }
      }

      if (attachedWorkbookFile?.file) {
        workbookStorageKey = `hw_wb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        workbookMimeType = attachedWorkbookFile.type || attachedWorkbookFile.file.type;
        try {
          await saveMediaBlob(workbookStorageKey, attachedWorkbookFile.file);
        } catch (err) {
          console.warn("Không thể lưu tệp workbook vào IndexedDB:", err);
        }
        workbookImageUrl = await uploadMediaFile(attachedWorkbookFile.file);
        if (!workbookImageUrl) {
          alert("Không thể tải tệp sách bài tập lên Cloud DB. Vui lòng thử lại!");
          return;
        }
      }

      submitHomework({
        studentId: activeStudent.id,
        studentName: activeStudent.fullName,
        studentCode: activeStudent.studentCode,
        classId: activeClass.id,
        assignmentId: selectedAssignmentForSubmission?.id,
        sessionTitle: sessionTitleToSave,
        assignmentTitle: assignmentTitleToSave,
        submissionType: homeworkType,
        mediaTitle: autoMediaTitle,
        mediaUrl,
        mediaStorageKey,
        mediaMimeType,
        mediaDuration: undefined,
        attachmentFileName: attachedFile?.name,
        attachmentFileSize: attachedFile?.size,
        attachmentFileUrl: mediaUrl,
        workbookImageFileName: isBoth 
          ? (attachedWorkbookFile?.name || undefined)
          : homeworkType === "WORKBOOK" ? (attachedFile?.name || autoMediaTitle) : undefined,
        workbookFileSize: isBoth ? attachedWorkbookFile?.size : (homeworkType === "WORKBOOK" ? attachedFile?.size : undefined),
        workbookImageUrl,
        workbookStorageKey,
        workbookMimeType,
        commentFromStudent: studentComment || "Con đã hoàn thành bài tập nộp cô giáo và thầy trợ giảng ạ!",
      });

      setIsHomeworkModalOpen(false);
      setSelectedAssignmentForSubmission(null);
      setSubmissionTitle("");
      setWorkbookFileName("");
      setStudentComment("");
      setAttachedFile(null);
      setAttachedWorkbookFile(null);
      showToast(`Nộp bài tập "${assignmentTitleToSave}" thành công cho bé ${activeStudent.fullName}! Thầy Trợ Giảng sẽ kiểm tra và nhận xét sớm.`);
    } finally {
      setIsUploadingHomework(false);
      setUploadProgress(null);
    }
  };

  const handleOpenSubmitModal = (assign: AssignmentItem) => {
    setSelectedAssignmentForSubmission(assign);
    setSubmissionTitle(assign.title);
    setAttachedFile(null);
    setAttachedWorkbookFile(null);
    setHomeworkType(
      assign.submissionType === "AUDIO" 
        ? "AUDIO" 
        : assign.submissionType === "WORKBOOK" 
        ? "WORKBOOK" 
        : assign.submissionType === "BOTH"
        ? "BOTH"
        : "VIDEO"
    );
    setWorkbookFileName("");
    setIsHomeworkModalOpen(true);
  };

  // Confirm VietQR Payment Handler
  const handleConfirmPayment = () => {
    if (!activeStudent) return;
    const trx = `VQR-${Date.now().toString().slice(-6)}`;

    if (selectedPackage.monthLabel === "CONSOLIDATED_DEBT" && debtSummary && debtSummary.isMultiMonthDebt) {
      const allBillIds = debtSummary.unpaidBills.map((b) => b.id);
      markMultiMonthTuitionPaid(
        activeStudent.id,
        allBillIds,
        "VIETQR",
        trx,
        `Phụ huynh quét VietQR thanh toán gộp ${debtSummary.debtMonthsCount} kỳ học (${debtSummary.monthsList.join(", ")})`
      );
      showToast(`Thanh toán thành công! Đã hoàn tất gộp ${debtSummary.debtMonthsCount} kỳ học phí (${formatVND(debtSummary.totalDebtAmount)}) cho bé ${activeStudent.fullName}.`);
    } else if (currentTuitionBill && currentTuitionBill.billingMonth === selectedPackage.monthLabel) {
      markTuitionBillPaid(currentTuitionBill.id, "VIETQR", trx);
      showToast(`Thanh toán thành công! Đã hoàn tất học phí ${selectedPackage.monthLabel} cho bé ${activeStudent.fullName}.`);
    } else {
      addTuitionPayment(
        activeStudent.id,
        selectedPackage.monthLabel,
        selectedPackage.amount,
        trx
      );
      showToast(`Thanh toán thành công! Đã hoàn tất học phí ${selectedPackage.monthLabel} cho bé ${activeStudent.fullName}.`);
    }

    setIsQrModalOpen(false);
  };

  // Trường hợp không tìm thấy hồ sơ con liên kết với số điện thoại này
  if (!activeStudent) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-4 my-6 animate-in fade-in">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h3 className="text-base font-bold text-slate-800">Không Tìm Thấy Hồ Sơ Học Sinh</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Số điện thoại <strong className="font-mono text-slate-800">{currentUserAccount?.phone}</strong> chưa được liên kết với hồ sơ học sinh nào trong hệ thống.
          </p>
          <p className="text-[11px] text-slate-400">
            Vui lòng liên hệ trung tâm Tiếng Anh Shiny English (Hotline: 0964645174) để kiểm tra và cập nhật số điện thoại phụ huynh.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* HEADER: CHỌN HỌC SINH & THÔNG TIN CHUNG CỦA BÉ */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-bold text-lg flex items-center justify-center shadow-md shadow-amber-200 shrink-0">
              {activeStudent?.fullName?.charAt(0) || "H"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-slate-900">
                  {activeStudent?.fullName}
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                  {activeStudent?.studentCode}
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {activeStudent?.gender === "Nữ" ? "👧 Nữ" : "👦 Nam"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Phụ huynh: <strong className="text-slate-700">{activeStudent?.parentName}</strong> • SĐT: <span className="font-mono">{activeStudent?.parentPhone}</span>
              </p>
            </div>
          </div>

          {/* Student Switcher: Chỉ cho phép chọn đúng con của mình, không xem được học sinh khác */}
          {currentUserAccount?.role === "ADMIN" ? (
            <div className="flex items-center gap-2 self-start md:self-auto bg-amber-50 p-1.5 rounded-xl border border-amber-300 text-xs">
              <span className="text-amber-800 font-bold text-[11px] pl-1">
                👑 Xem trước PH:
              </span>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="bg-white border border-amber-200 rounded-lg px-2.5 py-1 font-semibold text-slate-800 text-xs focus:outline-none"
              >
                {students.map((stu) => (
                  <option key={stu.id} value={stu.id}>
                    {stu.fullName} ({stu.className ? stu.className.split(" ")[0] : "Lớp"})
                  </option>
                ))}
              </select>
            </div>
          ) : myChildren.length > 1 ? (
            <div className="flex items-center gap-2 self-start md:self-auto bg-purple-50 p-1.5 rounded-xl border border-purple-200 text-xs">
              <span className="text-purple-800 font-bold text-[11px] pl-1">
                Chọn con ({myChildren.length} con):
              </span>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="bg-white border border-purple-300 rounded-lg px-2.5 py-1 font-bold text-purple-900 text-xs focus:outline-none"
              >
                {myChildren.map((stu) => (
                  <option key={stu.id} value={stu.id}>
                    {stu.fullName} ({stu.className ? stu.className.split(" ")[0] : "Lớp"})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 self-start md:self-auto bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-800 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Hồ Sơ Riêng Của Con</span>
            </div>
          )}
        </div>

        {/* Quick Summary Row: Lớp học, Lịch học cố định & Chuyên cần (Không để nộp học phí & xin nghỉ ở Sổ liên lạc) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-[10.5px] block font-medium">Lớp đang theo học:</span>
              <strong className="text-slate-900 font-bold">{activeClass?.name}</strong>
              <div className="text-[10.5px] text-slate-500 mt-0.5">
                {classTeacher.fullName} • {classAssistant.fullName}
              </div>
              {activeClass?.zaloGroupUrl && (
                <button
                  type="button"
                  onClick={() => window.open(activeClass.zaloGroupUrl, "_blank", "noopener,noreferrer")}
                  className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10.5px] font-bold shadow-2xs transition cursor-pointer"
                  title="Mở Nhóm Zalo lớp học của con để xem dặn dò bài tập"
                >
                  <span>💬 Tham Gia Nhóm Zalo Lớp</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
            <DoorOpen className="w-5 h-5 text-amber-500 shrink-0" />
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-[10.5px] block font-medium">Lịch học trong tuần:</span>
              <div className="font-bold text-slate-900 text-xs mt-0.5">
                {(activeClass?.schedules || []).map((s) => `${s.dayLabel} (${s.startTime} - ${s.endTime})`).join(" & ") || "Chưa có lịch"}
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                Phòng: {activeClass?.classroom || "Phòng học"}
              </div>
            </div>
            <Calendar className="w-5 h-5 text-amber-500 shrink-0" />
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-[10.5px] block font-medium">Tình trạng chuyên cần:</span>
              <div className="font-bold text-emerald-700 text-xs flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>100% Chuyên cần</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Điểm danh & làm BTVN sách đầy đủ
              </div>
            </div>
            <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MOBILE-FIRST TAB NAVIGATION (Android + iOS 1-Tap & Swipe) */}
      {/* ============================================================== */}
      <div className="w-full space-y-2">
        {/* Mobile Dropdown for small screens */}
        <div className="sm:hidden w-full">
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-600 pl-1 shrink-0">Mục xem:</span>
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 focus:outline-none"
            >
              <option value="FEED">📖 Sổ Liên Lạc (Hôm Nay)</option>
              <option value="TIMETABLE">📅 Thời Khóa Biểu Của Bé</option>
              <option value="HOMEWORK">📝 Bài Tập Về Nhà ({studentSubmissions.length})</option>
              <option value="EXAM_REPORTS">📊 Báo Cáo & Bài Thi ({studentExamReports.length})</option>
              <option value="TUITION_LEAVE">💰 Học Phí</option>
            </select>
          </div>
        </div>

        {/* Swipeable Tabs for tablet / desktop and swipe gestures */}
        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto no-scrollbar mobile-tabs">
          <button
            onClick={() => setActiveTab("FEED")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition active-press ${
              activeTab === "FEED"
                ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Sổ Liên Lạc (Hôm Nay)
          </button>

          <button
            onClick={() => setActiveTab("TIMETABLE")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition active-press ${
              activeTab === "TIMETABLE"
                ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Thời Khóa Biểu Của Bé
          </button>

          <button
            onClick={() => setActiveTab("HOMEWORK")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition active-press ${
              activeTab === "HOMEWORK"
                ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" /> Bài Tập Về Nhà ({assignedList.length > 0 ? `${assignedList.length} cần nộp` : `${completedList.length} đã nộp`})
          </button>

          <button
            onClick={() => setActiveTab("EXAM_REPORTS")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition active-press ${
              activeTab === "EXAM_REPORTS"
                ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" /> Báo Cáo & Bài Thi ({studentExamReports.length})
          </button>

          <button
            onClick={() => setActiveTab("TUITION_LEAVE")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition active-press ${
              activeTab === "TUITION_LEAVE"
                ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Coins className="w-3.5 h-3.5" /> Học Phí
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: SỔ LIÊN LẠC ĐIỆN TỬ (HÔM NAY) */}
      {/* ============================================================== */}
      {activeTab === "FEED" && (
        <div className="space-y-4">
          {/* THẺ THÔNG BÁO LỊCH HỌC BÙ DÀNH CHO BÉ NẾU CÓ TRONG THÁNG */}
          {studentMakeupClasses.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-4 sm:p-5 rounded-2xl text-white shadow-md space-y-3 border border-indigo-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1">
                    <CalendarCheck className="w-3.5 h-3.5" /> Lịch Học Bù Trong Tháng
                  </span>
                  <span className="text-xs text-indigo-200">
                    Bé có <strong>{studentMakeupClasses.length} lớp học bù</strong> đã được trung tâm sắp xếp
                  </span>
                </div>
                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-indigo-200 font-medium">
                  Chỉ áp dụng trong tháng
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {studentMakeupClasses.map((mc) => {
                  const [y, m, d] = mc.dateStr.split("-");
                  const formattedDate = `${d}/${m}/${y}`;
                  const myEntry = mc.students.find((s) => s.studentId === activeStudent?.id);

                  return (
                    <div key={mc.id} className="p-3 bg-white/10 backdrop-blur rounded-xl border border-white/10 space-y-1.5 text-xs">
                      <div className="font-bold text-amber-300 text-sm">Lịch Học Bù</div>
                      <div className="flex items-center gap-2 text-indigo-100">
                        <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Thời gian: <strong>{mc.startTime} - {mc.endTime}</strong>, ngày <strong>{formattedDate}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-indigo-100">
                        <DoorOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Phòng học: <strong>{mc.classroomName}</strong></span>
                      </div>
                      {myEntry?.absentDateStr && (
                        <div className="text-[11px] text-slate-300 flex items-center justify-between pt-0.5">
                          <span>Bù cho buổi vắng ngày: <strong className="text-rose-300">{myEntry.absentDateStr}</strong></span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            myEntry.attendanceStatus === "ATTENDED"
                              ? "bg-emerald-500 text-white"
                              : myEntry.attendanceStatus === "ABSENT"
                              ? "bg-amber-400 text-slate-950"
                              : "bg-white/20 text-white"
                          }`}>
                            {myEntry.attendanceStatus === "ATTENDED" ? "✓ Đã Tham Gia" : myEntry.attendanceStatus === "ABSENT" ? "Vắng (Bảo Lưu Bù)" : "Đã Đăng Ký"}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* HÀNG 1: 3 THẺ ĐIỂM DANH, KIỂM TRA SÁCH VỞ & HỌC PHÍ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {/* Thẻ 1: Tình trạng điểm danh hôm nay */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-2 border-b border-slate-100 mb-2">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Điểm Danh Buổi Học
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">19:00 - 20:30</span>
                </div>

                {!studentAttendance ? (
                  <div className="text-xs text-slate-500 py-3 text-center">
                    Chưa có dữ liệu điểm danh ca học này
                  </div>
                ) : studentAttendance.status === "PRESENT" ? (
                  <div className="space-y-1.5">
                    <div className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Bé đã có mặt đúng giờ tại lớp</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Ghi nhận lúc: {new Date(studentAttendance.markedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} • Bởi: {studentAttendance.markedBy}
                    </div>
                  </div>
                ) : studentAttendance.status === "LATE" ? (
                  <div className="space-y-1.5">
                    <div className="text-sm font-bold text-amber-700 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Bé đi muộn {studentAttendance.lateMinutes || 10} phút</span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Lý do: {studentAttendance.note || "Đã vào lớp an toàn"}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="text-sm font-bold text-rose-700 flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Bé vắng mặt buổi học</span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Lý do: {studentAttendance.note || "Nghỉ phép (Bảo lưu buổi học)"}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 mt-3 flex items-center justify-between">
                <span>Lịch tiếp theo: <strong className="text-amber-700">Thứ 5 (17:00)</strong></span>
                <span className="text-slate-400">{activeClass?.classroom}</span>
              </div>
            </div>

            {/* Thẻ 2: Kiểm tra sách / vở Workbook tại lớp (TA kiểm tra) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-2 border-b border-slate-100 mb-2">
                  <span className="flex items-center gap-1.5 text-indigo-700">
                    <BookCheck className="w-4 h-4 text-indigo-600" /> BTVN Sách / Vở Workbook
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Trợ giảng kiểm tra</span>
                </div>

                {!studentWorkbookRecord ? (
                  <div className="text-xs text-slate-500 py-3 text-center">
                    Chưa có dữ liệu kiểm tra sách bài tập
                  </div>
                ) : studentWorkbookRecord.status === "DONE" ? (
                  <div className="space-y-1.5">
                    <div className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Bé đã làm đầy đủ bài tập trong sách</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      {studentWorkbookRecord.note || "Con hoàn thành rất cẩn thận, chữ viết rõ ràng sạch đẹp."}
                    </p>
                  </div>
                ) : studentWorkbookRecord.status === "NOT_DONE" ? (
                  <div className="space-y-1.5">
                    <div className="text-sm font-bold text-rose-700 flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Hôm nay cô kiểm tra sách/vở thấy con chưa làm bài</span>
                    </div>
                    <p className="text-[11px] text-rose-600 font-medium">
                      Bố mẹ vui lòng nhắc nhở bé hoàn thành bù bài tập trang 34-35 nhé.
                    </p>
                  </div>
                ) : studentWorkbookRecord.status === "FORGOT_BOOK" ? (
                  <div className="space-y-1.5">
                    <div className="text-sm font-bold text-amber-700 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Hôm nay con quên mang sách/vở Workbook</span>
                    </div>
                    <p className="text-[11px] text-amber-700">
                      Bố mẹ cho con mang bù sách/vở vào buổi học tiếp theo để cô kiểm tra nhé.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="text-sm font-bold text-amber-700 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Bé làm chưa hoàn thành đủ bài trong sách</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      {studentWorkbookRecord.note || "Còn thiếu phần bài tập 2."}
                    </p>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 mt-3 flex items-center justify-between">
                <span>Trợ giảng kiểm tra: <strong className="text-indigo-700">{classAssistant.fullName}</strong></span>
                <span className="text-slate-400 text-xs">Đầu giờ</span>
              </div>
            </div>

            {/* Thẻ 3: Thông tin ca học & Thời khóa biểu (Thay thế học phí ở Sổ liên lạc) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-2 border-b border-slate-100 mb-2">
                  <span className="flex items-center gap-1.5 text-blue-800">
                    <Calendar className="w-4 h-4 text-blue-600" /> Thông Tin Ca Học Cố Định
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold">
                    90 phút / ca
                  </span>
                </div>

                <div className="space-y-1.5 py-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Lịch học trong tuần:</span>
                    <strong className="text-slate-900 font-bold">
                      {(activeClass?.schedules || []).map((s) => s.dayLabel).join(" & ") || "Thứ 3 & Thứ 5"}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Khung giờ học:</span>
                    <strong className="font-mono text-slate-900">
                      {activeClass?.schedules?.[0]?.startTime || "19:00"} - {activeClass?.schedules?.[0]?.endTime || "20:30"}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Phòng học:</span>
                    <span className="text-slate-800 font-semibold">{activeClass?.classroom || "Phòng Shiny 201"}</span>
                  </div>
                </div>

                <p className="text-[10.5px] text-slate-500 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  Thầy cô luôn sẵn sàng tại phòng học trước 15 phút để đón và hỗ trợ các con.
                </p>
              </div>

              <div className="pt-2.5 border-t border-slate-100 mt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab("TIMETABLE")}
                  className="w-full py-2 bg-slate-100 hover:bg-amber-100 text-slate-800 hover:text-amber-900 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span>Xem Chi Tiết Thời Khóa Biểu Tuần →</span>
                </button>
              </div>
            </div>
          </div>

          {/* HÀNG 2: LƯU Ý RIÊNG ĐỘT XUẤT TỪ THẦY CÔ / TRỢ GIẢNG (NẾU CÓ) */}
          {studentIncidents.length > 0 && (
            <div className="bg-gradient-to-r from-amber-50 via-rose-50/40 to-amber-50 rounded-2xl border border-amber-300/80 p-4 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-bold shadow-xs">
                    🔔
                  </span>
                  <h4 className="font-bold text-xs sm:text-sm text-amber-950">
                    Lưu Ý Riêng Buổi Học Của Con Từ Thầy Cô / Trợ Giảng
                  </h4>
                </div>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                  Gửi Riêng Cho Bố Mẹ
                </span>
              </div>

              <div className="space-y-2">
                {studentIncidents.map((note) => (
                  <div key={note.id} className="p-3 bg-white/90 rounded-xl border border-amber-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        {note.tag === "TALKING_IN_CLASS" ? "Nhắc nhở: Nói chuyện riêng / chưa tập trung" :
                         note.tag === "FORGOT_SUPPLIES" ? "Nhắc nhở: Quên sách vở / đồ dùng" :
                         note.tag === "OUTSTANDING_PRAISE" ? "Khen ngợi đặc biệt" :
                         note.tag === "TIRED_UNWELL" ? "Sức khỏe: Bé có biểu hiện mệt mỏi" : "Lưu ý riêng"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(note.sentAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} • Bởi: {note.senderName}
                      </span>
                    </div>
                    <p className="text-slate-800 leading-relaxed font-medium italic">
                      &ldquo;{note.content}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HÀNG 3: NỘI DUNG CÁC BUỔI HỌC TRONG TUẦN TRÊN SỔ LIÊN LẠC (KHÔNG CHỨA KHUNG NỘP BTVN) */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-sm text-slate-900">
                  Nội Dung Các Buổi Học Trong Tuần ({visiblePublishedLogs.length} buổi)
                </h4>
              </div>
              {classPublishedLogs.length > currentWeekPublishedLogs.length && (
                <button
                  type="button"
                  onClick={() => setIsShowAllLogs((prev) => !prev)}
                  className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-xl border border-blue-200 transition"
                >
                  {isShowAllLogs
                    ? "Chỉ xem các buổi trong tuần"
                    : `Xem thêm các buổi trước (${classPublishedLogs.length})`}
                </button>
              )}
            </div>

            {visiblePublishedLogs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-xs text-slate-500">
                Giáo viên chưa xuất bản nội dung buổi học nào cho lớp {activeClass?.name || ""} trong tuần này.
              </div>
            ) : (
              visiblePublishedLogs.map((logItem) => {
                const sessionRemark = (logItem.studentRemarks || []).find(
                  (r) => r.studentId === activeStudent?.id
                );
                const dayLabel = getDayOfWeekLabel(logItem.dateStr);
                return (
                  <div key={logItem.id} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                            {dayLabel} • {logItem.dateStr}
                          </span>
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            ✓ Đã phát hành
                          </span>
                        </div>
                        <h4 className="font-bold text-base text-slate-900 mt-1.5">
                          {logItem.lessonTopic || "Nội dung buổi học"}
                        </h4>
                      </div>

                      <div className="text-xs text-slate-500">
                        Phụ trách: <strong className="text-slate-800">{logItem.authorName || classTeacher.fullName}</strong>
                      </div>
                    </div>

                    {logItem.lessonContent && (
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                        {logItem.lessonContent}
                      </div>
                    )}

                    {/* Lời nhận xét riêng cho con trong buổi học này */}
                    {(sessionRemark?.feedback || logItem.generalFeedback) && (
                      <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 text-xs space-y-1.5">
                        <div className="font-bold text-amber-900 flex items-center gap-1.5 text-xs sm:text-sm">
                          <Sparkles className="w-4 h-4 text-amber-600 fill-amber-400" />
                          <span>
                            {sessionRemark?.feedback
                              ? `Lời Nhận Xét Dành Riêng Cho Bé ${activeStudent?.fullName}:`
                              : "Nhận Xét Chung Của Giáo Viên:"}
                          </span>
                        </div>
                        <p className="text-slate-800 italic leading-relaxed text-xs sm:text-[13px]">
                          &ldquo;{sessionRemark?.feedback || logItem.generalFeedback}&rdquo;
                        </p>
                      </div>
                    )}

                    {(logItem.vocabularyTaught || logItem.grammarFocus) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                        {logItem.vocabularyTaught && (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <span className="font-bold text-slate-800 block mb-1">
                              📚 Từ vựng con đã học:
                            </span>
                            <p className="font-mono text-slate-700 text-[11px] leading-relaxed">
                              {logItem.vocabularyTaught}
                            </p>
                          </div>
                        )}
                        {logItem.grammarFocus && (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <span className="font-bold text-slate-800 block mb-1">
                              💬 Mẫu câu giao tiếp trọng tâm:
                            </span>
                            <p className="text-slate-700 text-[11px] leading-relaxed">
                              {logItem.grammarFocus}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: THỜI KHÓA BIỂU CỦA BÉ */}
      {/* ============================================================== */}
      {activeTab === "TIMETABLE" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500" />
                Thời Khóa Biểu Hàng Tuần - Lớp {activeClass?.name}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Hiển thị rõ ràng ngày học trong tuần và giờ học trong ngày của con
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 self-start sm:self-auto">
              {(activeClass?.schedules || []).length} Buổi / Tuần (90 phút/buổi)
            </span>
          </div>

          {/* Prominent Quick Info Alert Banner */}
          <div className="p-4 bg-gradient-to-r from-amber-50 via-amber-100/40 to-amber-50 rounded-2xl border border-amber-300 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-bold flex items-center justify-center shrink-0 shadow-sm text-lg">
                🗓️
              </div>
              <div>
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">
                  Lịch học cố định hàng tuần của bé:
                </span>
                <div className="text-sm sm:text-base font-extrabold text-slate-900">
                  {(activeClass?.schedules || []).map((s) => `${s.dayLabel} (${s.startTime} - ${s.endTime})`).join(" & ") || "Thứ 3 & Thứ 5 (19:00 - 20:30)"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-slate-800 font-semibold flex items-center gap-1.5 shadow-2xs">
                <DoorOpen className="w-4 h-4 text-amber-600" /> {Array.from(new Set((activeClass?.schedules || []).map((s) => s.classroom || activeClass?.classroom).filter(Boolean))).join(" / ") || activeClass?.classroom || "Phòng học"}
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-slate-800 font-semibold flex items-center gap-1.5 shadow-2xs">
                <GraduationCap className="w-4 h-4 text-purple-600" /> {classTeacher.fullName}
              </span>
            </div>
          </div>

          {/* 7-Day Weekly Schedule Matrix (Thứ 2 đến Chủ Nhật) */}
          <div className="space-y-2">
            <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> Lịch Trình Chi Tiết 7 Ngày Trong Tuần
            </h5>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {[
                { dayOfWeek: 2, label: "Thứ 2" },
                { dayOfWeek: 3, label: "Thứ 3" },
                { dayOfWeek: 4, label: "Thứ 4" },
                { dayOfWeek: 5, label: "Thứ 5" },
                { dayOfWeek: 6, label: "Thứ 6" },
                { dayOfWeek: 7, label: "Thứ 7" },
                { dayOfWeek: 8, label: "Chủ Nhật" },
              ].map((day) => {
                const matchedSlot = (activeClass?.schedules || []).find((s) => s.dayOfWeek === day.dayOfWeek);
                const dayMakeups = studentMakeupClasses.filter((mc) => {
                  const d = new Date(mc.dateStr + "T00:00:00");
                  const mcDay = d.getDay() === 0 ? 8 : d.getDay() + 1;
                  return mcDay === day.dayOfWeek;
                });
                const hasClass = !!matchedSlot || dayMakeups.length > 0;
                const currentJsDay = new Date().getDay();
                const currentOurDay = currentJsDay === 0 ? 8 : currentJsDay + 1;
                const isToday = day.dayOfWeek === currentOurDay;

                return (
                  <div
                    key={day.dayOfWeek}
                    className={`p-3 rounded-2xl border transition flex flex-col justify-between min-h-[110px] ${
                      isToday
                        ? "bg-gradient-to-b from-blue-50/90 via-amber-50/50 to-white border-blue-400 shadow-md ring-2 ring-blue-400"
                        : dayMakeups.length > 0 && !matchedSlot
                        ? "bg-gradient-to-b from-indigo-50 to-white border-indigo-400 shadow-sm ring-1 ring-indigo-300"
                        : hasClass
                        ? "bg-gradient-to-b from-amber-50 to-white border-amber-400 shadow-sm ring-1 ring-amber-300"
                        : "bg-slate-50/70 border-slate-200 text-slate-400"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                        <div className="flex items-center gap-1">
                          <span className={`text-xs font-bold ${hasClass ? "text-amber-950 font-extrabold" : "text-slate-500"}`}>
                            {day.label}
                          </span>
                          {isToday && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-blue-600 text-white shadow-2xs">
                              Hôm nay
                            </span>
                          )}
                        </div>
                        {hasClass && (
                          <span className={`w-2 h-2 rounded-full ${dayMakeups.length > 0 ? "bg-indigo-500" : "bg-amber-500"} animate-pulse`} />
                        )}
                      </div>

                      {matchedSlot && (
                        <div className="space-y-1 mb-1.5">
                          <span className="inline-block px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-bold font-mono text-[11px] shadow-2xs">
                            {matchedSlot.startTime} - {matchedSlot.endTime}
                          </span>
                          <div className="text-[10.5px] font-semibold text-slate-800 line-clamp-1">
                            {(matchedSlot.classroom || activeClass?.classroom || "Phòng học").split("(")[0]}
                          </div>
                        </div>
                      )}

                      {dayMakeups.map((mc) => {
                        const [, m, d] = mc.dateStr.split("-");
                        return (
                          <div key={mc.id} className="space-y-0.5 p-1.5 rounded-lg bg-indigo-50 border border-indigo-200 mt-1">
                            <span className="inline-block px-1.5 py-0.2 rounded bg-indigo-600 text-white font-bold text-[9.5px]">
                              Lịch Học Bù ({d}/{m})
                            </span>
                            <div className="font-mono font-bold text-[10.5px] text-indigo-950">
                              {mc.startTime} - {mc.endTime}
                            </div>
                            <div className="text-[10px] font-semibold text-indigo-800 line-clamp-1">
                              {mc.classroomName}
                            </div>
                          </div>
                        );
                      })}

                      {!matchedSlot && dayMakeups.length === 0 && (
                        <div className="text-[10px] text-slate-400 mt-2 italic">
                          Không có ca
                        </div>
                      )}
                    </div>

                    <div className="pt-1.5 border-t border-slate-100 text-[9.5px]">
                      {hasClass ? (
                        <span className={dayMakeups.length > 0 && !matchedSlot ? "text-indigo-700 font-bold" : "text-emerald-700 font-bold"}>
                          {dayMakeups.length > 0 && !matchedSlot ? "✓ Có lịch học bù" : "✓ Có ca học"}
                        </span>
                      ) : (
                        <span className="text-slate-400">Nghỉ / Ôn bài</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Schedule Cards */}
          <div className="space-y-2">
            <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500">
              Chi Tiết Từng Buổi Học Trong Tuần
            </h5>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(activeClass?.schedules || []).map((slot, index) => (
                <div 
                  key={index}
                  className="p-4 rounded-xl border border-amber-300/80 bg-gradient-to-br from-amber-50/40 via-white to-white space-y-2.5 shadow-2xs hover:border-amber-400 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-mono shadow-2xs">
                      {slot.dayLabel} Hàng Tuần
                    </span>
                    <span className="text-xs font-bold text-slate-800 font-mono flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      {slot.startTime} - {slot.endTime} (90 Phút)
                    </span>
                  </div>

                  <div className="text-xs space-y-1.5 pt-1">
                    <div className="text-slate-800 flex items-center justify-between">
                      <span className="text-slate-500">Phòng học:</span>
                      <strong className="text-slate-900">{slot.classroom || activeClass?.classroom || "Phòng học"}</strong>
                    </div>
                    <div className="text-slate-800 flex items-center justify-between">
                      <span className="text-slate-500">Giáo viên đứng lớp:</span>
                      <span className="font-bold text-purple-900">{slot.teacherName || classTeacher.fullName}</span>
                    </div>
                    <div className="text-slate-800 flex items-center justify-between">
                      <span className="text-slate-500">Trợ giảng phụ trách:</span>
                      <span className="font-bold text-blue-900">{slot.assistantName || classAssistant.fullName}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-emerald-800 font-medium pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span>Trạng thái: Đang diễn ra đều đặn</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lịch Học Bù Của Bé (Chỉ hiện lịch học + phòng học, ẩn GV, bạn cùng lớp & nội dung) */}
          {studentMakeupClasses.length > 0 && (
            <div className="space-y-2">
              <h5 className="font-bold text-xs uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                <CalendarCheck className="w-3.5 h-3.5 text-indigo-600" /> Lịch Học Bù Trong Tháng Của Bé
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {studentMakeupClasses.map((mc) => {
                  const [y, m, d] = mc.dateStr.split("-");
                  const formattedDate = `${d}/${m}/${y}`;
                  return (
                    <div
                      key={mc.id}
                      className="p-4 rounded-xl border border-indigo-300 bg-gradient-to-br from-indigo-50/70 via-white to-white space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-3 py-1 rounded-lg bg-indigo-600 text-white shadow-2xs">
                          Lịch Học Bù • {formattedDate}
                        </span>
                        <span className="text-xs font-bold text-slate-800 font-mono flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          {mc.startTime} - {mc.endTime}
                        </span>
                      </div>
                      <div className="text-xs pt-1 flex items-center justify-between">
                        <span className="text-slate-500">Phòng học:</span>
                        <strong className="text-slate-900 flex items-center gap-1">
                          <DoorOpen className="w-3.5 h-3.5 text-indigo-600" />
                          {mc.classroomName}
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dặn dò phụ huynh đưa đón */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs space-y-1 text-amber-950">
            <strong className="font-bold flex items-center gap-1.5 text-amber-900">
              <Sparkles className="w-4 h-4 text-amber-600" /> Thông tin đưa đón:
            </strong>
            <p className="leading-relaxed text-[11.5px] text-amber-900">
              Phụ huynh vui lòng đưa con đến lớp trước giờ học từ 5–10 phút, mang theo đầy đủ đồ dùng học tập và sách vở. Khi gia đình có việc cần xin nghỉ cho con, vui lòng nhắn vào nhóm Zalo chung của lớp để thầy cô cùng nắm được thông tin.
            </p>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: BÀI TẬP VỀ NHÀ (PHONG CÁCH MICROSOFT TEAMS ASSIGNMENTS) */}
      {/* ============================================================== */}
      {activeTab === "HOMEWORK" && (
        <div className="space-y-4">
          {/* Top Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
                  <FileCheck className="w-3.5 h-3.5 text-blue-600" /> Giao Bài Tập Phong Cách Microsoft Teams
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Khóa buổi nộp chính xác 100%
                </span>
              </div>
              <h4 className="font-bold text-base text-slate-900">
                Bài Tập Về Nhà - Lớp {activeClass?.name}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Mỗi bài tập được giao tương ứng chính xác với từng buổi học để tránh phụ huynh nộp bài nhầm buổi.
              </p>
            </div>

            {/* Teams Tabs Toggle: Assigned vs Completed */}
            <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl self-start sm:self-auto border border-slate-200">
              <button
                type="button"
                onClick={() => setTeamsHwTab("ASSIGNED")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  teamsHwTab === "ASSIGNED"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Cần nộp (Assigned)</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  teamsHwTab === "ASSIGNED" ? "bg-blue-800 text-white" : "bg-slate-200 text-slate-700 font-semibold"
                }`}>
                  {assignedList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTeamsHwTab("COMPLETED")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  teamsHwTab === "COMPLETED"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Đã nộp & Đã kiểm tra</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  teamsHwTab === "COMPLETED" ? "bg-emerald-800 text-white" : "bg-slate-200 text-slate-700 font-semibold"
                }`}>
                  {completedList.length}
                </span>
              </button>
            </div>
          </div>

          {/* VIEW 1: CẦN NỘP (ASSIGNED) */}
          {teamsHwTab === "ASSIGNED" && (
            <div className="space-y-3">
              {assignedList.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-xl font-bold">
                    ✓
                  </div>
                  <div className="font-bold text-slate-800 text-sm">Tuyệt vời! Bé đã nộp đầy đủ toàn bộ bài tập.</div>
                  <p className="text-slate-400">Không có bài tập nào còn tồn đọng cần nộp.</p>
                </div>
              ) : (
                assignedList.map((assign) => (
                  <div
                    key={assign.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3.5 hover:border-blue-400 transition"
                  >
                    {/* Header: Session Tag & Due Date */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 font-extrabold text-xs font-mono">
                          {assign.sessionTitle}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-rose-700 font-bold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 self-start sm:self-auto">
                        <Clock className="w-3.5 h-3.5 text-rose-600" />
                        <span>Hạn nộp: {assign.dueDateTime}</span>
                      </div>
                    </div>

                    {/* Assignment Body */}
                    <div>
                      <h5 className="font-bold text-sm sm:text-base text-slate-900 leading-snug">
                        {assign.title}
                      </h5>
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                        {assign.instructions}
                      </p>
                    </div>

                    {/* Reference Material if available */}
                    {assign.referenceFileName && (
                      <div className="flex items-center justify-between p-2.5 bg-blue-50/60 rounded-xl border border-blue-200 text-xs">
                        <div className="flex items-center gap-2 text-blue-900">
                          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="font-semibold">Tài liệu mẫu / Đề bài:</span>
                          <span className="font-mono text-[11px] underline cursor-pointer">{assign.referenceFileName}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => showToast(`Đang tải file ${assign.referenceFileName}...`)}
                          className="px-2 py-1 rounded-lg bg-white border border-blue-300 text-blue-700 font-bold text-[11px] hover:bg-blue-100 transition"
                        >
                          Tải về
                        </button>
                      </div>
                    )}

                    {/* Bottom CTA: Nộp bài cho buổi này */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <div className="text-[11px] text-slate-500">
                        Hình thức nộp: <strong className="text-slate-800">
                          {assign.submissionType === "BOTH" 
                            ? "🌟 Cả Quay Video & Sách Workbook" 
                            : assign.submissionType === "AUDIO" 
                            ? "Ghi âm Audio" 
                            : assign.submissionType === "WORKBOOK" 
                            ? "Chụp ảnh sách bài tập" 
                            : "Quay video thuyết trình"}
                        </strong> • Trợ giảng sẽ chấm
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenSubmitModal(assign)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 self-start sm:self-auto"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Nộp bài cho buổi này</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* VIEW 2: ĐÃ HOÀN THÀNH (TURNED IN / GRADED) */}
          {teamsHwTab === "COMPLETED" && (
            <div className="space-y-3">
              {completedList.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                  Bé chưa nộp bài tập nào. Hãy chuyển sang mục &quot;Cần nộp&quot; để nộp bài nhé!
                </div>
              ) : (
                completedList.map(({ submission: sub, assignment: assign }) => (
                  <div
                    key={sub.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3 hover:border-emerald-300 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-extrabold text-xs font-mono">
                          {sub.sessionTitle || assign?.sessionTitle || `Buổi học: ${activeClass?.name}`}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Nộp lúc: {new Date(sub.submittedAt).toLocaleString("vi-VN")}
                        </span>
                      </div>

                      <div>
                        {sub.status === "GRADED" ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Đã Kiểm Tra
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Đã Nộp • Đang Chờ Trợ Giảng Kiểm Tra
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h5 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2 flex-wrap">
                        <span>{sub.assignmentTitle}</span>
                        <span className="text-[11px] font-mono text-slate-500">({sub.mediaTitle})</span>
                      </h5>
                      {/* Tệp đính kèm bài nộp từ thiết bị */}
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {sub.attachmentFileName && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 text-xs font-mono font-medium">
                            <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                            <span>{sub.attachmentFileName}</span>
                            {sub.attachmentFileSize && (
                              <span className="text-[10px] text-blue-600 bg-white px-1.5 py-0.2 rounded border border-blue-200 font-bold">
                                {sub.attachmentFileSize}
                              </span>
                            )}
                          </span>
                        )}
                        {sub.workbookImageFileName && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-200 text-xs font-mono font-medium">
                            <Camera className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{sub.workbookImageFileName}</span>
                            {sub.workbookFileSize && (
                              <span className="text-[10px] text-indigo-600 bg-white px-1.5 py-0.2 rounded border border-indigo-200 font-bold">
                                {sub.workbookFileSize}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Lời nhắn của học sinh khi nộp */}
                    {sub.commentFromStudent && (
                      <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <strong>Lời nhắn của con: </strong>
                        <span className="italic">&ldquo;{sub.commentFromStudent}&rdquo;</span>
                      </div>
                    )}

                    {/* Nhận xét chấm điểm của Trợ giảng */}
                    {sub.status === "GRADED" && (
                      <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <strong className="text-amber-950 font-bold flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            Nhận xét từ {sub.gradedBy || classAssistant.fullName}:
                          </strong>
                          <span className="text-[10px] text-slate-400">
                            {sub.gradedAt ? new Date(sub.gradedAt).toLocaleString("vi-VN") : ""}
                          </span>
                        </div>
                        <p className="text-slate-800 leading-relaxed italic font-medium">
                          &ldquo;{sub.taFeedback}&rdquo;
                        </p>
                      </div>
                    )}

                    <div className="pt-1 flex items-center justify-end gap-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setViewingSubmissionId(sub.id)}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>Xem Bài Đã Nộp</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: BÁO CÁO HỌC TẬP & BÀI THI THÁNG */}
      {/* ============================================================== */}
      {activeTab === "EXAM_REPORTS" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
            <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              Báo Cáo Bài Thi Định Kỳ Hàng Tháng (Monthly Exam Reports)
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Đánh giá chuẩn Cambridge 3 kỹ năng: Nghe, Nói, Đọc & Viết • Kèm file PDF bài thi thật của con
            </p>
          </div>

          <div className="space-y-4">
            {studentExamReports.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                Chưa có báo cáo bài thi tháng nào cho bé. Giáo viên sẽ cập nhật sau mỗi đợt thi tháng!
              </div>
            ) : (
              studentExamReports.map((report) => (
                <div 
                  key={report.id}
                  className="bg-white rounded-2xl border border-indigo-200 p-4 sm:p-5 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-indigo-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200">
                          🏆 {report.monthStr}
                        </span>
                        <span className="text-xs text-slate-500">
                          Lớp: <strong className="text-slate-800">{report.className}</strong>
                        </span>
                      </div>
                      <h4 className="font-bold text-base text-slate-900 mt-1">
                        {report.examTitle}
                      </h4>
                    </div>

                    <div className="text-xs text-slate-500">
                      Giáo viên chấm: <strong className="text-slate-800">{report.teacherName}</strong>
                    </div>
                  </div>

                  {/* Bảng điểm 3 kỹ năng & Tổng điểm */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-center">
                      <span className="text-[11px] font-medium text-indigo-900 block">🎧 Nghe (Listening)</span>
                      <span className="font-mono text-xl font-bold text-indigo-700">{report.listeningScore}</span>
                      <span className="text-[10px] text-slate-400"> / 10</span>
                    </div>

                    <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-center">
                      <span className="text-[11px] font-medium text-indigo-900 block">🗣️ Nói (Speaking)</span>
                      <span className="font-mono text-xl font-bold text-indigo-700">{report.speakingScore}</span>
                      <span className="text-[10px] text-slate-400"> / 10</span>
                    </div>

                    <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-center">
                      <span className="text-[11px] font-medium text-indigo-900 block">✍️ Đọc & Viết (R&W)</span>
                      <span className="font-mono text-xl font-bold text-indigo-700">{report.readingWritingScore}</span>
                      <span className="text-[10px] text-slate-400"> / 10</span>
                    </div>

                    <div className="p-3 bg-gradient-to-br from-amber-50 to-amber-100/70 rounded-xl border border-amber-200 text-center">
                      <span className="text-[11px] font-bold text-amber-900 block">⭐ Điểm Tổng Kết</span>
                      <span className="font-mono text-xl font-bold text-amber-700">{report.totalScore}</span>
                      <span className="text-[10px] text-amber-800 font-semibold block">Xuất Sắc</span>
                    </div>
                  </div>

                  {/* Lời nhận xét chuyên sâu & Điểm mạnh / cải thiện */}
                  <div className="space-y-2 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <strong className="text-slate-900 block mb-1">📝 Lời nhận xét chi tiết của giáo viên:</strong>
                      <p className="text-slate-700 italic leading-relaxed">
                        &ldquo;{report.teacherFeedback}&rdquo;
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                        <span className="font-bold text-emerald-800 block mb-0.5">🌟 Điểm mạnh nổi bật:</span>
                        <span className="text-slate-700">{report.strengths}</span>
                      </div>

                      <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                        <span className="font-bold text-amber-800 block mb-0.5">🎯 Điểm cần rèn luyện thêm:</span>
                        <span className="text-slate-700">{report.areasForImprovement}</span>
                      </div>
                    </div>
                  </div>

                  {/* File PDF đính kèm & Tải xuống */}
                  <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0">
                        PDF
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-800">{report.pdfFileName || "Bai_Kiem_Tra_Dinh_Ky.pdf"}</div>
                        <div className="text-[11px] text-slate-500">File scan bài thi gốc của con • {report.pdfFileSize || "1.8 MB"}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => alert(`Đang tải file bài thi PDF của con: "${report.pdfFileName || "Bai_Kiem_Tra_Dinh_Ky.pdf"}". Bố mẹ kiểm tra thư mục Tải về (Downloads) nhé!`)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải File PDF Bài Kiểm Tra Của Con</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: HỌC PHÍ & ĐƠN XIN NGHỈ PHÉP */}
      {/* ============================================================== */}
      {activeTab === "TUITION_LEAVE" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {/* Thẻ 1: Chi tiết học phí định kỳ theo tháng */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-500" />
                    Học Phí Định Kỳ Theo Tháng
                  </h4>
                  <span className="text-xs font-mono font-bold text-emerald-600">
                    {(currentTuitionBill?.feePerLesson || activeClass?.feePerLesson || activeStudent?.feePerLesson || (activeStudent?.monthlyFee ? Math.round(activeStudent.monthlyFee / 8) : 200000)).toLocaleString("vi-VN")} đ/buổi
                  </span>
                </div>

                <div className="py-4 text-center bg-gradient-to-br from-amber-50 to-emerald-50/40 rounded-xl border border-amber-200 my-3">
                  <span className="text-xs text-slate-500 font-medium">Tình trạng kỳ {currentTuitionBill?.billingMonth || activeStudent?.currentBillingMonth || getCurrentBillingMonth()}:</span>
                  <div className={`text-2xl font-bold mt-1 ${
                    (currentTuitionBill?.status === "PAID" || activeStudent?.tuitionStatus === "PAID") ? "text-emerald-700" : "text-rose-600"
                  }`}>
                    {(currentTuitionBill?.status === "PAID" || activeStudent?.tuitionStatus === "PAID") ? "✓ ĐÃ HOÀN TẤT HỌC PHÍ" : "CHƯA NỘP HỌC PHÍ"}
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-1">
                    {(currentTuitionBill?.status === "PAID" || activeStudent?.tuitionStatus === "PAID")
                      ? (currentTuitionBill?.paidAt
                          ? `Đã thanh toán ngày ${new Date(currentTuitionBill.paidAt).toLocaleDateString("vi-VN")} qua ${currentTuitionBill.paymentMethod === "CASH" ? "Tiền mặt" : "VietQR"}`
                          : "Đã hoàn tất học phí kỳ này")
                      : `Hạn đóng học phí: ${currentTuitionBill?.dueDate || activeStudent?.tuitionDueDate || getDefaultTuitionDueDate(currentTuitionBill?.billingMonth || activeStudent?.currentBillingMonth)}`}
                  </span>
                </div>

                {/* Cảnh báo nợ nhiều tháng nếu có */}
                {debtSummary && debtSummary.isMultiMonthDebt && (
                  <div className="p-3 bg-gradient-to-r from-purple-50 via-rose-50 to-amber-50 rounded-xl border border-purple-300 text-xs space-y-1 mb-3">
                    <div className="flex items-center justify-between font-bold text-purple-950">
                      <span className="flex items-center gap-1.5">
                        <AlertOctagon className="w-4 h-4 text-rose-600" />
                        Thông Báo Công Nợ: Con đang nợ {debtSummary.debtMonthsCount} kỳ học phí
                      </span>
                      <span className="font-mono text-rose-800 text-sm font-black">
                        {formatVND(debtSummary.totalDebtAmount)}
                      </span>
                    </div>
                    <div className="text-[11px] text-purple-900 leading-relaxed">
                      Bao gồm các kỳ: <strong>{debtSummary.monthsList.join(", ")}</strong>. Bố mẹ có thể bấm nút <strong>Quét Mã VietQR</strong> bên dưới để chọn hình thức <em>Đóng gộp toàn bộ các tháng</em> trong 1 lần chuyển khoản.
                    </div>
                  </div>
                )}

                {(() => {
                  const billingM = currentTuitionBill?.billingMonth || activeStudent?.currentBillingMonth || getCurrentBillingMonth();
                  const fallbackLessons = activeClass ? calculateMonthLessons(billingM, activeClass.schedules).lessonCount || 8 : 8;
                  const fallbackFee = activeClass?.feePerLesson || activeStudent?.feePerLesson || 200000;
                  const effLessons = currentTuitionBill?.lessonCount || fallbackLessons;
                  const effFee = currentTuitionBill?.feePerLesson || fallbackFee;
                  const effBreakdown = computeStudentTuitionBreakdown({
                    lessonCount: effLessons,
                    feePerLesson: effFee,
                    discountPercent: currentTuitionBill?.discountPercent ?? activeStudent?.discountPercent,
                    surcharge: currentTuitionBill?.surcharge || 0,
                  });
                  const finalAmt = currentTuitionBill ? currentTuitionBill.finalAmount : effBreakdown.finalAmount;

                  return (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Số buổi học trong tháng:</span>
                        <strong className="text-indigo-900 font-mono font-bold">
                          {effLessons} buổi
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Đơn giá 1 buổi học:</span>
                        <strong className="text-slate-800 font-mono">
                          {effFee.toLocaleString("vi-VN")} đ/buổi
                        </strong>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                        <span className="text-slate-600 font-semibold">Công thức tính học phí:</span>
                        <span className="font-mono text-slate-700">
                          {effLessons} buổi × {effFee.toLocaleString("vi-VN")} đ
                        </span>
                      </div>
                      {/* Khoản Phụ thu (+) nếu có */}
                      {((currentTuitionBill?.surcharge && currentTuitionBill.surcharge > 0) || ((currentTuitionBill?.adjustmentAmount || 0) > 0 && !currentTuitionBill?.surcharge)) && (
                        <div className="flex items-center justify-between pt-1 border-t border-emerald-200 text-emerald-900 text-xs">
                          <span>+ Phụ thu ({currentTuitionBill?.surchargeNote || currentTuitionBill?.notes || "Khoản phát sinh"}):</span>
                          <strong className="font-mono text-emerald-700">
                            +{(currentTuitionBill?.surcharge || currentTuitionBill?.adjustmentAmount || 0).toLocaleString("vi-VN")} đ
                          </strong>
                        </div>
                      )}
                      {/* Khoản Giảm trừ (-) nếu có */}
                      {((currentTuitionBill?.discount && currentTuitionBill.discount > 0) || (!currentTuitionBill && effBreakdown.discount > 0) || ((currentTuitionBill?.adjustmentAmount || 0) < 0 && !currentTuitionBill?.discount)) && (
                        <div className="flex items-center justify-between pt-1 border-t border-rose-200 text-rose-900 text-xs">
                          <span>- Giảm trừ ({currentTuitionBill?.discountNote || activeStudent?.fixedDiscountNote || `Giảm ${effBreakdown.discountPercent}%/buổi`}):</span>
                          <strong className="font-mono text-rose-700">
                            -{(currentTuitionBill?.discount ?? (currentTuitionBill ? Math.abs(currentTuitionBill.adjustmentAmount || 0) : effBreakdown.discount)).toLocaleString("vi-VN")} đ
                          </strong>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-300 font-bold">
                        <span className="text-slate-900">Tổng học phí kỳ này:</span>
                        <strong className="font-mono text-emerald-800 text-sm">
                          {finalAmt.toLocaleString("vi-VN")} đ
                        </strong>
                      </div>
                    </div>
                  );
                })()}

                <div className="text-xs text-slate-600 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span>Kỳ thu học phí:</span>
                    <strong className="text-slate-800">Ngày 01 - 10 hàng tháng</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Học bù:</span>
                    <span className="text-emerald-700 font-medium">Bảo lưu bài giảng và sắp xếp học bù khi vắng</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  const billingM = currentTuitionBill?.billingMonth || activeStudent?.currentBillingMonth || getCurrentBillingMonth();
                  const fallbackLessons = activeClass ? calculateMonthLessons(billingM, activeClass.schedules).lessonCount || 8 : 8;
                  const fallbackFee = activeClass?.feePerLesson || activeStudent?.feePerLesson || 200000;
                  const amt = currentTuitionBill
                    ? currentTuitionBill.finalAmount
                    : computeStudentTuitionBreakdown({
                        lessonCount: fallbackLessons,
                        feePerLesson: fallbackFee,
                        discountPercent: activeStudent?.discountPercent,
                      }).finalAmount;
                  setSelectedPackage({
                    monthLabel: debtSummary && debtSummary.isMultiMonthDebt ? "CONSOLIDATED_DEBT" : billingM,
                    amount: debtSummary && debtSummary.isMultiMonthDebt ? debtSummary.totalDebtAmount : amt,
                    label: debtSummary && debtSummary.isMultiMonthDebt ? `Gộp ${debtSummary.debtMonthsCount} Tháng Nợ` : `Học Phí ${billingM}`,
                    sub: `${(debtSummary && debtSummary.isMultiMonthDebt ? debtSummary.totalDebtAmount : amt).toLocaleString("vi-VN")} đ`,
                  });
                  setIsQrModalOpen(true);
                }}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center justify-center gap-2"
              >
                <QrCode className="w-4 h-4" />
                <span>Quét Mã VietQR Đóng Học Phí</span>
              </button>
            </div>
          </div>

          {/* Lịch sử giao dịch nạp tiền */}
          {studentPayments.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
              <h5 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Lịch Sử Đóng Học Phí Của Bé
              </h5>

              <div className="space-y-2">
                {studentPayments.map((pay) => (
                  <div key={pay.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">
                        {pay.billingMonth || "Học phí theo tháng"} ({pay.amountPaid.toLocaleString("vi-VN")} đ)
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Mã GD: {pay.transactionCode} • Thời gian: {new Date(pay.paidAt).toLocaleString("vi-VN")}
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      ✓ Đã Hoàn Tất
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: QUÉT MÃ VIETQR NẠP HỌC PHÍ */}
      {/* ============================================================== */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
                  <QrCode className="w-5 h-5 text-amber-500" />
                  Nạp Học Phí Qua VietQR 24/7
                </h4>
                <p className="text-xs text-slate-500">
                  Học sinh: <strong className="text-slate-800">{activeStudent?.fullName}</strong> ({activeClass?.name})
                </p>
              </div>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Chọn kỳ đóng học phí */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Chọn kỳ đóng học phí:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(() => {
                  const billingM = currentTuitionBill?.billingMonth || activeStudent?.currentBillingMonth || getCurrentBillingMonth();
                  const monthOpts = getBillingMonthOptions();
                  const nextM = monthOpts[1]?.value || billingM;
                  const fallbackLessons = activeClass ? calculateMonthLessons(billingM, activeClass.schedules).lessonCount || 8 : 8;
                  const fallbackFee = activeClass?.feePerLesson || activeStudent?.feePerLesson || 200000;
                  const baseAmt = currentTuitionBill
                    ? currentTuitionBill.finalAmount
                    : computeStudentTuitionBreakdown({
                        lessonCount: fallbackLessons,
                        feePerLesson: fallbackFee,
                        discountPercent: activeStudent?.discountPercent,
                      }).finalAmount;
                  const nextLessons = activeClass ? calculateMonthLessons(nextM, activeClass.schedules).lessonCount || 8 : 8;
                  const nextAmt = computeStudentTuitionBreakdown({
                    lessonCount: nextLessons,
                    feePerLesson: currentTuitionBill?.feePerLesson || fallbackFee,
                    discountPercent: activeStudent?.discountPercent,
                  }).finalAmount;

                  const packages = [
                    ...(debtSummary && debtSummary.isMultiMonthDebt ? [{
                      monthLabel: "CONSOLIDATED_DEBT",
                      amount: debtSummary.totalDebtAmount,
                      label: `🌟 Gộp ${debtSummary.debtMonthsCount} Tháng Nợ`,
                      sub: `${formatVND(debtSummary.totalDebtAmount)}`,
                      highlight: true,
                    }] : []),
                    { 
                      monthLabel: billingM, 
                      amount: baseAmt, 
                      label: billingM, 
                      sub: `${baseAmt.toLocaleString("vi-VN")} đ` 
                    },
                    { 
                      monthLabel: nextM, 
                      amount: nextAmt, 
                      label: nextM, 
                      sub: `${nextAmt.toLocaleString("vi-VN")} đ` 
                    },
                    { 
                      monthLabel: `Quý (3 Tháng từ ${billingM})`, 
                      amount: Math.round(baseAmt * 3 * 0.95), 
                      label: "Đóng 3 Tháng", 
                      sub: `${Math.round(baseAmt * 3 * 0.95).toLocaleString("vi-VN")} đ (-5%)` 
                    },
                  ];
                  return packages.map((pkg) => (
                  <button
                    key={pkg.monthLabel}
                    type="button"
                    onClick={() => setSelectedPackage(pkg)}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      selectedPackage.monthLabel === pkg.monthLabel
                        ? "bg-amber-500 text-slate-950 border-amber-500 font-bold shadow-xs"
                        : pkg.monthLabel === "CONSOLIDATED_DEBT"
                        ? "bg-purple-50 text-purple-950 border-purple-300 hover:bg-purple-100 font-bold"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="text-xs font-bold">{pkg.label}</div>
                    <div className="text-[10px] mt-0.5 opacity-90 font-mono">{pkg.sub}</div>
                  </button>
                  ));
                })()}
              </div>
            </div>

            {/* Khung mã QR VietQR */}
            <div className="p-4 bg-gradient-to-b from-amber-50/60 to-white rounded-2xl border border-amber-200 text-center space-y-3">
              <div className="w-48 h-48 mx-auto bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                <img
                  src={`https://img.vietqr.io/image/${CENTER_BANK_CONFIG.bankBinOrCode}-${CENTER_BANK_CONFIG.accountNumber}-compact.png?amount=${selectedPackage.amount}&addInfo=${encodeURIComponent(`HP ${selectedPackage.monthLabel.replace(/\s+/g, "").toUpperCase()} ${activeStudent?.studentCode || ""}`)}&accountName=${encodeURIComponent(CENTER_BANK_CONFIG.accountHolder)}`}
                  alt="VietQR Code"
                  className="w-40 h-40 object-contain rounded-lg"
                />
              </div>

              <div className="text-xs space-y-1 text-slate-700 font-medium">
                <div>Ngân hàng: <strong className="text-slate-900">{CENTER_BANK_CONFIG.bankName}</strong></div>
                <div>Số tài khoản: <strong className="font-mono text-amber-700 text-sm">{CENTER_BANK_CONFIG.accountDisplay}</strong></div>
                <div>Chủ tài khoản: <strong className="text-slate-900">{CENTER_BANK_CONFIG.accountHolder}</strong></div>
                <div>Số tiền: <strong className="font-mono text-emerald-700 text-sm">{selectedPackage.amount.toLocaleString("vi-VN")} đ</strong></div>
                <div>Cú pháp: <strong className="font-mono bg-slate-100 px-2 py-0.5 rounded text-amber-800">HP {selectedPackage.monthLabel.replace(/\s+/g, "").toUpperCase()} {(activeStudent?.fullName || "").replace(/\s+/g, "")} {activeStudent?.studentCode || ""}</strong></div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                className="flex-2 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl text-xs shadow-xs hover:opacity-95 transition flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Tôi Đã Chuyển Khoản Thành Công</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: NỘP BÀI TẬP VỀ NHÀ TRỰC TUYẾN (MICROSOFT TEAMS STYLE) */}
      {/* ============================================================== */}
      {isHomeworkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
                  <Video className="w-5 h-5 text-blue-600" />
                  Nộp Bài Tập Về Nhà Cho Con
                </h4>
                <p className="text-xs text-slate-500">
                  Học sinh: <strong className="text-slate-800">{activeStudent?.fullName}</strong> ({activeClass?.name})
                </p>
              </div>
              <button
                onClick={() => {
                  setIsHomeworkModalOpen(false);
                  setSelectedAssignmentForSubmission(null);
                }}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Locked Assignment Session Header (Tránh nộp nhầm buổi) */}
            {selectedAssignmentForSubmission ? (
              <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-200 rounded-2xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-blue-800 tracking-wider">
                    Khóa nộp bài cho buổi học:
                  </span>
                  <span className="text-[10px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded-full border border-blue-200">
                    MS Teams Format
                  </span>
                </div>
                <div className="font-extrabold text-blue-950 text-sm">
                  {selectedAssignmentForSubmission.sessionTitle}
                </div>
                <div className="text-slate-800 font-semibold">
                  {selectedAssignmentForSubmission.title}
                </div>
                <div className="text-[11px] text-rose-700 font-semibold flex items-center gap-1 pt-0.5">
                  <Clock className="w-3 h-3 text-rose-600" /> Hạn nộp: {selectedAssignmentForSubmission.dueDateTime}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
                <span className="text-slate-500">Buổi học:</span>
                <div className="font-bold text-slate-900">{currentClassLog?.lessonTopic || `Lớp ${activeClass?.name}`}</div>
              </div>
            )}

            <form onSubmit={handleSendHomework} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Hình thức bài nộp:
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: "BOTH", icon: Sparkles, label: "🌟 Cả Hai" },
                    { id: "VIDEO", icon: Video, label: "📹 Video" },
                    { id: "AUDIO", icon: Mic, label: "🎙️ Audio" },
                    { id: "WORKBOOK", icon: Camera, label: "📸 Sách" },
                  ].map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setHomeworkType(type.id as "VIDEO" | "AUDIO" | "WORKBOOK" | "BOTH")}
                        className={`p-2 rounded-xl border text-center transition font-semibold flex items-center justify-center gap-1 text-[11px] ${
                          homeworkType === type.id
                            ? type.id === "BOTH"
                              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold border-amber-500 shadow-xs"
                              : "bg-blue-600 text-white border-blue-600 shadow-xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hidden Native File Inputs */}
              <input
                type="file"
                ref={mainFileInputRef}
                onChange={handleMainFileChange}
                accept="video/*,audio/*,.mp4,.mov,.avi,.webm,.mp3,.m4a,.wav"
                className="hidden"
              />
              <input
                type="file"
                ref={workbookFileInputRef}
                onChange={handleWorkbookFileChange}
                accept="image/*,application/pdf,.doc,.docx,.jpg,.jpeg,.png,.heic,.pdf"
                className="hidden"
              />

              {homeworkType === "BOTH" ? (
                <div className="space-y-3 p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200">
                  <div className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Bài tập yêu cầu cả Video phát âm & Bài làm trong Sách:</span>
                  </div>

                  {/* Phần 1: Tệp Video/Audio của con */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 text-[11px] flex items-center justify-between">
                      <span>1. Đính kèm tệp Video phát âm của con:</span>
                      <span className="text-[10px] text-amber-800 font-normal">Hỗ trợ .mp4, .mov, .m4a</span>
                    </label>
                    {attachedFile ? (
                      <div className="p-2.5 bg-white rounded-xl border border-amber-300 flex items-center justify-between gap-2 shadow-2xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center justify-center shrink-0 text-xs">
                            📹
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate text-xs">{attachedFile.name}</div>
                            <div className="text-[10px] text-slate-500">{attachedFile.size} • Đã đính kèm từ thiết bị</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => mainFileInputRef.current?.click()}
                            className="px-2 py-1 text-[10.5px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200"
                          >
                            Đổi tệp
                          </button>
                          <button
                            type="button"
                            onClick={() => setAttachedFile(null)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => mainFileInputRef.current?.click()}
                        className="w-full py-2.5 px-3 border-2 border-dashed border-amber-300 hover:border-amber-500 bg-white hover:bg-amber-50/50 rounded-xl text-center transition flex items-center justify-center gap-2 text-xs font-bold text-amber-900"
                      >
                        <Upload className="w-4 h-4 text-amber-600" />
                        <span>Chọn tệp Video clip từ máy tính / điện thoại</span>
                      </button>
                    )}
                  </div>

                  {/* Phần 2: Ảnh / Tệp Sách bài tập Workbook */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 text-[11px] flex items-center justify-between">
                      <span>2. Đính kèm ảnh bài làm Sách Workbook / Vở:</span>
                      <span className="text-[10px] text-amber-800 font-normal">Hỗ trợ .jpg, .png, .pdf</span>
                    </label>
                    {attachedWorkbookFile ? (
                      <div className="p-2.5 bg-white rounded-xl border border-indigo-300 flex items-center justify-between gap-2 shadow-2xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                            📸
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate text-xs">{attachedWorkbookFile.name}</div>
                            <div className="text-[10px] text-slate-500">{attachedWorkbookFile.size} • Đã đính kèm từ thiết bị</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => workbookFileInputRef.current?.click()}
                            className="px-2 py-1 text-[10.5px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200"
                          >
                            Đổi tệp
                          </button>
                          <button
                            type="button"
                            onClick={() => setAttachedWorkbookFile(null)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => workbookFileInputRef.current?.click()}
                        className="w-full py-2.5 px-3 border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-white hover:bg-indigo-50/50 rounded-xl text-center transition flex items-center justify-center gap-2 text-xs font-bold text-indigo-900"
                      >
                        <Camera className="w-4 h-4 text-indigo-600" />
                        <span>Chọn ảnh chụp trang bài tập / PDF từ thiết bị</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* ĐƠN LẺ: VIDEO HOẶC AUDIO HOẶC WORKBOOK */
                <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <label className="font-bold text-slate-700 block text-xs flex items-center justify-between">
                    <span>Đính kèm tệp bài làm ({homeworkType === "VIDEO" ? "Video clip" : homeworkType === "AUDIO" ? "Ghi âm" : "Ảnh/File bài tập"}):</span>
                    <span className="text-[10px] text-slate-500 font-normal">Từ máy tính hoặc điện thoại</span>
                  </label>

                  {attachedFile ? (
                    <div className="p-2.5 bg-white rounded-xl border border-blue-300 flex items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                          {homeworkType === "VIDEO" ? "📹" : homeworkType === "AUDIO" ? "🎙️" : "📄"}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate text-xs">{attachedFile.name}</div>
                          <div className="text-[10px] text-slate-500">{attachedFile.size} • Đã đính kèm từ thiết bị</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => mainFileInputRef.current?.click()}
                          className="px-2 py-1 text-[10.5px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200"
                        >
                          Đổi tệp
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttachedFile(null)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => mainFileInputRef.current?.click()}
                      className="w-full py-3 px-3 border-2 border-dashed border-blue-300 hover:border-blue-500 bg-white hover:bg-blue-50/50 rounded-xl text-center transition flex items-center justify-center gap-2 text-xs font-bold text-blue-900 shadow-2xs"
                    >
                      <Upload className="w-4 h-4 text-blue-600" />
                      <span>Chọn tệp bài làm từ máy tính hoặc điện thoại</span>
                    </button>
                  )}
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Lời nhắn của con / phụ huynh gửi cô giáo & trợ giảng:
                </label>
                <textarea
                  rows={3}
                  value={studentComment}
                  onChange={(e) => setStudentComment(e.target.value)}
                  placeholder="Ví dụ: Con đã luyện đọc từ vựng 3 lần và quay video gửi cô. Con chúc cô buổi tối vui vẻ!"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-[11px] text-blue-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Bài nộp sẽ được chuyển trực tiếp tới Thầy Trợ Giảng ({classAssistant.fullName}) để nghe và chấm điểm sửa âm.</span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsHomeworkModalOpen(false);
                    setSelectedAssignmentForSubmission(null);
                  }}
                  className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isUploadingHomework}
                  className="flex-2 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl text-xs shadow-xs hover:opacity-95 disabled:opacity-60 transition flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {isUploadingHomework
                      ? uploadProgress !== null
                        ? `Đang tải lên Cloud (${uploadProgress}%)...`
                        : "Đang tải tệp bài tập lên..."
                      : "Gửi Bài Tập Cho Thầy Cô"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL XEM LẠI BÀI ĐÃ NỘP CHO PHỤ HUYNH (VIDEO/AUDIO/ẢNH/PDF) */}
      {/* ============================================================== */}
      {activeViewingSubmission && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[92dvh] overflow-y-auto p-4 sm:p-5 space-y-3.5">
            <div className="flex items-start justify-between pb-2.5 border-b border-slate-100">
              <div className="min-w-0">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                  Bài Tập Đã Nộp • {activeStudent?.fullName}
                </span>
                <h4 className="font-bold text-base text-slate-900 mt-1 break-words">
                  {activeViewingSubmission.assignmentTitle}
                </h4>
                <p className="text-xs text-slate-500 break-all">
                  {activeViewingSubmission.sessionTitle} • Nộp lúc{" "}
                  {new Date(activeViewingSubmission.submittedAt).toLocaleString("vi-VN")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingSubmissionId(null)}
                className="text-slate-400 hover:text-slate-600 p-1 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <input
              type="file"
              ref={reuploadFileInputRef}
              onChange={(e) => void handleReuploadSubmissionFile(e)}
              accept="video/*,audio/*,image/*,application/pdf,.mp4,.mov,.avi,.webm,.mp3,.m4a,.wav,.jpg,.jpeg,.png,.pdf"
              className="hidden"
            />

            {/* Media Player */}
            <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">
                      {activeViewingSubmission.attachmentFileName || activeViewingSubmission.mediaTitle}
                    </div>
                    {activeViewingSubmission.attachmentFileSize && (
                      <div className="text-[10px] text-blue-200 font-mono">
                        {activeViewingSubmission.attachmentFileSize}
                      </div>
                    )}
                  </div>
                </div>
                {resolvedSubMediaUrl && (
                  <button
                    type="button"
                    onClick={async () => {
                      setSubDownloadProgress(0);
                      try {
                        await downloadHomeworkMedia(
                          resolvedSubMediaUrl,
                          activeViewingSubmission.attachmentFileName || activeViewingSubmission.mediaTitle || "btvn",
                          (pct) => setSubDownloadProgress(pct)
                        );
                      } finally {
                        setSubDownloadProgress(null);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10.5px] font-bold flex items-center gap-1 shrink-0 border border-slate-700 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    {subDownloadProgress !== null ? `Đang tải (${subDownloadProgress}%)` : "Tải tệp"}
                  </button>
                )}
              </div>

              {isLoadingSubMedia ? (
                <div className="py-6 text-center text-xs text-slate-300 bg-slate-950/60 rounded-xl">
                  Đang tải video / tệp đính kèm...
                </div>
              ) : resolvedSubMediaUrl ? (
                (() => {
                  const fileNameLower = (
                    activeViewingSubmission.attachmentFileName ||
                    activeViewingSubmission.mediaTitle ||
                    ""
                  ).toLowerCase();
                  const mime = (activeViewingSubmission.mediaMimeType || "").toLowerCase();
                  const isAudio = mime.startsWith("audio/") || /\.(mp3|m4a|wav|ogg|aac)$/i.test(fileNameLower);
                  const isImage = mime.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(fileNameLower);
                  const isPdf = mime === "application/pdf" || /\.pdf$/i.test(fileNameLower);

                  if (isAudio) {
                    return <audio controls className="w-full" src={resolvedSubMediaUrl} />;
                  }
                  if (isImage) {
                    return (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolvedSubMediaUrl}
                        alt={activeViewingSubmission.mediaTitle}
                        className="w-full max-h-72 object-contain rounded-xl bg-black"
                      />
                    );
                  }
                  if (isPdf) {
                    return (
                      <iframe
                        src={resolvedSubMediaUrl}
                        title={activeViewingSubmission.mediaTitle}
                        className="w-full h-72 rounded-xl bg-white"
                      />
                    );
                  }
                  return (
                    <div className="space-y-2">
                      <video
                        key={resolvedSubMediaUrl}
                        controls
                        playsInline
                        preload="metadata"
                        src={resolvedSubMediaUrl}
                        onError={() => setSubVideoPlayError(true)}
                        className="w-full max-h-72 rounded-xl bg-black"
                      />
                      {subVideoPlayError && (
                        <div className="p-2.5 bg-amber-950/60 border border-amber-500/40 rounded-lg text-[11px] text-amber-200 flex items-center justify-between gap-2">
                          <span>Định dạng chưa phát trực tiếp được. Vui lòng tải tệp về để xem.</span>
                          <button
                            type="button"
                            onClick={() =>
                              void downloadHomeworkMedia(
                                resolvedSubMediaUrl,
                                activeViewingSubmission.attachmentFileName || activeViewingSubmission.mediaTitle || "video"
                              )
                            }
                            className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-bold shrink-0 cursor-pointer"
                          >
                            Tải về
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-[11px] text-amber-300 space-y-2">
                  <div>
                    Tệp của lần nộp này chưa có trên Cloud DB (đã nộp trước khi nâng cấp đồng bộ Cloud). Phụ huynh có thể chọn lại tệp để tải lên ngay tại đây.
                  </div>
                </div>
              )}
            </div>

            {resolvedSubWbUrl && resolvedSubWbUrl !== resolvedSubMediaUrl && (
              <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-indigo-950 truncate">
                    📸 {activeViewingSubmission.workbookImageFileName || "Ảnh Workbook"}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      void downloadHomeworkMedia(
                        resolvedSubWbUrl,
                        activeViewingSubmission.workbookImageFileName || "workbook"
                      )
                    }
                    className="px-2 py-1 rounded-lg bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10.5px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Download className="w-3 h-3" /> Tải về
                  </button>
                </div>
                {((activeViewingSubmission.workbookMimeType || "").startsWith("image/") ||
                  /\.(jpg|jpeg|png|gif|webp)$/i.test(activeViewingSubmission.workbookImageFileName || "")) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolvedSubWbUrl}
                    alt={activeViewingSubmission.workbookImageFileName || "Workbook"}
                    className="w-full max-h-60 object-contain rounded-lg bg-white border border-indigo-200"
                  />
                )}
              </div>
            )}

            {activeViewingSubmission.status === "GRADED" && activeViewingSubmission.taFeedback && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
                <div className="font-bold text-emerald-900">
                  Nhận xét từ {activeViewingSubmission.gradedBy || classAssistant.fullName}:
                </div>
                <p className="text-slate-800 italic whitespace-pre-line">
                  &ldquo;{activeViewingSubmission.taFeedback}&rdquo;
                </p>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={reuploadProgress !== null}
                onClick={() => reuploadFileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Upload className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  {reuploadProgress !== null
                    ? `Đang tải lên (${reuploadProgress}%)...`
                    : resolvedSubMediaUrl
                    ? "Cập Nhật / Đổi Tệp"
                    : "Tải Lên Video / Tệp"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setViewingSubmissionId(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
