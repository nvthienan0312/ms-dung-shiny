"use client";

import { useState, useMemo, useEffect } from "react";
import { useCenter } from "@/context/CenterContext";
import { 
  WorkbookCheckRecord, 
  WorkbookCheckStatus, 
  buildClassThemeMap, 
  CLASS_THEMES 
} from "@/data/centerData";
import { 
  BookCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Send, 
  Calendar, 
  DoorOpen, 
  UserCheck, 
  GraduationCap, 
  Clock, 
  Sparkles, 
  Bell, 
  Search,
  BookOpen,
  MessageSquare
} from "lucide-react";
import { getTodayDateString, getDayOfWeekNumber } from "@/utils/dateHelper";

export interface WorkbookCheckManagerProps {
  currentStaffId?: string; // id của TA (mặc định "staff-ta1" - Thầy Minh Đức)
}

function getDayOfWeekFromDate(dateStr: string): number {
  return getDayOfWeekNumber(dateStr);
}

export default function WorkbookCheckManager({
  currentStaffId = "",
}: WorkbookCheckManagerProps) {
  const { 
    classes, 
    students, 
    staff, 
    substitutions, 
    workbookChecks, 
    saveWorkbookChecks 
  } = useCenter();

  const themeMap = useMemo(() => buildClassThemeMap(classes), [classes]);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => getTodayDateString());
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const dayOfWeek = getDayOfWeekFromDate(selectedDateStr);

  const activeStaff = useMemo(() => {
    return staff.find((s) => s.id === currentStaffId) || { id: "", fullName: "Trợ giảng", role: "ASSISTANT" as const };
  }, [staff, currentStaffId]);

  // Lọc các lớp do TA phụ trách trong ngày đang chọn
  const relevantClasses = useMemo(() => {
    if (!activeStaff.id) return [];
    return classes.filter((cls) => {
      const sub = substitutions.find((s) => s.classId === cls.id && s.dateStr === selectedDateStr);
      if (sub?.subAssistantId) return sub.subAssistantId === activeStaff.id;
      const todaySlot = cls.schedules.find((sch) => sch.dayOfWeek === dayOfWeek);
      if (!todaySlot) return false;
      const slotAssistantId = todaySlot.assistantId || cls.assistantId;
      return slotAssistantId === activeStaff.id;
    });
  }, [classes, activeStaff, substitutions, selectedDateStr, dayOfWeek]);

  // Queue ca học hôm nay
  const todaySessions = useMemo(() => {
    return relevantClasses
      .map((cls) => {
        const sch = cls.schedules.find((s) => s.dayOfWeek === dayOfWeek);
        if (!sch) return null;
        return { classItem: cls, schedule: sch };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.schedule.startTime.localeCompare(b.schedule.startTime));
  }, [relevantClasses, dayOfWeek]);

  useEffect(() => {
    if (todaySessions.length > 0) {
      const stillValid = todaySessions.some((s) => s.classItem.id === selectedClassId);
      if (!stillValid || !selectedClassId) {
        setSelectedClassId(todaySessions[0].classItem.id);
      }
    } else if (selectedClassId) {
      setSelectedClassId("");
    }
  }, [todaySessions, selectedClassId]);

  // Chỉ chọn lớp có lịch trực trong ngày (không fallback sang lớp ngày khác)
  const currentClass = useMemo(() => {
    if (todaySessions.length === 0) return undefined;
    return (
      todaySessions.find((s) => s.classItem.id === selectedClassId)?.classItem ||
      todaySessions[0].classItem
    );
  }, [selectedClassId, todaySessions]);

  const classStudents = useMemo(() => {
    if (!currentClass) return [];
    return students.filter((s) => s.classId === currentClass.id && s.learningStatus !== "DROPPED");
  }, [students, currentClass]);

  // Local state form entries
  const [checkEntries, setCheckEntries] = useState<Map<string, { status: WorkbookCheckStatus; note?: string }>>(new Map());

  // Đồng bộ với dữ liệu đã lưu
  useEffect(() => {
    if (!currentClass) {
      setCheckEntries(new Map());
      return;
    }
    const existingMap = new Map<string, { status: WorkbookCheckStatus; note?: string }>();
    const savedForSession = workbookChecks.filter(
      (w) => w.classId === currentClass.id && w.dateStr === selectedDateStr
    );

    classStudents.forEach((st) => {
      const saved = savedForSession.find((s) => s.studentId === st.id);
      if (saved) {
        existingMap.set(st.id, { status: saved.status, note: saved.note });
      } else {
        existingMap.set(st.id, { status: "DONE", note: "" });
      }
    });

    setCheckEntries(existingMap);
  }, [currentClass, selectedDateStr, classStudents, workbookChecks]);

  // Nút siêu tốc: "Tất cả đã làm đầy đủ"
  const handleMarkAllDone = () => {
    const nextMap = new Map<string, { status: WorkbookCheckStatus; note?: string }>();
    classStudents.forEach((st) => {
      nextMap.set(st.id, { status: "DONE", note: "" });
    });
    setCheckEntries(nextMap);
    setToastMessage("⚡ Đã đánh dấu toàn bộ học sinh hoàn thành bài tập Workbook!");
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Cập nhật trạng thái từng em
  const handleSetStatus = (studentId: string, status: WorkbookCheckStatus) => {
    setCheckEntries((prev) => {
      const next = new Map(prev);
      const current = next.get(studentId) || { status: "DONE" };
      let defaultNote = current.note || "";
      if (status === "NOT_DONE" && !defaultNote) {
        defaultNote = "Chưa làm bài tập trong sách bài tập Workbook";
      } else if (status === "FORGOT_BOOK" && !defaultNote) {
        defaultNote = "Quên mang sách bài tập Workbook tới lớp";
      }
      next.set(studentId, { ...current, status, note: defaultNote });
      return next;
    });
  };

  const handleSetNote = (studentId: string, note: string) => {
    setCheckEntries((prev) => {
      const next = new Map(prev);
      const current = next.get(studentId) || { status: "DONE" };
      next.set(studentId, { ...current, note });
      return next;
    });
  };

  // Lưu và báo phụ huynh
  const handleSaveAndNotify = () => {
    if (!currentClass) return;

    const records: WorkbookCheckRecord[] = classStudents.map((st) => {
      const entry = checkEntries.get(st.id) || { status: "DONE" };
      const isNotDone = entry.status === "NOT_DONE";
      const isForgot = entry.status === "FORGOT_BOOK";
      const isIncomplete = entry.status === "INCOMPLETE";

      let notificationMsg: string | undefined = undefined;
      if (isNotDone) {
        notificationMsg = `Hôm nay cô kiểm tra sách/vở thấy con chưa làm bài tập về nhà trong sách Workbook (${entry.note || "chưa hoàn thành"}). Bố mẹ hỗ trợ đôn đốc con nhé!`;
      } else if (isForgot) {
        notificationMsg = `Hôm nay con quên mang sách/vở Workbook tới lớp. Bố mẹ nhắc con kiểm tra ba lô trước khi đến lớp nhé ạ!`;
      } else if (isIncomplete) {
        notificationMsg = `Hôm nay cô kiểm tra thấy con làm thiếu một số bài trong sách Workbook (${entry.note || "chưa hoàn thành hết"}). Bố mẹ nhắc con làm nốt nhé!`;
      }

      return {
        id: `wb-${currentClass.id}-${st.id}-${selectedDateStr}`,
        classId: currentClass.id,
        dateStr: selectedDateStr,
        studentId: st.id,
        studentName: st.fullName,
        status: entry.status,
        note: entry.note,
        checkedBy: activeStaff.fullName,
        checkedAt: new Date().toISOString(),
        notifiedToParent: isNotDone || isForgot || isIncomplete,
        notificationMessage: notificationMsg,
      };
    });

    saveWorkbookChecks(records);

    const alertCount = records.filter((r) => r.status !== "DONE").length;
    setToastMessage(
      `Đã lưu kết quả kiểm tra Workbook! ${alertCount > 0 ? `Đã tự động gửi thông báo nhắc nhở tới ${alertCount} phụ huynh chưa hoàn thành.` : "100% học sinh đã làm bài đầy đủ!"}`
    );
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Thống kê
  const totalCount = classStudents.length;
  const doneCount = Array.from(checkEntries.values()).filter((e) => e.status === "DONE").length;
  const notDoneCount = Array.from(checkEntries.values()).filter((e) => e.status === "NOT_DONE").length;
  const forgotCount = Array.from(checkEntries.values()).filter((e) => e.status === "FORGOT_BOOK").length;
  const incompleteCount = Array.from(checkEntries.values()).filter((e) => e.status === "INCOMPLETE").length;

  const classTheme = currentClass ? themeMap.get(currentClass.id) || CLASS_THEMES[0] : CLASS_THEMES[0];

  const filteredStudents = useMemo(() => {
    return classStudents.filter((st) =>
      st.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.studentCode.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [classStudents, searchQuery]);

  if (classes.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
        <BookCheck className="w-10 h-10 text-slate-300 mx-auto" />
        <h4 className="font-bold text-base text-slate-800">Chưa Có Dữ Liệu Lớp Học</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Hiện tại trung tâm chưa có lớp học nào được tạo. Vui lòng tạo lớp học tại mục Quản lý Lớp học để bắt đầu kiểm tra sách bài tập.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {/* Header & Date / Class selector */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
              <BookCheck className="w-5 h-5 text-blue-600" />
              Kiểm Tra BTVN Tại Lớp (Trợ Giảng: {activeStaff.fullName})
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

        {/* Hàng ca học của TA hôm nay */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
            Ca trực ({todaySessions.length}):
          </span>
          {todaySessions.length === 0 ? (
            <span className="text-xs text-slate-500">
              Hôm nay (Thứ {dayOfWeek === 8 ? "Chủ Nhật" : dayOfWeek}, {selectedDateStr}) bạn không có ca trực nào.
            </span>
          ) : (
            todaySessions.map((item) => {
              const isSelected = item.classItem.id === currentClass?.id;
              const theme = themeMap.get(item.classItem.id) || CLASS_THEMES[0];
              return (
                <button
                  key={item.classItem.id}
                  type="button"
                  onClick={() => setSelectedClassId(item.classItem.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-left transition shrink-0 ${
                    isSelected
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-amber-400"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${theme.dot}`} />
                  <span className="text-xs font-bold">{item.classItem.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-200/50 text-slate-700">
                    {item.schedule.startTime} - {item.schedule.endTime}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main card */}
      {!currentClass ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2.5 shadow-xs">
          <BookCheck className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="font-bold text-base text-slate-800">
            Không Có Ca Kiểm Tra BTVN Trong Ngày {selectedDateStr}
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Ngày đang chọn (Thứ {dayOfWeek === 8 ? "Chủ Nhật" : dayOfWeek}) không có lớp học nào thuộc lịch trực của bạn. Chọn ngày khác hoặc bấm 📅 Hôm Nay để kiểm tra.
          </p>
        </div>
      ) : (
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm space-y-3">
        {/* Class overview & action bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${classTheme.dot}`} />
            <div>
              <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <span>{currentClass?.name}</span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-0.5">
                  <DoorOpen className="w-3 h-3 text-slate-400" /> {currentClass?.schedules.find((s) => s.dayOfWeek === dayOfWeek)?.classroom || currentClass?.classroom}
                </span>
                <span>•</span>
                <span className="flex items-center gap-0.5">
                  <GraduationCap className="w-3 h-3 text-amber-600" /> GV: {currentClass?.teacherName}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleMarkAllDone}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>⚡ Tất Cả Đã Làm</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndNotify}
              className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 active:scale-95"
            >
              <Send className="w-3.5 h-3.5 text-white" />
              <span>Lưu & Báo Phụ Huynh</span>
            </button>
          </div>
        </div>

        {/* Thống kê nhanh */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
            <span className="text-[11px] text-emerald-700 font-medium block">Đã làm đủ:</span>
            <span className="text-base font-bold text-emerald-800 font-mono">{doneCount}/{totalCount} HS</span>
          </div>
          <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200">
            <span className="text-[11px] text-rose-700 font-medium block">Chưa làm bài:</span>
            <span className="text-base font-bold text-rose-800 font-mono">{notDoneCount} HS</span>
          </div>
          <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
            <span className="text-[11px] text-amber-700 font-medium block">Quên mang sách:</span>
            <span className="text-base font-bold text-amber-800 font-mono">{forgotCount} HS</span>
          </div>
          <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200">
            <span className="text-[11px] text-blue-700 font-medium block">Làm thiếu bài:</span>
            <span className="text-base font-bold text-blue-800 font-mono">{incompleteCount} HS</span>
          </div>
        </div>

        {/* Toast Notification */}
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
            placeholder="Tìm kiếm học sinh..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Student list */}
        <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
          {filteredStudents.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              Không tìm thấy học sinh nào.
            </div>
          ) : (
            filteredStudents.map((st, idx) => {
              const entry = checkEntries.get(st.id) || { status: "DONE" };
              const isNotDone = entry.status === "NOT_DONE";
              const isForgot = entry.status === "FORGOT_BOOK";
              const isIncomplete = entry.status === "INCOMPLETE";

              return (
                <div
                  key={st.id}
                  className={`p-3 space-y-2 transition ${
                    isNotDone
                      ? "bg-rose-50/30"
                      : isForgot
                      ? "bg-amber-50/30"
                      : isIncomplete
                      ? "bg-blue-50/20"
                      : "hover:bg-slate-50/50"
                  }`}
                >
                  {/* Tầng 1: Tên học sinh & Cụm 4 nút chọn trạng thái */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        {/* Tên học sinh 100% trọn vẹn, KHÔNG có học phí */}
                        <div className="font-bold text-xs sm:text-sm text-slate-900">
                          {st.fullName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          Mã: {st.studentCode} • PH: {st.parentName}
                        </div>
                      </div>
                    </div>

                    {/* 4 trạng thái kiểm tra sách */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 self-start sm:self-center shrink-0 text-[10.5px]">
                      <button
                        type="button"
                        onClick={() => handleSetStatus(st.id, "DONE")}
                        className={`px-2.5 py-1 rounded-lg font-bold border transition ${
                          entry.status === "DONE"
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        ✓ Đã làm đủ
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetStatus(st.id, "NOT_DONE")}
                        className={`px-2.5 py-1 rounded-lg font-bold border transition ${
                          entry.status === "NOT_DONE"
                            ? "bg-rose-600 text-white border-rose-600 shadow-2xs"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        ✕ Chưa làm
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetStatus(st.id, "INCOMPLETE")}
                        className={`px-2.5 py-1 rounded-lg font-bold border transition ${
                          entry.status === "INCOMPLETE"
                            ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        ⚠ Làm thiếu
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetStatus(st.id, "FORGOT_BOOK")}
                        className={`px-2.5 py-1 rounded-lg font-bold border transition ${
                          entry.status === "FORGOT_BOOK"
                            ? "bg-amber-500 text-slate-950 border-amber-500 shadow-2xs font-extrabold"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        🎒 Quên sách
                      </button>
                    </div>
                  </div>

                  {/* Tầng 2: Ghi chú & Lời nhắc gửi phụ huynh nếu chưa làm hoặc quên sách */}
                  {(isNotDone || isForgot || isIncomplete) && (
                    <div className="pt-1 text-xs">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-rose-800 flex items-center gap-1">
                            <Bell className="w-3 h-3 text-rose-600" />
                            Tin nhắn sẽ báo cho Phụ huynh ({st.parentPhone}):
                          </span>
                          <span className="text-[10px] text-slate-400">Tự động gửi khi ấn Lưu</span>
                        </div>
                        <input
                          type="text"
                          value={entry.note || ""}
                          onChange={(e) => handleSetNote(st.id, e.target.value)}
                          placeholder="Ví dụ: Chưa làm trang 34-35 bài tập từ vựng Unit 4..."
                          className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      )}
    </div>
  );
}
