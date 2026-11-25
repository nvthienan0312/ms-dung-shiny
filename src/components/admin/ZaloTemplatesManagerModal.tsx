"use client";

import React, { useState } from "react";
import { 
  X, 
  Save, 
  RotateCcw, 
  Sparkles, 
  Check, 
  HelpCircle, 
  Eye, 
  MessageSquare,
  CreditCard,
  UserCheck,
  BookOpen,
  Calendar,
  Award
} from "lucide-react";
import { useCenter } from "@/context/CenterContext";
import { ZaloMasterTemplates, DEFAULT_ZALO_MASTER_TEMPLATES } from "@/data/centerData";

export interface ZaloTemplatesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TemplateMeta {
  key: keyof ZaloMasterTemplates;
  title: string;
  category: "TUITION" | "ATTENDANCE" | "CLASS_LOG" | "MAKEUP" | "EXAM";
  description: string;
  tokens: { token: string; label: string }[];
  sampleTokens: Record<string, string>;
}

const TEMPLATE_METAS: TemplateMeta[] = [
  {
    key: "tuitionFirstOfMonth",
    title: "1. Thông Báo Học Phí Đầu Tháng (Ngày 01)",
    category: "TUITION",
    description: "Tự động gửi vào ngày 01 hàng tháng khi Admin phát hành thông báo học phí.",
    tokens: [
      { token: "{studentName}", label: "Tên học sinh" },
      { token: "{className}", label: "Tên lớp" },
      { token: "{month}", label: "Tháng thu" },
      { token: "{totalSessions}", label: "Số buổi" },
      { token: "{feePerLesson}", label: "Học phí 1 buổi" },
      { token: "{finalAmount}", label: "Tổng tiền cần đóng" },
      { token: "{dueDate}", label: "Hạn chót đóng" },
      { token: "{transferContent}", label: "Nội dung chuyển khoản" },
      { token: "{hotline}", label: "Hotline trung tâm" },
    ],
    sampleTokens: {
      studentName: "Bảo Nam",
      className: "Super Kids 01",
      month: "11/2026",
      totalSessions: "8",
      feePerLesson: "180.000đ",
      finalAmount: "1.440.000đ",
      dueDate: "10/11/2026",
      transferContent: "HP11 BAONAM SK01 0912345678",
      hotline: "0964 645 174",
    },
  },
  {
    key: "tuitionDueDate",
    title: "2. Nhắc Hẹn Cận Hạn Đóng (Cận Ngày 10)",
    category: "TUITION",
    description: "Gửi nhắc nhở phụ huynh trước hoặc đúng ngày 10 hạn chót.",
    tokens: [
      { token: "{studentName}", label: "Tên học sinh" },
      { token: "{className}", label: "Tên lớp" },
      { token: "{month}", label: "Tháng thu" },
      { token: "{finalAmount}", label: "Số tiền còn thiếu" },
      { token: "{dueDate}", label: "Hạn chót" },
      { token: "{transferContent}", label: "Cú pháp chuyển khoản" },
      { token: "{hotline}", label: "Hotline" },
    ],
    sampleTokens: {
      studentName: "Bảo Nam",
      className: "Super Kids 01",
      month: "11/2026",
      finalAmount: "1.440.000đ",
      dueDate: "10/11/2026",
      transferContent: "HP11 BAONAM SK01 0912345678",
      hotline: "0964 645 174",
    },
  },
  {
    key: "tuitionOverdue",
    title: "3. Cảnh Báo Học Phí Quá Hạn (Sau Ngày 10)",
    category: "TUITION",
    description: "Tự động kích hoạt khi học phí chưa thanh toán sau ngày 10 hàng tháng.",
    tokens: [
      { token: "{studentName}", label: "Tên học sinh" },
      { token: "{className}", label: "Tên lớp" },
      { token: "{month}", label: "Tháng nợ" },
      { token: "{finalAmount}", label: "Số tiền nợ" },
      { token: "{dueDate}", label: "Hạn cũ" },
      { token: "{hotline}", label: "Hotline" },
    ],
    sampleTokens: {
      studentName: "Bảo Nam",
      className: "Super Kids 01",
      month: "11/2026",
      finalAmount: "1.440.000đ",
      dueDate: "10/11/2026",
      hotline: "0964 645 174",
    },
  },
  {
    key: "tuitionMultiMonth",
    title: "4. Công Nợ Học Phí Lũy Kế (Nợ Nhiều Tháng)",
    category: "TUITION",
    description: "Dành cho học sinh nợ học phí từ 2 tháng trở lên với mã QR gộp công nợ.",
    tokens: [
      { token: "{studentName}", label: "Tên học sinh" },
      { token: "{className}", label: "Tên lớp" },
      { token: "{debtCount}", label: "Số tháng nợ" },
      { token: "{unpaidMonths}", label: "Danh sách tháng nợ" },
      { token: "{totalDebtAmount}", label: "Tổng tiền nợ lũy kế" },
      { token: "{hotline}", label: "Hotline" },
    ],
    sampleTokens: {
      studentName: "Bảo Nam",
      className: "Super Kids 01",
      debtCount: "2",
      unpaidMonths: "Tháng 09, 10/2026",
      totalDebtAmount: "2.880.000đ",
      hotline: "0964 645 174",
    },
  },
  {
    key: "attendanceAbsent",
    title: "5. Báo Vắng Mặt Khi Điểm Danh Buổi Học",
    category: "ATTENDANCE",
    description: "Gửi ngay tới phụ huynh khi trợ giảng điểm danh vắng mặt tại lớp.",
    tokens: [
      { token: "{studentName}", label: "Tên con" },
      { token: "{className}", label: "Lớp học" },
      { token: "{dateStr}", label: "Ngày học" },
      { token: "{staffName}", label: "Người điểm danh" },
      { token: "{hotline}", label: "Hotline" },
    ],
    sampleTokens: {
      studentName: "Bảo Nam",
      className: "Super Kids 01",
      dateStr: "08/11/2026",
      staffName: "Cô Trợ Giảng Minh Anh",
      hotline: "0964 645 174",
    },
  },
  {
    key: "attendanceGroupReport",
    title: "5b. Báo Cáo Điểm Danh Gửi Vào Nhóm Zalo Lớp",
    category: "ATTENDANCE",
    description: "Tự động gửi vào nhóm Zalo lớp ngay sau khi lưu điểm danh (Lớp, Ngày, Ca học, Sĩ số đủ, Danh sách vắng).",
    tokens: [
      { token: "{className}", label: "Tên lớp học" },
      { token: "{dateStr}", label: "Ngày điểm danh" },
      { token: "{timeSlot}", label: "Ca học (Giờ bắt đầu - kết thúc)" },
      { token: "{roomName}", label: "Phòng học" },
      { token: "{teacherName}", label: "Giáo viên" },
      { token: "{assistantName}", label: "Trợ giảng" },
      { token: "{totalStudents}", label: "Sĩ số lớp" },
      { token: "{presentCount}", label: "Số lượng đi đủ" },
      { token: "{presentPercent}", label: "Tỷ lệ có mặt (%)" },
      { token: "{absentCount}", label: "Số lượng vắng" },
      { token: "{absentListSection}", label: "Danh sách họ tên học sinh vắng" },
      { token: "{hotline}", label: "Hotline trung tâm" },
    ],
    sampleTokens: {
      className: "Super Kids 01",
      dateStr: "Thứ Hai, ngày 08/11/2026",
      timeSlot: "17:30 - 19:00",
      roomName: "Phòng Tầng 3",
      teacherName: "Cô Minh Anh",
      assistantName: "Thầy Tuấn Kiệt",
      totalStudents: "15",
      presentCount: "14",
      presentPercent: "93",
      absentCount: "1",
      absentListSection: "❌ DANH SÁCH HỌC SINH VẮNG (1 con):\n  1. Trần Minh Quân (Lý do: Bị sốt nhẹ)",
      hotline: "Hotline Trung Tâm",
    },
  },
  {
    key: "classLogParent",
    title: "6. Nhật Ký Buổi Học & BTVN Gửi Riêng Phụ Huynh",
    category: "CLASS_LOG",
    description: "Gửi chi tiết bài học hôm nay, dặn dò bài tập và tệp PDF tới từng Phụ huynh.",
    tokens: [
      { token: "{studentName}", label: "Tên con" },
      { token: "{className}", label: "Lớp học" },
      { token: "{dateStr}", label: "Ngày học" },
      { token: "{staffGreeting}", label: "Lời chào GV" },
      { token: "{lessonTopic}", label: "Chủ đề bài học" },
      { token: "{lessonContent}", label: "Nội dung bài học" },
      { token: "{homeworkTitle}", label: "Tên BTVN" },
      { token: "{homeworkDescription}", label: "Mô tả BTVN" },
      { token: "{submissionType}", label: "Hình thức nộp" },
      { token: "{homeworkDeadline}", label: "Hạn nộp bài" },
      { token: "{attachmentFileSection}", label: "Mục file đính kèm PDF" },
    ],
    sampleTokens: {
      studentName: "Bảo Nam",
      className: "Super Kids 01",
      dateStr: "08/11/2026",
      staffGreeting: "Cô Minh Anh",
      lessonTopic: " Unit 4: Animals & Hobbies",
      lessonContent: "Hôm nay các con đã học từ vựng về động vật hoang dã và mẫu câu hỏi 'What is your favorite animal?'.",
      homeworkTitle: "Quay video phát âm 5 con vật và làm bài tập trang 24 sách Workbook",
      homeworkDescription: "Con quay video rõ mặt và phát âm chuẩn các âm đuôi /s/, /z/.",
      submissionType: "Cả Quay Video & Chụp Sách Workbook",
      homeworkDeadline: "20:00 ngày 10/11/2026",
      attachmentFileSection: "📎 File bài tập đính kèm: [Tai_lieu_Unit4.pdf] (Tải về ôn tập trên Cổng PH)",
    },
  },
  {
    key: "classLogGroup",
    title: "7. Nhật Ký & BTVN Đăng Nhóm Zalo Lớp",
    category: "CLASS_LOG",
    description: "Đăng tóm tắt bài học & dặn dò BTVN chung trực tiếp vào Nhóm Zalo của lớp.",
    tokens: [
      { token: "{className}", label: "Tên lớp" },
      { token: "{dateStr}", label: "Ngày học" },
      { token: "{staffGreeting}", label: "Lời chào GV" },
      { token: "{lessonTopic}", label: "Chủ đề bài học" },
      { token: "{lessonContent}", label: "Nội dung bài học" },
      { token: "{homeworkTitle}", label: "Tên BTVN" },
      { token: "{homeworkDescription}", label: "Mô tả BTVN" },
      { token: "{submissionType}", label: "Hình thức nộp" },
      { token: "{homeworkDeadline}", label: "Hạn nộp bài" },
      { token: "{attachmentFileSection}", label: "File đính kèm PDF" },
    ],
    sampleTokens: {
      className: "Super Kids 01",
      dateStr: "08/11/2026",
      staffGreeting: "Cô Minh Anh",
      lessonTopic: " Unit 4: Animals & Hobbies",
      lessonContent: "Hôm nay các con đã học từ vựng về động vật hoang dã và mẫu câu hỏi 'What is your favorite animal?'.",
      homeworkTitle: "Quay video phát âm 5 con vật và làm bài tập trang 24 sách Workbook",
      homeworkDescription: "Con quay video rõ mặt và phát âm chuẩn các âm đuôi /s/, /z/.",
      submissionType: "Cả Quay Video & Chụp Sách Workbook",
      homeworkDeadline: "20:00 ngày 10/11/2026",
      attachmentFileSection: "📎 File bài tập đính kèm: [Tai_lieu_Unit4.pdf]",
    },
  },
  {
    key: "makeupSurvey",
    title: "8. Khảo Sát Lịch Rảnh Học Bù Trong Tháng",
    category: "MAKEUP",
    description: "Gửi cho phụ huynh có con vắng mặt để thu thập lịch rảnh xếp ca bù.",
    tokens: [
      { token: "{studentName}", label: "Tên con" },
      { token: "{className}", label: "Lớp học" },
      { token: "{month}", label: "Tháng" },
      { token: "{absentCount}", label: "Số buổi vắng" },
      { token: "{absentDates}", label: "Các ngày vắng" },
      { token: "{hotline}", label: "Hotline" },
    ],
    sampleTokens: {
      studentName: "Bảo Nam",
      className: "Super Kids 01",
      month: "11/2026",
      absentCount: "1",
      absentDates: "03/11/2026",
      hotline: "Hotline Trung Tâm",
    },
  },
  {
    key: "makeupSchedule",
    title: "9. Thông Báo Ca Học Bù Đã Xếp Lịch",
    category: "MAKEUP",
    description: "Gửi thông tin phòng học, giờ học và giáo viên phụ trách khi ca bù được tạo.",
    tokens: [
      { token: "{studentName}", label: "Tên con" },
      { token: "{className}", label: "Lớp" },
      { token: "{title}", label: "Tiêu đề lớp bù" },
      { token: "{dateStr}", label: "Ngày học bù" },
      { token: "{startTime}", label: "Giờ bắt đầu" },
      { token: "{endTime}", label: "Giờ kết thúc" },
      { token: "{classroom}", label: "Phòng học" },
      { token: "{staffName}", label: "GV/TA phụ trách" },
      { token: "{focusTopic}", label: "Trọng tâm bài bù" },
      { token: "{hotline}", label: "Hotline" },
    ],
    sampleTokens: {
      studentName: "Bảo Nam",
      className: "Super Kids 01",
      title: "Ôn tập bổ trợ Phonics & Grammar Unit 4",
      dateStr: "15/11/2026",
      startTime: "09:00",
      endTime: "10:30",
      classroom: "Phòng Tầng 3",
      staffName: "Thầy Tuấn Kiệt",
      focusTopic: "Luyện phát âm đuôi /s/, /es/ và thì hiện tại đơn",
      hotline: "Hotline Trung Tâm",
    },
  },
  {
    key: "monthlyExam",
    title: "10. Báo Cáo Điểm Thi Tháng Kèm File PDF",
    category: "EXAM",
    description: "Gửi bảng điểm chi tiết 4 kỹ năng và phiếu kết quả thi tháng kèm link tải PDF.",
    tokens: [
      { token: "{studentName}", label: "Tên con" },
      { token: "{className}", label: "Lớp" },
      { token: "{month}", label: "Kỳ thi tháng" },
      { token: "{listeningScore}", label: "Điểm Listening" },
      { token: "{speakingScore}", label: "Điểm Speaking" },
      { token: "{readingScore}", label: "Điểm Reading" },
      { token: "{writingScore}", label: "Điểm Writing" },
      { token: "{totalScore}", label: "Tổng điểm" },
      { token: "{teacherComment}", label: "Nhận xét của giáo viên" },
      { token: "{pdfLink}", label: "Link tải phiếu điểm PDF" },
      { token: "{hotline}", label: "Hotline" },
    ],
    sampleTokens: {
      studentName: "Bảo Nam",
      className: "Super Kids 01",
      month: "10/2026",
      listeningScore: "9.0",
      speakingScore: "8.5",
      readingScore: "9.5",
      writingScore: "8.0",
      totalScore: "8.75/10",
      teacherComment: "Con tiếp thu rất nhanh, phản xạ giao tiếp tự tin và phát âm chuẩn.",
      pdfLink: "https://msdungshiny.edu.vn/reports/exam-oct2026-baonam.pdf",
      hotline: "0964 645 174",
    },
  },
];

export default function ZaloTemplatesManagerModal({
  isOpen,
  onClose,
}: ZaloTemplatesManagerModalProps) {
  const { zaloTemplates, updateZaloTemplate, resetZaloTemplates } = useCenter();
  const [selectedKey, setSelectedKey] = useState<keyof ZaloMasterTemplates>("tuitionFirstOfMonth");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [savedSuccessKey, setSavedSuccessKey] = useState<string | null>(null);

  // Local draft state for editing
  const [currentText, setCurrentText] = useState<string>(() => zaloTemplates[selectedKey] || DEFAULT_ZALO_MASTER_TEMPLATES[selectedKey]);

  // Keep local draft in sync when switching template key
  const handleSelectKey = (key: keyof ZaloMasterTemplates) => {
    setSelectedKey(key);
    setCurrentText(zaloTemplates[key] || DEFAULT_ZALO_MASTER_TEMPLATES[key]);
  };

  if (!isOpen) return null;

  const currentMeta = TEMPLATE_METAS.find((m) => m.key === selectedKey)!;

  const handleInsertToken = (token: string) => {
    setCurrentText((prev) => prev + " " + token);
  };

  const handleSaveCurrent = () => {
    updateZaloTemplate(selectedKey, currentText);
    setSavedSuccessKey(selectedKey);
    setTimeout(() => setSavedSuccessKey(null), 2500);
  };

  const handleResetCurrent = () => {
    const defaultVal = DEFAULT_ZALO_MASTER_TEMPLATES[selectedKey];
    setCurrentText(defaultVal);
    updateZaloTemplate(selectedKey, defaultVal);
    setSavedSuccessKey(selectedKey);
    setTimeout(() => setSavedSuccessKey(null), 2500);
  };

  const handleResetAll = () => {
    if (confirm("Bạn có chắc chắn muốn khôi phục TẤT CẢ mẫu tin nhắn về mặc định của trung tâm?")) {
      resetZaloTemplates();
      setCurrentText(DEFAULT_ZALO_MASTER_TEMPLATES[selectedKey]);
      setSavedSuccessKey("ALL");
      setTimeout(() => setSavedSuccessKey(null), 2500);
    }
  };

  // Generate live preview by substituting sample tokens
  const renderPreview = () => {
    let preview = currentText;
    Object.entries(currentMeta.sampleTokens).forEach(([k, v]) => {
      preview = preview.replaceAll(`{${k}}`, v);
    });
    return preview;
  };

  const filteredMetas = TEMPLATE_METAS.filter(
    (m) => categoryFilter === "ALL" || m.category === categoryFilter
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-xl shadow-xs border border-white/20">
              ⚙️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">Cấu Hình Mẫu Tin Nhắn Tự Động Toàn Hệ Thống</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-slate-950 shadow-xs">
                  Admin Độc Quyền
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                Thiết lập mẫu tin nhắn chuẩn một lần để áp dụng thống nhất cho toàn bộ giáo viên, trợ giảng và học sinh
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetAll}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition cursor-pointer"
              title="Khôi phục tất cả 10 mẫu về mặc định ban đầu"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi phục tất cả</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CATEGORY BAR */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
          <span className="text-slate-500 mr-2 flex items-center gap-1 text-[11px]">
            Lọc hạng mục:
          </span>
          {[
            { id: "ALL", label: "Tất Cả (10)", icon: MessageSquare },
            { id: "TUITION", label: "Học Phí (4)", icon: CreditCard },
            { id: "ATTENDANCE", label: "Điểm Danh (1)", icon: UserCheck },
            { id: "CLASS_LOG", label: "Nhật Ký & BTVN (2)", icon: BookOpen },
            { id: "MAKEUP", label: "Lớp Học Bù (2)", icon: Calendar },
            { id: "EXAM", label: "Bài Thi Tháng (1)", icon: Award },
          ].map((cat) => {
            const Icon = cat.icon;
            const active = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  active
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* MAIN BODY: 2 COLUMNS */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-200">
          
          {/* LEFT LIST: TEMPLATE SELECTOR */}
          <div className="w-full md:w-80 p-3 overflow-y-auto space-y-1.5 bg-slate-50/60 shrink-0">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1">
              Danh Sách Mẫu Tin ({filteredMetas.length})
            </div>
            {filteredMetas.map((m) => {
              const active = selectedKey === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => handleSelectKey(m.key)}
                  className={`w-full text-left p-3 rounded-2xl transition border cursor-pointer ${
                    active
                      ? "bg-white border-blue-500 shadow-md ring-2 ring-blue-500/10"
                      : "bg-white/80 hover:bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      m.category === "TUITION" ? "bg-amber-100 text-amber-800" :
                      m.category === "ATTENDANCE" ? "bg-rose-100 text-rose-800" :
                      m.category === "CLASS_LOG" ? "bg-blue-100 text-blue-800" :
                      m.category === "MAKEUP" ? "bg-purple-100 text-purple-800" :
                      "bg-emerald-100 text-emerald-800"
                    }`}>
                      {m.category === "TUITION" ? "Học Phí" :
                       m.category === "ATTENDANCE" ? "Điểm Danh" :
                       m.category === "CLASS_LOG" ? "BTVN" :
                       m.category === "MAKEUP" ? "Học Bù" : "Thi Tháng"}
                    </span>
                    {savedSuccessKey === m.key && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Đã lưu
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-xs text-slate-900 mt-1 line-clamp-1">
                    {m.title}
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-tight">
                    {m.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* RIGHT: EDITOR & LIVE PREVIEW */}
          <div className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-5 space-y-4">
            
            {/* CURRENT TEMPLATE TITLE & DESCRIPTION */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <span>{currentMeta.title}</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {currentMeta.description}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetCurrent}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="Khôi phục mẫu này về mặc định"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Mặc định</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveCurrent}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                >
                  {savedSuccessKey === selectedKey ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Đã Lưu Xong!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Lưu Mẫu Này</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* DYNAMIC TOKEN INSERTION BAR */}
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Các Thẻ Biến Tự Động (Bấm để chèn vào vị trí cuối):</span>
                </span>
                <span className="text-[10px] text-blue-700 font-semibold">
                  Tự động thay thế bằng dữ liệu thật khi gửi
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {currentMeta.tokens.map((t) => (
                  <button
                    key={t.token}
                    type="button"
                    onClick={() => handleInsertToken(t.token)}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-600 hover:text-white text-blue-800 border border-blue-200 text-[11px] font-mono font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer group"
                    title={`Chèn biến ${t.token} (${t.label})`}
                  >
                    <span>{t.token}</span>
                    <span className="text-[10px] font-normal text-slate-400 group-hover:text-blue-100">
                      ({t.label})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* EDITOR & LIVE PREVIEW 2-PANE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
              
              {/* EDITING TEXTAREA */}
              <div className="flex flex-col space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <span>Nội Dung Mẫu:</span>
                  </span>
                  <span className="text-[11px] font-normal text-slate-500 font-mono">
                    {currentText.length} ký tự
                  </span>
                </div>
                <textarea
                  value={currentText}
                  onChange={(e) => setCurrentText(e.target.value)}
                  rows={13}
                  className="w-full flex-1 p-3.5 rounded-2xl border border-slate-300 bg-white text-xs leading-relaxed font-sans text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-inner resize-y"
                  placeholder="Nhập nội dung mẫu tin nhắn..."
                />
              </div>

              {/* LIVE PREVIEW BOX */}
              <div className="flex flex-col space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5 text-indigo-700">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Xem Trước Tin Nhắn Thực Tế (Preview):</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Dữ liệu mẫu giả định
                  </span>
                </div>
                <div className="flex-1 p-4 rounded-2xl border border-indigo-200 bg-slate-50 text-xs leading-relaxed text-slate-800 whitespace-pre-wrap font-sans overflow-y-auto max-h-[350px] shadow-xs">
                  {renderPreview()}
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* FOOTER */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-500 text-[11px]">
            💡 Lưu ý: Các thay đổi sẽ được lưu trữ an toàn vào hệ thống và áp dụng ngay lập tức cho tất cả tác vụ gửi tin.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold transition cursor-pointer"
          >
            Đóng Cửa Sổ
          </button>
        </div>

      </div>
    </div>
  );
}