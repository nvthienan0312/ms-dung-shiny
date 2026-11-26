"use client";

import { useState, useMemo } from "react";
import { useCenter } from "@/context/CenterContext";
import { 
  StudentIncidentNote, 
  IncidentTag, 
  buildClassThemeMap, 
  CLASS_THEMES 
} from "@/data/centerData";
import { 
  AlertCircle, 
  Send, 
  Calendar, 
  UserCheck, 
  GraduationCap, 
  DoorOpen, 
  Clock, 
  Sparkles, 
  MessageSquare, 
  Trash2, 
  CheckCircle2, 
  Search,
  Tag,
  Plus
} from "lucide-react";
import { getTodayDateString } from "@/utils/dateHelper";
import { generateIncidentNoteZaloMessage, copyToClipboardAndOpenZalo } from "@/utils/zaloHelper";
import EditZaloMessageModal from "@/components/common/EditZaloMessageModal";

export interface StudentIncidentNotesManagerProps {
  userRole?: "ASSISTANT" | "TEACHER" | "ADMIN";
  currentStaffId?: string;
}

const INCIDENT_TAG_OPTIONS: { tag: IncidentTag; label: string; defaultTemplate: string; color: string }[] = [
  {
    tag: "TALKING_IN_CLASS",
    label: "🗣️ Nói chuyện riêng / Nghịch",
    defaultTemplate: "Buổi học hôm nay con rất nghịch, thường xuyên nói chuyện riêng và trêu bạn bên cạnh trong giờ học. Cô/thầy đã nhắc nhở con tại lớp, bố mẹ ở nhà đôn đốc con chú ý lắng nghe hơn nhé ạ.",
    color: "bg-rose-50 text-rose-800 border-rose-200",
  },
  {
    tag: "FORGOT_SUPPLIES",
    label: "🎒 Quên đồ dùng / Sách vở",
    defaultTemplate: "Buổi học hôm nay con quên đồ dùng học tập (bút/sách). Thầy cô đã cho con mượn tại lớp. Bố mẹ giúp con kiểm tra lại ba lô trước buổi học tới nhé ạ.",
    color: "bg-amber-50 text-amber-800 border-amber-200",
  },
  {
    tag: "TIRED_UNWELL",
    label: "😴 Mệt mỏi / Buồn ngủ / Sức khỏe",
    defaultTemplate: "Hôm nay con có biểu hiện hơi mệt mỏi, buồn ngủ trong giờ học. Bố mẹ theo dõi thêm sức khỏe của con ở nhà và cho con nghỉ ngơi sớm nhé.",
    color: "bg-blue-50 text-blue-800 border-blue-200",
  },
  {
    tag: "OUTSTANDING_PRAISE",
    label: "🌟 Khen ngợi đột xuất",
    defaultTemplate: "Hôm nay con có sự tiến bộ vượt bậc, rất tự tin xung phong lên bảng phát biểu và giúp đỡ các bạn trong nhóm. Cô gửi lời khen ngợi đặc biệt tới con!",
    color: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  {
    tag: "OTHER",
    label: "📝 Lưu ý khác",
    defaultTemplate: "",
    color: "bg-slate-50 text-slate-700 border-slate-200",
  },
];

export default function StudentIncidentNotesManager({
  userRole = "ASSISTANT",
  currentStaffId = "",
}: StudentIncidentNotesManagerProps) {
  const { 
    classes, 
    students, 
    staff, 
    substitutions, 
    incidentNotes, 
    addIncidentNote, 
    deleteIncidentNote,
    sendZaloMessageToParent,
  } = useCenter();

  const themeMap = useMemo(() => buildClassThemeMap(classes), [classes]);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => getTodayDateString());
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Drawer / modal form to create a notice for a specific student
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<IncidentTag>("TALKING_IN_CLASS");
  const [customContent, setCustomContent] = useState<string>("");
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
  } | null>(null);

  const activeStaff = useMemo(() => {
    return (
      staff.find((s) => s.id === currentStaffId) || {
        id: "",
        fullName: userRole === "TEACHER" ? "Giáo viên" : userRole === "ASSISTANT" ? "Trợ giảng" : "Quản trị viên",
        phone: "",
        role: userRole,
      }
    );
  }, [staff, currentStaffId, userRole]);

  const relevantClasses = useMemo(() => {
    if (userRole === "ADMIN") return classes;
    if (!activeStaff.id) return [];
    const match = selectedDateStr.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    const d = match
      ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getDay()
      : new Date(selectedDateStr).getDay();
    const dayOfWeek = d === 0 ? 8 : d + 1;

    if (userRole === "TEACHER") {
      return classes.filter((cls) => {
        const todaySlot = cls.schedules.find((sch) => sch.dayOfWeek === dayOfWeek);
        if (!todaySlot) return false;
        const sub = substitutions.find((s) => s.classId === cls.id && s.dateStr === selectedDateStr);
        if (sub?.subTeacherId) return sub.subTeacherId === activeStaff.id;
        const slotTeacherId = todaySlot.teacherId || cls.teacherId;
        return slotTeacherId === activeStaff.id;
      });
    }
    // userRole === "ASSISTANT"
    return classes.filter((cls) => {
      const todaySlot = cls.schedules.find((sch) => sch.dayOfWeek === dayOfWeek);
      if (!todaySlot) return false;
      const sub = substitutions.find((s) => s.classId === cls.id && s.dateStr === selectedDateStr);
      if (sub?.subAssistantId) return sub.subAssistantId === activeStaff.id;
      const slotAssistantId = todaySlot.assistantId || cls.assistantId;
      return slotAssistantId === activeStaff.id;
    });
  }, [classes, userRole, activeStaff, substitutions, selectedDateStr]);

  const currentClass = useMemo(() => {
    if (relevantClasses.length === 0) return undefined;
    if (selectedClassId) {
      return relevantClasses.find((c) => c.id === selectedClassId) || relevantClasses[0];
    }
    return relevantClasses[0];
  }, [selectedClassId, relevantClasses]);

  const classStudents = useMemo(() => {
    if (!currentClass) return [];
    return students.filter((s) => s.classId === currentClass.id && s.learningStatus !== "DROPPED");
  }, [students, currentClass]);

  // Lọc danh sách học sinh theo tìm kiếm
  const filteredStudents = useMemo(() => {
    return classStudents.filter((st) =>
      st.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.studentCode.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [classStudents, searchQuery]);

  // Các lưu ý đã gửi trong buổi học này
  const sessionNotes = useMemo(() => {
    if (!currentClass) return [];
    return incidentNotes.filter(
      (n) => n.classId === currentClass.id && n.dateStr === selectedDateStr
    );
  }, [incidentNotes, currentClass, selectedDateStr]);

  const activeStudent = useMemo(() => {
    return classStudents.find((s) => s.id === activeStudentId);
  }, [classStudents, activeStudentId]);

  const handleOpenNoticeForm = (studentId: string) => {
    setActiveStudentId(studentId);
    setSelectedTag("TALKING_IN_CLASS");
    setCustomContent(INCIDENT_TAG_OPTIONS[0].defaultTemplate);
  };

  const handleSelectTag = (tag: IncidentTag) => {
    setSelectedTag(tag);
    const opt = INCIDENT_TAG_OPTIONS.find((o) => o.tag === tag);
    if (opt && opt.defaultTemplate) {
      setCustomContent(opt.defaultTemplate);
    }
  };

  const handleSendNotice = () => {
    if (!currentClass || !activeStudent) return;
    if (!customContent.trim()) {
      alert("Vui lòng nhập nội dung lưu ý cần gửi cho phụ huynh!");
      return;
    }

    const tagOpt = INCIDENT_TAG_OPTIONS.find((o) => o.tag === selectedTag);

    addIncidentNote({
      classId: currentClass.id,
      className: currentClass.name,
      dateStr: selectedDateStr,
      studentId: activeStudent.id,
      studentName: activeStudent.fullName,
      tag: selectedTag,
      tagLabel: tagOpt?.label || "Lưu ý buổi học",
      content: customContent,
      senderRole: userRole === "TEACHER" ? "TEACHER" : "ASSISTANT",
      senderName: activeStaff.fullName,
    });

    setToastMessage(`Đã gửi tin nhắn lưu ý riêng tới Phụ huynh của bé ${activeStudent.fullName}!`);
    setActiveStudentId(null);
    setCustomContent("");
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSendNoticeAndZalo = () => {
    if (!currentClass || !activeStudent) return;
    if (!customContent.trim()) {
      alert("Vui lòng nhập nội dung lưu ý cần gửi cho phụ huynh!");
      return;
    }

    const tagOpt = INCIDENT_TAG_OPTIONS.find((o) => o.tag === selectedTag);

    addIncidentNote({
      classId: currentClass.id,
      className: currentClass.name,
      dateStr: selectedDateStr,
      studentId: activeStudent.id,
      studentName: activeStudent.fullName,
      tag: selectedTag,
      tagLabel: tagOpt?.label || "Lưu ý buổi học",
      content: customContent,
      senderRole: userRole === "TEACHER" ? "TEACHER" : "ASSISTANT",
      senderName: activeStaff.fullName,
    });

    const msg = generateIncidentNoteZaloMessage(
      activeStudent.fullName,
      activeStudent.parentName || "Phụ huynh",
      activeStaff.fullName,
      userRole === "TEACHER" ? "TEACHER" : "ASSISTANT",
      selectedDateStr,
      tagOpt?.label || "Lưu ý buổi học",
      customContent
    );

    // Mở modal Zalo xem trước và gửi
    setEditZaloModal({
      isOpen: true,
      studentName: activeStudent.fullName,
      parentName: activeStudent.parentName || "Phụ huynh",
      parentPhone: activeStudent.parentPhone || "",
      className: currentClass.name,
      title: `Gửi Zalo Lưu Ý: ${activeStudent.fullName} (${tagOpt?.label || "Lưu ý"})`,
      initialContent: msg,
      templateBadge: "Lưu Ý Buổi Học",
    });

    setActiveStudentId(null);
    setCustomContent("");
  };

  // Mở modal Zalo cho lưu ý đã tạo trước đó
  const handleOpenZaloForExistingNote = (note: StudentIncidentNote) => {
    const stu = students.find((s) => s.id === note.studentId);
    const msg = generateIncidentNoteZaloMessage(
      note.studentName,
      stu?.parentName || "Phụ huynh",
      note.senderName,
      note.senderRole,
      note.dateStr,
      note.tagLabel,
      note.content
    );

    setEditZaloModal({
      isOpen: true,
      studentName: note.studentName,
      parentName: stu?.parentName || "Phụ huynh",
      parentPhone: stu?.parentPhone || "",
      className: note.className,
      title: `Gửi Zalo Lưu Ý: ${note.studentName} (${note.tagLabel})`,
      initialContent: msg,
      templateBadge: "Lưu Ý Buổi Học",
    });
  };

  // Xác nhận gửi Zalo 1-chạm
  const handleConfirmSendZalo = async (finalMessage: string) => {
    if (!editZaloModal) return;
    if (!editZaloModal.parentPhone) {
      setToastMessage("⚠️ Học sinh này chưa có số điện thoại phụ huynh!");
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
      senderRole: userRole === "TEACHER" ? "TEACHER" : "ASSISTANT",
      senderName: activeStaff.fullName,
      senderPhone: activeStaff.phone,
      senderStaffId: activeStaff.id,
      openChatWindow: false,
    });

    if (res.success) {
      setToastMessage(`✓ Đã gửi tin nhắn Zalo lưu ý riêng tới PH bé ${editZaloModal.studentName}!`);
    } else {
      setToastMessage(`⚠️ Không thể gửi Zalo: ${res.message}`);
    }
    setEditZaloModal(null);
    setTimeout(() => setToastMessage(null), 4000);
  };

  if (classes.length === 0 || !currentClass) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
        <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
        <h4 className="font-bold text-base text-slate-800">Chưa Có Dữ Liệu Lớp Học</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Hiện tại trung tâm chưa có lớp học nào được tạo. Vui lòng tạo lớp học tại mục Quản lý Lớp học để bắt đầu ghi chú lưu ý học sinh.
        </p>
      </div>
    );
  }

  const classTheme = currentClass ? themeMap.get(currentClass.id) || CLASS_THEMES[0] : CLASS_THEMES[0];

  return (
    <div className="space-y-3.5">
      {/* Top Header */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
              <MessageSquare className="w-5 h-5 text-amber-500" />
              Lưu Ý Riêng Từng Học Sinh ({userRole === "TEACHER" ? `GV: ${activeStaff.fullName}` : `TA: ${activeStaff.fullName}`})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200 text-xs">
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
          </div>
        </div>

        {/* Hàng chọn lớp */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
            Lớp học:
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${classTheme.dot}`} />
            <div>
              <span className="font-bold text-sm text-slate-900">{currentClass?.name}</span>
              <span className="text-xs text-slate-400 ml-1.5 font-mono">({classStudents.length} học sinh)</span>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Đã gửi lưu ý hôm nay: <strong className="text-amber-600 font-mono">{sessionNotes.length} em</strong>
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
            placeholder="Tìm học sinh cần gửi lưu ý..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Student List */}
        <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
          {filteredStudents.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              Không tìm thấy học sinh.
            </div>
          ) : (
            filteredStudents.map((st, idx) => {
              const studentNotes = sessionNotes.filter((n) => n.studentId === st.id);
              const hasNotes = studentNotes.length > 0;

              return (
                <div
                  key={st.id}
                  className={`p-3 space-y-2 transition ${
                    hasNotes ? "bg-amber-50/20" : "hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        {/* 100% full name, no fee */}
                        <div className="font-bold text-xs sm:text-sm text-slate-900 break-words leading-tight">
                          {st.fullName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          Mã: {st.studentCode} • PH: {st.parentName} ({st.parentPhone})
                        </div>
                      </div>
                    </div>

                    {/* Action button: add note */}
                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                      {hasNotes && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          Đã gửi {studentNotes.length} lưu ý
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenNoticeForm(st.id)}
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-2xs transition flex items-center gap-1 active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm Lưu Ý Riêng</span>
                      </button>
                    </div>
                  </div>

                  {/* Hiển thị các lưu ý đã gửi của học sinh này */}
                  {hasNotes && (
                    <div className="space-y-1.5 pt-1">
                      {studentNotes.map((note) => (
                        <div
                          key={note.id}
                          className="bg-white p-2.5 rounded-xl border border-amber-200 text-xs space-y-1 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10.5px] font-bold text-amber-900 flex items-center gap-1">
                              <span>{note.tagLabel}</span>
                              <span className="text-slate-400 font-normal">• Gửi bởi: {note.senderName}</span>
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenZaloForExistingNote(note)}
                                className="text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded text-[10.5px] font-bold flex items-center gap-0.5 transition"
                                title="Gửi lưu ý này qua Zalo cho PH"
                              >
                                <MessageSquare className="w-3 h-3 text-emerald-600" />
                                <span>Báo Zalo</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteIncidentNote(note.id)}
                                className="text-slate-400 hover:text-rose-600 p-0.5"
                                title="Xóa lưu ý này"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-slate-700 italic text-[11px] leading-relaxed">
                            &ldquo;{note.content}&rdquo;
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL / DRAWER FORM: GỬI LƯU Ý CHO HỌC SINH ĐƯỢC CHỌN */}
      {activeStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-4 sm:p-5 space-y-3.5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between pb-2.5 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                  Lưu Ý Riêng Gửi Phụ Huynh
                </span>
                <h4 className="font-bold text-base text-slate-900 mt-1">
                  {activeStudent.fullName} ({activeStudent.studentCode})
                </h4>
                <p className="text-[11px] text-slate-500">
                  Phụ huynh: {activeStudent.parentName} • SĐT: {activeStudent.parentPhone}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveStudentId(null)}
                className="text-slate-400 hover:text-slate-600 p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Chọn mẫu lưu ý nhanh */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                1. Chọn phân loại lưu ý:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                {INCIDENT_TAG_OPTIONS.map((item) => {
                  const isSelected = selectedTag === item.tag;
                  return (
                    <button
                      key={item.tag}
                      type="button"
                      onClick={() => handleSelectTag(item.tag)}
                      className={`px-2.5 py-1.5 rounded-xl border text-left text-xs font-semibold transition ${
                        isSelected
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Soạn thảo nội dung */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                2. Nội dung chi tiết gửi phụ huynh: <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={customContent}
                onChange={(e) => setCustomContent(e.target.value)}
                placeholder="Nhập nội dung cụ thể gửi cho bố mẹ bé..."
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs leading-relaxed"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveStudentId(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleSendNoticeAndZalo}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                title="Lưu vào hệ thống và mở Zalo gửi ngay cho phụ huynh"
              >
                <MessageSquare className="w-3.5 h-3.5 text-white" />
                <span>💬 Mở Zalo & Gửi</span>
              </button>

              <button
                type="button"
                onClick={handleSendNotice}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-white" />
                <span>Gửi Cổng App</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chỉnh Sửa & Gửi Zalo Cá Nhân Lưu Ý Buổi Học */}
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
          senderRole={userRole === "TEACHER" ? "TEACHER" : "ASSISTANT"}
          senderStaffId={activeStaff.id}
          senderPhone={activeStaff.phone}
          onSend={handleConfirmSendZalo}
        />
      )}
    </div>
  );
}
