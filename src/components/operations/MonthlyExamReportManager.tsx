"use client";

import { useState, useMemo } from "react";
import { useCenter } from "@/context/CenterContext";
import { 
  MonthlyExamReport, 
  buildClassThemeMap, 
  CLASS_THEMES 
} from "@/data/centerData";
import { 
  FileCheck2, 
  Upload, 
  FileText, 
  Send, 
  Calendar, 
  Award, 
  CheckCircle2, 
  Eye, 
  Download, 
  Sparkles, 
  GraduationCap, 
  Save, 
  Search,
  BookOpen,
  MessageSquare,
  Clock
} from "lucide-react";
import EditZaloMessageModal from "@/components/common/EditZaloMessageModal";
import ZaloBatchQueueModal, { ZaloQueueItem } from "@/components/common/ZaloBatchQueueModal";
import { generateMonthlyExamReportZaloMessage } from "@/utils/zaloHelper";

export interface MonthlyExamReportManagerProps {
  currentStaffId?: string; // id của GV ("staff-t1" - Cô Sarah Johnson)
  userRole?: "TEACHER" | "ADMIN";
}

export default function MonthlyExamReportManager({
  currentStaffId = "staff-t1",
  userRole = "TEACHER",
}: MonthlyExamReportManagerProps) {
  const { 
    classes, 
    students, 
    staff, 
    monthlyExamReports, 
    saveMonthlyExamReport,
    sendZaloMessageToParent
  } = useCenter();

  const themeMap = useMemo(() => buildClassThemeMap(classes), [classes]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("Tháng 10/2026");
  const [examTitle, setExamTitle] = useState<string>("Bài Kiểm Tra Định Kỳ Tháng 10 - Cambridge Flyers Mock Test 01");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // State cho Zalo Modal cá nhân
  const [editZaloModal, setEditZaloModal] = useState<{
    isOpen: boolean;
    studentName: string;
    parentName: string;
    parentPhone: string;
    className: string;
    title: string;
    initialContent: string;
    templateBadge: string;
  }>({
    isOpen: false,
    studentName: "",
    parentName: "",
    parentPhone: "",
    className: "",
    title: "",
    initialContent: "",
    templateBadge: "Báo Cáo Điểm Thi Tháng",
  });

  // State cho Zalo Hàng Đợi Toàn Lớp
  const [isZaloQueueOpen, setIsZaloQueueOpen] = useState(false);
  const [zaloQueueItems, setZaloQueueItems] = useState<ZaloQueueItem[]>([]);

  // Active student being edited in drawer
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  // Form states for the selected student
  const [listeningScore, setListeningScore] = useState<number>(9.0);
  const [speakingScore, setSpeakingScore] = useState<number>(9.5);
  const [readingWritingScore, setReadingWritingScore] = useState<number>(8.5);
  const [pdfFileName, setPdfFileName] = useState<string>("Bai_Thi_Dinh_Ky.pdf");
  const [pdfFileSize, setPdfFileSize] = useState<string>("2.1 MB");
  const [teacherFeedback, setTeacherFeedback] = useState<string>("");
  const [strengths, setStrengths] = useState<string>("");
  const [areasForImprovement, setAreasForImprovement] = useState<string>("");

  const activeStaff = useMemo(() => {
    return staff.find((s) => s.id === currentStaffId) || staff.find((s) => s.role === "TEACHER") || staff[0] || { id: "", fullName: "Giáo viên", role: "TEACHER" };
  }, [staff, currentStaffId]);

  const relevantClasses = useMemo(() => {
    if (userRole === "ADMIN") return classes;
    if (!activeStaff.id) return classes;
    return classes.filter((cls) => cls.teacherId === activeStaff.id || cls.schedules.some((s) => s.teacherId === activeStaff.id));
  }, [classes, userRole, activeStaff]);

  const currentClass = useMemo(() => {
    if (selectedClassId) {
      return classes.find((c) => c.id === selectedClassId) || relevantClasses[0] || classes[0];
    }
    return relevantClasses[0] || classes[0];
  }, [classes, selectedClassId, relevantClasses]);

  const classStudents = useMemo(() => {
    if (!currentClass) return [];
    return students.filter((s) => s.classId === currentClass.id);
  }, [students, currentClass]);

  // Existing reports for this class & month
  const classReports = useMemo(() => {
    if (!currentClass) return [];
    return monthlyExamReports.filter(
      (r) => r.classId === currentClass.id && r.monthStr === selectedMonth
    );
  }, [monthlyExamReports, currentClass, selectedMonth]);

  const activeStudent = useMemo(() => {
    return classStudents.find((s) => s.id === editingStudentId);
  }, [classStudents, editingStudentId]);

  // Open edit drawer
  const handleOpenEdit = (studentId: string) => {
    const student = classStudents.find((s) => s.id === studentId);
    if (!student) return;

    setEditingStudentId(studentId);
    const existing = classReports.find((r) => r.studentId === studentId);

    if (existing) {
      setListeningScore(existing.listeningScore);
      setSpeakingScore(existing.speakingScore);
      setReadingWritingScore(existing.readingWritingScore);
      setPdfFileName(existing.pdfFileName);
      setPdfFileSize(existing.pdfFileSize);
      setTeacherFeedback(existing.teacherFeedback);
      setStrengths(existing.strengths);
      setAreasForImprovement(existing.areasForImprovement);
    } else {
      setListeningScore(8.5);
      setSpeakingScore(9.0);
      setReadingWritingScore(8.0);
      setPdfFileName(`Bai_Kiem_Tra_${selectedMonth.replace(/\s+/g, "_")}_${student.fullName.replace(/\s+/g, "_")}.pdf`);
      setPdfFileSize("2.3 MB");
      setTeacherFeedback(`Con có kết quả thi ${selectedMonth} rất tốt, phản xạ nhanh và tích cực tương tác. Ngữ pháp câu cơ bản nắm chắc.`);
      setStrengths("Phát âm chuẩn, nhớ từ vựng nhanh, tự tin giao tiếp với giáo viên bản ngữ.");
      setAreasForImprovement("Cần rèn luyện tính cẩn thận ở phần điền từ để tránh nhầm lẫn chính tả.");
    }
  };

  // Mock File Upload
  const handleSimulateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfFileName(file.name);
      setPdfFileSize(`${(file.size / (1024 * 1024)).toFixed(1)} MB`);
      setToastMessage(`Đã đính kèm file PDF bài thi: ${file.name}`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Save / Publish Report
  const handleSaveReport = (isPublish: boolean) => {
    if (!currentClass || !activeStudent) return;

    const total = parseFloat(((listeningScore + speakingScore + readingWritingScore) / 3).toFixed(1));
    const existing = classReports.find((r) => r.studentId === activeStudent.id);

    saveMonthlyExamReport({
      id: existing?.id,
      classId: currentClass.id,
      className: currentClass.name,
      studentId: activeStudent.id,
      studentName: activeStudent.fullName,
      monthStr: selectedMonth,
      examTitle,
      listeningScore,
      speakingScore,
      readingWritingScore,
      totalScore: total,
      maxScore: 10,
      pdfFileName,
      pdfFileSize,
      pdfFileUrl: `/mock_exams/${pdfFileName}`,
      teacherFeedback,
      strengths,
      areasForImprovement,
      teacherName: activeStaff.fullName,
      status: isPublish ? "SENT_TO_PARENT" : "DRAFT",
    });

    setToastMessage(
      isPublish
        ? `🚀 Đã phát hành báo cáo bài thi kèm file PDF tới Phụ huynh của bé ${activeStudent.fullName}!`
        : `💾 Đã lưu bản nháp báo cáo bài thi cho bé ${activeStudent.fullName}!`
    );

    // Nếu chọn Gửi PH, tự động mở modal Zalo để GV xem trước và bấm gửi qua Zalo
    if (isPublish) {
      const studentToReport = activeStudent;
      const remarksText = `${teacherFeedback || "Con hoàn thành tốt bài thi tháng!"}. (Nghe: ${listeningScore}, Nói: ${speakingScore}, Đọc/Viết: ${readingWritingScore})`;
      const msg = generateMonthlyExamReportZaloMessage(
        studentToReport.fullName,
        studentToReport.parentName,
        activeStaff.fullName,
        currentClass.name,
        selectedMonth,
        total,
        remarksText,
        `https://msdungshiny.edu.vn/mock_exams/${pdfFileName}`
      );

      setEditZaloModal({
        isOpen: true,
        studentName: studentToReport.fullName,
        parentName: studentToReport.parentName,
        parentPhone: studentToReport.parentPhone,
        className: currentClass.name,
        title: `Báo Cáo Điểm Thi Zalo: ${studentToReport.fullName} (${total}/10đ)`,
        initialContent: msg,
        templateBadge: "Điểm Thi Định Kỳ",
      });
    }

    setEditingStudentId(null);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Mở modal gửi Zalo báo điểm thi cho 1 học sinh từ danh sách
  const handleOpenZaloExamModal = (studentId: string) => {
    const student = classStudents.find((s) => s.id === studentId);
    if (!student || !currentClass) return;
    const report = classReports.find((r) => r.studentId === studentId);

    const total = report ? report.totalScore : 8.5;
    const lScore = report ? report.listeningScore : 8.5;
    const sScore = report ? report.speakingScore : 9.0;
    const rwScore = report ? report.readingWritingScore : 8.0;
    const pdfName = report ? report.pdfFileName : `Bai_Thi_${selectedMonth.replace(/\s+/g, "_")}_${student.fullName.replace(/\s+/g, "_")}.pdf`;
    const fb = report?.teacherFeedback || "Con có kết quả học tập rất tích cực trong tháng vừa qua!";
    const remarksText = `${fb}. (Nghe: ${lScore}, Nói: ${sScore}, Đọc/Viết: ${rwScore})`;

    const msg = generateMonthlyExamReportZaloMessage(
      student.fullName,
      student.parentName,
      activeStaff.fullName,
      currentClass.name,
      selectedMonth,
      total,
      remarksText,
      `https://msdungshiny.edu.vn/mock_exams/${pdfName}`
    );

    setEditZaloModal({
      isOpen: true,
      studentName: student.fullName,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      className: currentClass.name,
      title: `Báo Cáo Điểm Thi Zalo: ${student.fullName} (${total}/10đ)`,
      initialContent: msg,
      templateBadge: "Điểm Thi Định Kỳ",
    });
  };

  // Xác nhận gửi Zalo 1-chạm cá nhân
  const handleConfirmSendZalo = async (finalMessage: string) => {
    if (!editZaloModal.parentPhone) {
      setToastMessage("⚠️ Học sinh này chưa có số điện thoại phụ huynh!");
      return;
    }
    const res = await sendZaloMessageToParent({
      recipientPhone: editZaloModal.parentPhone,
      recipientName: editZaloModal.parentName,
      studentName: editZaloModal.studentName,
      className: editZaloModal.className,
      messageType: "EXAM_REPORT",
      title: editZaloModal.title,
      content: finalMessage,
      senderRole: "TEACHER",
      senderName: activeStaff.fullName,
      openChatWindow: false,
    });
    if (res.success) {
      setToastMessage(`✓ Đã gửi tin nhắn Zalo báo cáo điểm thi tháng tới PH bé ${editZaloModal.studentName}!`);
    } else {
      setToastMessage(`⚠️ Không thể gửi Zalo: ${res.message}`);
    }
    setEditZaloModal((prev) => ({ ...prev, isOpen: false }));
  };

  // Bật hàng đợi Zalo gửi toàn bộ lớp (giãn cách 2-3 phút chống spam)
  const handleSendZaloEntireClass = () => {
    if (!currentClass) return;
    const queue: ZaloQueueItem[] = [];

    for (const st of classStudents) {
      if (!st.parentPhone) continue;
      const report = classReports.find((r) => r.studentId === st.id);
      const total = report ? report.totalScore : 8.5;
      const lScore = report ? report.listeningScore : 8.5;
      const sScore = report ? report.speakingScore : 9.0;
      const rwScore = report ? report.readingWritingScore : 8.0;
      const pdfName = report ? report.pdfFileName : `Bai_Thi_${selectedMonth.replace(/\s+/g, "_")}_${st.fullName.replace(/\s+/g, "_")}.pdf`;
      const fb = report?.teacherFeedback || "Con nỗ lực hoàn thành tốt bài kiểm tra định kỳ!";
      const remarksText = `${fb}. (Nghe: ${lScore}, Nói: ${sScore}, Đọc/Viết: ${rwScore})`;

      const msg = generateMonthlyExamReportZaloMessage(
        st.fullName,
        st.parentName,
        activeStaff.fullName,
        currentClass.name,
        selectedMonth,
        total,
        remarksText,
        `https://msdungshiny.edu.vn/mock_exams/${pdfName}`
      );

      queue.push({
        id: `exam-${currentClass.id}-${st.id}-${Date.now()}`,
        studentId: st.id,
        studentName: st.fullName,
        parentName: st.parentName,
        parentPhone: st.parentPhone,
        className: currentClass.name,
        messageType: "EXAM_REPORT",
        title: `Điểm Thi Định Kỳ: ${st.fullName}`,
        content: msg,
        status: "PENDING",
      });
    }

    if (queue.length === 0) {
      setToastMessage("⚠️ Không tìm thấy phụ huynh có số điện thoại trong lớp này!");
      return;
    }

    setZaloQueueItems(queue);
    setIsZaloQueueOpen(true);
  };

  const classTheme = currentClass ? themeMap.get(currentClass.id) || CLASS_THEMES[0] : CLASS_THEMES[0];

  const filteredStudents = useMemo(() => {
    return classStudents.filter((st) =>
      st.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.studentCode.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [classStudents, searchQuery]);

  if (classes.length === 0 || !currentClass) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
        <FileCheck2 className="w-10 h-10 text-slate-300 mx-auto" />
        <h4 className="font-bold text-base text-slate-800">Chưa Có Dữ Liệu Lớp Học</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Hiện tại trung tâm chưa có lớp học nào được tạo. Vui lòng tạo lớp học tại mục Quản lý Lớp học để bắt đầu quản lý bài thi định kỳ.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {/* Top Header */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
              <FileCheck2 className="w-5 h-5 text-amber-600" />
              Báo Cáo Bài Thi Hàng Tháng & Upload PDF Bài Kiểm Tra (GV: {activeStaff.fullName})
            </h3>
          </div>

          {/* Month selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500">Kỳ thi:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 text-xs focus:outline-none"
            >
              <option value="Tháng 10/2026">Tháng 10/2026</option>
              <option value="Tháng 11/2026">Tháng 11/2026 (Sắp diễn ra)</option>
              <option value="Tháng 09/2026">Tháng 09/2026</option>
            </select>
          </div>
        </div>

        {/* Hàng chọn lớp */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
            Lớp giảng dạy:
          </span>
          {relevantClasses.map((cls) => {
            const isSelected = cls.id === currentClass?.id;
            const theme = themeMap.get(cls.id) || CLASS_THEMES[0];
            return (
              <button
                key={cls.id}
                type="button"
                onClick={() => setSelectedClassId(cls.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-left transition shrink-0 ${
                  isSelected
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-amber-400"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${theme.dot}`} />
                <span className="text-xs font-bold">{cls.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm space-y-3">
        {/* Title of exam */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tên bài thi định kỳ:
            </span>
            <input
              type="text"
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              className="w-full font-bold text-sm text-slate-900 bg-transparent border-b border-dashed border-slate-300 focus:border-amber-500 focus:outline-none pt-0.5"
            />
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <div className="text-xs text-slate-500">
              Tiến độ: <strong className="text-emerald-700 font-mono font-bold">{classReports.filter(r => r.status === "SENT_TO_PARENT").length}/{classStudents.length} HS</strong>
            </div>

            {/* Nút bật hàng đợi Zalo toàn lớp */}
            <button
              type="button"
              onClick={handleSendZaloEntireClass}
              className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-2xs transition flex items-center gap-1.5 active:scale-95"
              title="Gửi báo cáo điểm thi qua Zalo tự động cho toàn bộ phụ huynh trong lớp, giãn cách 2-3 phút chống spam"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Gửi Zalo Toàn Lớp</span>
              <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px] font-mono">
                {classStudents.length}
              </span>
            </button>
          </div>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl p-2.5 text-xs flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm học sinh để nhập điểm & upload bài thi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Student exam list */}
        <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
          {filteredStudents.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              Không có học sinh trong lớp.
            </div>
          ) : (
            filteredStudents.map((st, idx) => {
              const report = classReports.find((r) => r.studentId === st.id);
              const isSent = report?.status === "SENT_TO_PARENT";

              return (
                <div
                  key={st.id}
                  className={`p-3 space-y-2 transition ${
                    isSent ? "bg-emerald-50/20" : report ? "bg-amber-50/20" : "hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-slate-900 break-words leading-tight flex items-center gap-2">
                          <span>{st.fullName}</span>
                          {isSent ? (
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Đã Gửi PH
                            </span>
                          ) : report ? (
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                              Bản Nháp
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              Chưa nhập bài thi
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          Mã: {st.studentCode} • PH: {st.parentName}
                        </div>
                      </div>
                    </div>

                    {/* Score summary & action button */}
                    <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
                      {report && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono text-[11px] rounded-lg border border-slate-200">
                            Nghe: {report.listeningScore}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono text-[11px] rounded-lg border border-slate-200">
                            Nói: {report.speakingScore}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono text-[11px] rounded-lg border border-slate-200">
                            Đọc/Viết: {report.readingWritingScore}
                          </span>
                          <span className="px-2.5 py-1 bg-amber-500 text-slate-950 font-black font-mono text-xs rounded-lg shadow-2xs">
                            Tổng: {report.totalScore}/10
                          </span>
                        </div>
                      )}

                      {/* Nút gửi Zalo báo điểm thi */}
                      <button
                        type="button"
                        onClick={() => handleOpenZaloExamModal(st.id)}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95"
                        title="Xem trước & gửi thông báo điểm thi kèm link PDF qua Zalo cho PH"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Báo Zalo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(st.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95 ${
                          report
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300"
                            : "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs"
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{report ? "Sửa Báo Cáo & PDF" : "Nhập Điểm & File PDF"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Hiển thị tóm tắt PDF và nhận xét nếu có */}
                  {report && (
                    <div className="pt-1 text-xs space-y-1">
                      <div className="flex items-center gap-2 text-[11px] text-blue-700 font-medium">
                        <FileText className="w-3.5 h-3.5 text-rose-500" />
                        <span>File PDF bài thi: <strong>{report.pdfFileName}</strong> ({report.pdfFileSize})</span>
                      </div>
                      <p className="text-slate-600 italic text-[11px] bg-slate-50 p-2 rounded-xl border border-slate-200">
                        &ldquo;{report.teacherFeedback}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* DRAWER / MODAL: NHẬP ĐIỂM, UPLOAD PDF VÀ VIẾT NHẬN XÉT THÁNG */}
      {activeStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl p-4 sm:p-6 space-y-4 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                  {selectedMonth} • Báo Cáo Bài Thi Tháng
                </span>
                <h4 className="font-bold text-lg text-slate-900 mt-1">
                  {activeStudent.fullName} ({activeStudent.studentCode})
                </h4>
                <p className="text-xs text-slate-500">
                  Lớp: {currentClass?.name} • Giáo viên lập báo cáo: {activeStaff.fullName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingStudentId(null)}
                className="text-slate-400 hover:text-slate-600 p-1 text-base font-bold"
              >
                ✕
              </button>
            </div>

            {/* Bảng điểm 3 kỹ năng */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                1. Điểm số bài kiểm tra (Thang điểm 10):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-[11px] text-slate-600 block mb-1">🎧 Kỹ năng Listening:</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="10"
                    value={listeningScore}
                    onChange={(e) => setListeningScore(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 bg-white rounded-lg border border-slate-200 font-mono font-bold text-sm text-center"
                  />
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-[11px] text-slate-600 block mb-1">🗣️ Kỹ năng Speaking:</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="10"
                    value={speakingScore}
                    onChange={(e) => setSpeakingScore(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 bg-white rounded-lg border border-slate-200 font-mono font-bold text-sm text-center"
                  />
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-[11px] text-slate-600 block mb-1">✍️ Reading & Writing:</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="10"
                    value={readingWritingScore}
                    onChange={(e) => setReadingWritingScore(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 bg-white rounded-lg border border-slate-200 font-mono font-bold text-sm text-center"
                  />
                </div>
              </div>

              <div className="text-right text-xs pt-1">
                Điểm tổng kết bài thi: <strong className="font-mono text-base text-amber-600 font-black">
                  {((listeningScore + speakingScore + readingWritingScore) / 3).toFixed(1)}/10
                </strong>
              </div>
            </div>

            {/* Upload File PDF Bài thi của con */}
            <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="text-xs font-bold text-slate-800 block flex items-center justify-between">
                <span>2. Đính kèm File PDF Bài Thi Đã Chấm Của Con: <span className="text-rose-500">*</span></span>
                <span className="text-[10px] text-slate-400 font-normal">Hỗ trợ file .PDF (Tối đa 15MB)</span>
              </label>

              <div className="flex items-center gap-3">
                <label className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs cursor-pointer flex items-center gap-1.5 transition">
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  <span>Chọn File PDF từ máy</span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleSimulateUpload}
                    className="hidden"
                  />
                </label>

                <div className="flex items-center gap-2 text-xs flex-1 min-w-0">
                  <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                  <span className="font-mono text-xs text-slate-800 truncate">{pdfFileName}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">({pdfFileSize})</span>
                </div>
              </div>
            </div>

            {/* Nhận xét bài thi & Tình hình học tập tháng vừa qua */}
            <div className="space-y-2 text-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  3. Lời phê bài thi & Nhận xét tình hình học tập tháng vừa qua: <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={teacherFeedback}
                  onChange={(e) => setTeacherFeedback(e.target.value)}
                  placeholder="Nhận xét chi tiết về kết quả bài thi, thái độ trong tháng và mức độ tiến bộ của con..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Điểm mạnh của con trong tháng:
                  </label>
                  <input
                    type="text"
                    value={strengths}
                    onChange={(e) => setStrengths(e.target.value)}
                    placeholder="Phản xạ nhanh, phát âm chuẩn..."
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Điểm cần rèn luyện thêm:
                  </label>
                  <input
                    type="text"
                    value={areasForImprovement}
                    onChange={(e) => setAreasForImprovement(e.target.value)}
                    placeholder="Cần cẩn thận hơn ở phần viết ngữ pháp..."
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingStudentId(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={() => handleSaveReport(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5 text-slate-500" />
                <span>Lưu Bản Nháp</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveReport(true)}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 active:scale-95"
              >
                <Send className="w-3.5 h-3.5 text-white" />
                <span>Gửi Báo Cáo & File PDF Tới Phụ Huynh</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chỉnh Sửa & Gửi Zalo Cá Nhân Báo Điểm Thi */}
      <EditZaloMessageModal
        isOpen={editZaloModal.isOpen}
        onClose={() => setEditZaloModal((prev) => ({ ...prev, isOpen: false }))}
        recipientName={editZaloModal.parentName}
        recipientPhone={editZaloModal.parentPhone}
        studentName={editZaloModal.studentName}
        className={editZaloModal.className}
        initialContent={editZaloModal.initialContent}
        title={editZaloModal.title}
        templateBadge={editZaloModal.templateBadge}
        onSend={handleConfirmSendZalo}
      />

      {/* Modal Hàng Đợi Gửi Zalo Báo Điểm Thi Toàn Bộ Lớp Tự Động Giãn Cách 2-3 Phút */}
      <ZaloBatchQueueModal
        isOpen={isZaloQueueOpen}
        onClose={() => setIsZaloQueueOpen(false)}
        title={`Hàng Đợi Zalo Báo Cáo Điểm Thi Lớp ${currentClass?.name || ""}`}
        initialItems={zaloQueueItems}
        onAllCompleted={(count) => {
          setToastMessage(`✓ Đã hoàn tất phiên gửi hàng đợi Zalo báo điểm thi cho ${count} phụ huynh lớp ${currentClass?.name}!`);
        }}
        senderRole="TEACHER"
        senderStaffId={activeStaff.id}
        senderName={activeStaff.fullName}
        senderPhone={activeStaff.phone}
      />
    </div>
  );
}
