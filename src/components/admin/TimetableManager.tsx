"use client";

import { useState, useMemo } from "react";
import { UserRole } from "@/types/auth";
import { useCenter } from "@/context/CenterContext";
import { CLASS_THEMES, ClassItem, MakeupClass, ScheduleSlot, SessionSubstitution, buildClassThemeMap } from "@/data/centerData";
import { validateSubstituteConflict, detectAllTimetableConflicts } from "@/utils/conflictChecker";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  GraduationCap, 
  UserCheck, 
  DoorOpen, 
  Users, 
  ChevronLeft, 
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  X,
  CalendarDays,
  Info,
  CheckCircle2,
  Sparkles,
  Palette,
  Lock,
  ShieldCheck
} from "lucide-react";

interface TimeSlotRow {
  id: string;
  label: string;
  timeRange: string;
  badge: string;
  description: string;
  filter: (startTime: string) => boolean;
}

const TIME_SLOT_ROWS: TimeSlotRow[] = [
  {
    id: "MORNING",
    label: "Ca Sáng",
    timeRange: "08:00 - 12:00",
    badge: "bg-sky-50 text-sky-800 border-sky-200",
    description: "Lớp Mầm non & Cuối tuần",
    filter: (t) => t < "12:00",
  },
  {
    id: "AFTERNOON",
    label: "Ca Chiều",
    timeRange: "13:30 - 17:00",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    description: "Khóa Teens & Thi chứng chỉ",
    filter: (t) => t >= "12:00" && t < "17:00",
  },
  {
    id: "EVENING_1",
    label: "Ca Tối 1 (Sớm)",
    timeRange: "17:00 - 19:00",
    badge: "bg-indigo-50 text-indigo-800 border-indigo-200",
    description: "Khóa Giao tiếp & Phonics",
    filter: (t) => t >= "17:00" && t < "19:00",
  },
  {
    id: "EVENING_2",
    label: "Ca Tối 2 (Chính)",
    timeRange: "19:00 - 21:30",
    badge: "bg-purple-50 text-purple-800 border-purple-200",
    description: "IELTS Intensive & Nâng cao",
    filter: (t) => t >= "19:00",
  },
];

function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function jsDayToOurDay(jsDay: number): number {
  return jsDay === 0 ? 8 : jsDay + 1;
}

interface TimetableSessionEntry {
  classItem?: ClassItem;
  schedule: ScheduleSlot;
  date: Date;
  dateStr: string;
  substitution?: SessionSubstitution;
  effectiveTeacherName: string;
  effectiveAssistantName: string;
  isSubstituted: boolean;
  isMakeupClass?: boolean;
  makeupClass?: MakeupClass;
}

export interface TimetableManagerProps {
  userRole?: UserRole;
  currentStaffId?: string;
}

export default function TimetableManager({ userRole = "ADMIN", currentStaffId = "" }: TimetableManagerProps) {
  const isAdmin = userRole === "ADMIN";
  const { classes, staff, substitutions, makeupClasses, setSubstitution, removeSubstitution } = useCenter();

  const activeStaff = useMemo(() => {
    if (isAdmin || !currentStaffId) return undefined;
    return staff.find((s) => s.id === currentStaffId);
  }, [isAdmin, currentStaffId, staff]);

  // BẢN ĐỒ MÀU SẮC ĐỘC NHẤT 100% - KHÔNG BAO GIỜ TRÙNG MÀU
  const themeMap = useMemo(() => buildClassThemeMap(classes), [classes]);

  // Mode: "WEEKLY" or "MONTHLY"
  const [viewMode, setViewMode] = useState<"WEEKLY" | "MONTHLY">("WEEKLY");

  // Selected date reference (Thời gian thực hôm nay)
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const realTodayStr = formatDateISO(new Date());

  // Filters
  const [teacherFilter, setTeacherFilter] = useState<string>("ALL");
  const [assistantFilter, setAssistantFilter] = useState<string>("ALL");

  // Direct Session Detail Modal
  const [activeSession, setActiveSession] = useState<TimetableSessionEntry | null>(null);

  // Substitute Assignment Sub-Modal
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subTeacherId, setSubTeacherId] = useState("");
  const [subAssistantId, setSubAssistantId] = useState("");
  const [subReason, setSubReason] = useState("");
  const [subConflictError, setSubConflictError] = useState<string | null>(null);

  const teachers = staff.filter((s) => s.role === "TEACHER");
  const assistants = staff.filter((s) => s.role === "ASSISTANT");

  // Quét liên tục xung đột phòng học / trùng giờ trên toàn bộ hệ thống (Chỉ Admin xem cảnh báo toàn trung tâm)
  const timetableConflicts = useMemo(() => {
    if (!isAdmin) return [];
    return detectAllTimetableConflicts(classes, makeupClasses);
  }, [isAdmin, classes, makeupClasses]);

  // --- WEEKLY CALENDAR LOGIC ---
  const getStartOfWeek = (d: Date): Date => {
    const copy = new Date(d);
    const day = copy.getDay();
    const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(copy.setDate(diff));
  };

  const weekStart = getStartOfWeek(selectedDate);
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const nextWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 7);
    setSelectedDate(d);
  };

  const prevWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 7);
    setSelectedDate(d);
  };

  // --- MONTHLY CALENDAR LOGIC ---
  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth();

  const nextMonth = () => {
    setSelectedDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const prevMonth = () => {
    setSelectedDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonthJs = new Date(currentYear, currentMonth, 1).getDay();
  const firstDayIndex = firstDayOfMonthJs === 0 ? 6 : firstDayOfMonthJs - 1;

  // Query sessions for a date
  const getSessionsForDate = (date: Date): TimetableSessionEntry[] => {
    if (!isAdmin && !currentStaffId) return [];

    const ourDay = jsDayToOurDay(date.getDay());
    const dateStr = formatDateISO(date);

    const result: TimetableSessionEntry[] = [];

    // 1. Regular classes
    (classes || []).forEach((cls) => {
      if (!cls) return;
      (cls.schedules || []).forEach((sch) => {
        if (!sch) return;
        if (sch.dayOfWeek === ourDay) {
          const sub = (substitutions || []).find(
            (s) => s.classId === cls.id && s.dateStr === dateStr
          );

          const effectiveTeacherId = sub?.subTeacherId || sch.teacherId || cls.teacherId || "";
          const effectiveAssistantId = sub?.subAssistantId || sch.assistantId || cls.assistantId || "";
          const effectiveTeacherName = sub?.subTeacherName || sch.teacherName || cls.teacherName || "";
          const effectiveAssistantName = sub?.subAssistantName || sch.assistantName || cls.assistantName || "";

          if (userRole === "TEACHER") {
            const matchesById = Boolean(effectiveTeacherId && effectiveTeacherId === currentStaffId);
            const matchesByName = Boolean(
              !effectiveTeacherId && activeStaff?.fullName && effectiveTeacherName === activeStaff.fullName
            );
            if (!matchesById && !matchesByName) return;
          } else if (userRole === "ASSISTANT") {
            const matchesById = Boolean(effectiveAssistantId && effectiveAssistantId === currentStaffId);
            const matchesByName = Boolean(
              !effectiveAssistantId && activeStaff?.fullName && effectiveAssistantName === activeStaff.fullName
            );
            if (!matchesById && !matchesByName) return;
          } else {
            if (teacherFilter !== "ALL" && !effectiveTeacherName.includes(teacherFilter)) return;
            if (assistantFilter !== "ALL" && !effectiveAssistantName.includes(assistantFilter)) return;
          }

          result.push({
            classItem: cls,
            schedule: sch,
            date,
            dateStr,
            substitution: sub,
            effectiveTeacherName,
            effectiveAssistantName,
            isSubstituted: Boolean(sub),
          });
        }
      });
    });

    // 2. Make-up classes linked with timetable
    (makeupClasses || [])
      .filter((mc) => mc.dateStr === dateStr && mc.status !== "CANCELLED")
      .forEach((mc) => {
        const isTeacher = mc.roleInCharge === "TEACHER";
        const mcStaffName = mc.teacherOrAssistantName || "";

        if (userRole === "TEACHER" || userRole === "ASSISTANT") {
          const matchesId = Boolean(mc.teacherOrAssistantId && mc.teacherOrAssistantId === currentStaffId);
          const matchesName = Boolean(
            !mc.teacherOrAssistantId && activeStaff?.fullName && mcStaffName === activeStaff.fullName
          );
          if (!matchesId && !matchesName) return;
        } else {
          if (teacherFilter !== "ALL" && isTeacher && !mcStaffName.includes(teacherFilter)) return;
          if (assistantFilter !== "ALL" && !isTeacher && !mcStaffName.includes(assistantFilter)) return;
        }

        result.push({
          schedule: {
            id: `sch-makeup-${mc.id}`,
            dayOfWeek: ourDay,
            dayLabel: ourDay === 8 ? "Chủ Nhật" : `Thứ ${ourDay}`,
            startTime: mc.startTime,
            endTime: mc.endTime,
          },
          date,
          dateStr,
          effectiveTeacherName: isTeacher ? mc.teacherOrAssistantName : "(Trợ giảng đứng lớp)",
          effectiveAssistantName: !isTeacher ? mc.teacherOrAssistantName : "(Không có TA)",
          isSubstituted: false,
          isMakeupClass: true,
          makeupClass: mc,
        });
      });

    return result.sort((a, b) => a.schedule.startTime.localeCompare(b.schedule.startTime));
  };

  // Với Giáo viên / Trợ giảng: chỉ hiển thị những ngày và khung giờ họ thực sự có lịch dạy trong tuần
  const visibleWeekDays = isAdmin
    ? weekDays
    : weekDays.filter((day) => getSessionsForDate(day).length > 0);

  const visibleTimeSlotRows = isAdmin
    ? TIME_SLOT_ROWS
    : TIME_SLOT_ROWS.filter((slotRow) =>
        visibleWeekDays.some((day) =>
          getSessionsForDate(day).some((s) => slotRow.filter(s.schedule.startTime))
        )
      );

  // Danh sách các lớp thuộc phạm vi hiển thị ở bảng chú thích màu
  const legendClasses = useMemo(() => {
    if (isAdmin) return classes;
    if (!currentStaffId) return [];
    if (userRole === "TEACHER") {
      return classes.filter(
        (c) => c.teacherId === currentStaffId || (c.schedules || []).some((s) => s.teacherId === currentStaffId)
      );
    }
    return classes.filter(
      (c) => c.assistantId === currentStaffId || (c.schedules || []).some((s) => s.assistantId === currentStaffId)
    );
  }, [isAdmin, classes, currentStaffId, userRole]);

  // Open Direct Session Modal
  const handleOpenSessionModal = (entry: TimetableSessionEntry) => {
    setActiveSession(entry);
    setSubConflictError(null);
    setIsSubModalOpen(false);
  };

  // Open Substitute sub-dialog
  const handleOpenSubstituteDialog = () => {
    if (!isAdmin) {
      alert("Chỉ Quản trị viên (Admin) mới có quyền phân công dạy thay! Trợ giảng và Giáo viên không được phép.");
      return;
    }
    if (!activeSession) return;
    setSubTeacherId(activeSession.substitution?.subTeacherId || "");
    setSubAssistantId(activeSession.substitution?.subAssistantId || "");
    setSubReason(activeSession.substitution?.reason || "");
    setSubConflictError(null);
    setIsSubModalOpen(true);
  };

  // Handle Save Substitute with Conflict Checking
  const handleSaveSubstitute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setSubConflictError("Chỉ Quản trị viên (Admin) mới có quyền phân công dạy thay! Trợ giảng và Giáo viên không được phép.");
      return;
    }
    if (!activeSession || !activeSession.classItem) return;

    const subTeacher = teachers.find((t) => t.id === subTeacherId);
    const subAssistant = assistants.find((ta) => ta.id === subAssistantId);

    if (!subTeacher && !subAssistant) {
      setSubConflictError("Vui lòng chọn ít nhất một Giáo viên dạy thay hoặc Trợ giảng trực thay!");
      return;
    }

    // CHECK CONFLICT FOR SUBSTITUTE TEACHER
    if (subTeacher) {
      const conflict = validateSubstituteConflict(
        classes,
        substitutions,
        subTeacher.id,
        subTeacher.fullName,
        activeSession.dateStr,
        activeSession.schedule.dayOfWeek,
        activeSession.schedule.startTime,
        activeSession.schedule.endTime,
        activeSession.classItem.id
      );
      if (conflict.hasConflict) {
        setSubConflictError(conflict.message || "Giáo viên dạy thay bị trùng lịch!");
        return;
      }
    }

    // CHECK CONFLICT FOR SUBSTITUTE TA
    if (subAssistant) {
      const conflict = validateSubstituteConflict(
        classes,
        substitutions,
        subAssistant.id,
        subAssistant.fullName,
        activeSession.dateStr,
        activeSession.schedule.dayOfWeek,
        activeSession.schedule.startTime,
        activeSession.schedule.endTime,
        activeSession.classItem.id
      );
      if (conflict.hasConflict) {
        setSubConflictError(conflict.message || "Trợ giảng trực thay bị trùng ca trực!");
        return;
      }
    }

    setSubstitution({
      classId: activeSession.classItem.id,
      dateStr: activeSession.dateStr,
      subTeacherId: subTeacher ? subTeacher.id : undefined,
      subTeacherName: subTeacher ? subTeacher.fullName : undefined,
      subAssistantId: subAssistant ? subAssistant.id : undefined,
      subAssistantName: subAssistant ? subAssistant.fullName : undefined,
      reason: subReason || "Bận việc đột xuất",
    });

    setIsSubModalOpen(false);
    setActiveSession(null);
  };

  const handleCancelSubstitute = () => {
    if (!isAdmin) {
      alert("Chỉ Quản trị viên (Admin) mới có quyền hủy phân công dạy thay!");
      return;
    }
    if (!activeSession || !activeSession.classItem) return;
    removeSubstitution(activeSession.classItem.id, activeSession.dateStr);
    setIsSubModalOpen(false);
    setActiveSession(null);
  };

  return (
    <div className="space-y-3">
      {/* Top Header & Navigation Controls */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                {isAdmin
                  ? "Thời Khóa Biểu Toàn Trung Tâm"
                  : userRole === "TEACHER"
                  ? `Lịch Giảng Dạy Cá Nhân (${activeStaff?.fullName || "Giáo viên"})`
                  : `Lịch Trực Lớp Cá Nhân (${activeStaff?.fullName || "Trợ giảng"})`}
              </h3>
              <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {isAdmin ? "Phòng Ngừa Trùng Giờ 100%" : "Chỉ Hiển Thị Ngày Có Lịch Dạy"}
              </span>
            </div>
          </div>

          {/* Controls: Mode Switcher & Time Navigator */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl">
              <button
                onClick={() => setViewMode("WEEKLY")}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === "WEEKLY"
                    ? "bg-amber-500 text-slate-950 shadow font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Lịch Tuần
              </button>
              <button
                onClick={() => setViewMode("MONTHLY")}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === "MONTHLY"
                    ? "bg-amber-500 text-slate-950 shadow font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Lịch Tháng
              </button>
            </div>

            {/* Date Navigator */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl">
              <button
                onClick={viewMode === "WEEKLY" ? prevWeek : prevMonth}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white hover:bg-slate-200 flex items-center justify-center text-slate-600 shadow-sm"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-bold text-slate-800 px-2 sm:px-3 min-w-[115px] sm:min-w-[130px] text-center">
                {viewMode === "WEEKLY"
                  ? `Tuần ${weekDays[0].getDate()}/${weekDays[0].getMonth() + 1} - ${weekDays[6].getDate()}/${weekDays[6].getMonth() + 1}`
                  : `Tháng ${currentMonth + 1} / ${currentYear}`}
              </span>
              <button
                onClick={viewMode === "WEEKLY" ? nextWeek : nextMonth}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white hover:bg-slate-200 flex items-center justify-center text-slate-600 shadow-sm"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => setSelectedDate(new Date())}
              className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              Hôm nay
            </button>
          </div>
        </div>

        {/* Filter bar (Chỉ hiển thị cho Admin xem toàn trung tâm) */}
        {isAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Lọc theo Giáo viên:</label>
              <select
                value={teacherFilter}
                onChange={(e) => setTeacherFilter(e.target.value)}
                className="w-full px-2.5 py-1 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="ALL">Tất cả Giáo viên</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.fullName}>
                    {t.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Lọc theo Trợ giảng (TA):</label>
              <select
                value={assistantFilter}
                onChange={(e) => setAssistantFilter(e.target.value)}
                className="w-full px-2.5 py-1 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="ALL">Tất cả Trợ giảng</option>
                {assistants.map((ta) => (
                  <option key={ta.id} value={ta.fullName}>
                    {ta.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Legend / Bảng Chú Thích Phân Biệt Màu Sắc Các Lớp Học */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
            <Palette className="w-3 h-3 text-amber-500" />
            {isAdmin ? "Bảng màu lớp học (100% không trùng màu):" : "Các lớp bạn phụ trách:"}
          </span>
          {legendClasses.length === 0 && !isAdmin ? (
            <span className="text-[10px] text-slate-400 italic">Chưa có lớp cố định nào được phân công</span>
          ) : (
            legendClasses.map((cls) => {
              const theme = themeMap.get(cls.id) || CLASS_THEMES[0];
              return (
                <div
                  key={cls.id}
                  className="inline-flex items-center gap-1 bg-slate-50 hover:bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 text-[10px] transition shadow-2xs"
                >
                  <span className={`w-2 h-2 rounded-full ${theme.dot} shrink-0`} />
                  <span className="font-bold text-slate-900">{cls.name}</span>
                </div>
              );
            })
          )}
          <div className="inline-flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300 text-amber-950 font-bold text-[10px] shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
            <span>Có Dạy Thay</span>
          </div>
        </div>
      </div>

      {/* CẢNH BÁO XUNG ĐỘT TRÙNG LỊCH REALTIME */}
      {timetableConflicts.length > 0 && (
        <div className="bg-rose-50 border border-rose-300 rounded-2xl p-3 text-xs text-rose-950 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-rose-800 mb-1">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>⚠️ CẢNH BÁO XUNG ĐỘT TRÙNG LỊCH ({timetableConflicts.length} ca trùng trên hệ thống):</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-900 font-medium pl-1">
            {timetableConflicts.map((c) => (
              <li key={c.id}>
                <strong>{c.dayLabel} ({c.timeRange}):</strong> {c.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 1: THỜI KHÓA BIỂU THEO TUẦN (CỘT LÀ THỨ, HÀNG LÀ KHUNG GIỜ) */}
      {/* ============================================================== */}
      {viewMode === "WEEKLY" && (
        visibleWeekDays.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2 shadow-sm">
            <CalendarIcon className="w-9 h-9 text-slate-300 mx-auto" />
            <div className="font-bold text-sm text-slate-800">
              Không Có Lịch Dạy Trong Tuần Này
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Từ ngày {weekDays[0].getDate()}/{weekDays[0].getMonth() + 1} đến {weekDays[6].getDate()}/{weekDays[6].getMonth() + 1}, bạn không có ca đứng lớp hoặc ca dạy thay nào được phân công.
            </p>
          </div>
        ) : (
        <div className="space-y-2">
          {/* Mobile Quick Day Strip (Duyệt nhanh các ngày có lịch dạy) */}
          <div className="flex sm:hidden items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {visibleWeekDays.map((day) => {
              const isToday = formatDateISO(day) === realTodayStr;
              const dayLabels = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
              const dayLabel = dayLabels[day.getDay()];
              const daySessions = getSessionsForDate(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`flex-1 min-w-[50px] py-1.5 px-1 rounded-xl text-center border shrink-0 transition ${
                    isToday
                      ? "bg-amber-500 text-slate-950 font-bold border-amber-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  <div className="text-[10px] font-bold">{dayLabel}</div>
                  <div className="text-[9px] font-mono opacity-80">{day.getDate()}/{day.getMonth() + 1}</div>
                  <div className={`text-[8.5px] font-bold mt-0.5 px-1 rounded-full inline-block ${
                    isToday ? "bg-slate-950 text-amber-400" : (daySessions.length > 0 ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-500")
                  }`}>
                    {daySessions.length} ca
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className={`w-full table-fixed text-left text-xs border-collapse ${visibleWeekDays.length >= 5 ? "min-w-[740px] lg:min-w-0" : "min-w-0"}`}>
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200">
                  {/* Cột 1: Tiêu đề Khung Giờ */}
                  <th className="py-2 px-1.5 w-[90px] xl:w-[105px] font-bold text-slate-700 border-r border-slate-200 uppercase tracking-tight text-[10px] bg-slate-100/70">
                    Khung Giờ
                  </th>
                  {/* Các Ngày Có Lịch Dạy Trong Tuần */}
                  {visibleWeekDays.map((day) => {
                    const isToday = formatDateISO(day) === realTodayStr;
                    const dayLabels = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
                    const dayLabel = dayLabels[day.getDay()];
                    const daySessions = getSessionsForDate(day);

                    return (
                      <th
                        key={day.toISOString()}
                        className={`py-2 px-1.5 border-r last:border-r-0 border-slate-200 ${
                          isToday ? "bg-amber-100/60" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="truncate">
                            <div className="flex items-center gap-1">
                              <span className={`font-bold text-xs truncate ${isToday ? "text-amber-950" : "text-slate-900"}`}>
                                {dayLabel}
                              </span>
                              {isToday && (
                                <span className="text-[8px] font-bold bg-amber-500 text-slate-950 px-1 py-0.2 rounded shrink-0">
                                  Nay
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500">
                              {String(day.getDate()).padStart(2, "0")}/{String(day.getMonth() + 1).padStart(2, "0")}
                            </div>
                          </div>
                          <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                            daySessions.length > 0 ? "bg-slate-200 text-slate-800" : "text-slate-400 bg-slate-100"
                          }`}>
                            {daySessions.length} ca
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* CÁC HÀNG: THỜI GIAN THEO KHUNG GIỜ */}
                {visibleTimeSlotRows.map((slotRow) => (
                  <tr key={slotRow.id} className="hover:bg-slate-50/20 transition">
                    {/* HÀNG HEADER BÊN TRÁI: KHUNG GIỜ */}
                    <td className="py-2.5 px-2 border-r border-slate-200 bg-slate-50/70 align-top">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 text-xs">{slotRow.label}</div>
                        <div className={`font-mono text-[9.5px] font-bold px-1.5 py-0.2 rounded border inline-block ${slotRow.badge}`}>
                          {slotRow.timeRange}
                        </div>
                        <div className="text-[9px] text-slate-400 italic leading-tight">
                          {slotRow.description}
                        </div>
                      </div>
                    </td>

                    {/* Ô NỘI DUNG TƯƠNG ỨNG CÁC NGÀY HIỂN THỊ */}
                    {visibleWeekDays.map((day) => {
                      const sessions = getSessionsForDate(day).filter((s) => slotRow.filter(s.schedule.startTime));
                      const isToday = formatDateISO(day) === realTodayStr;

                      return (
                        <td
                          key={day.toISOString()}
                          className={`py-1.5 px-1 border-r last:border-r-0 border-slate-200 align-top ${
                            isToday ? "bg-amber-50/20" : ""
                          }`}
                        >
                          {sessions.length === 0 ? (
                            <div className="h-9 flex items-center justify-center text-slate-300 text-xs italic select-none">
                              —
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {sessions.map((item, idx) => {
                                if (item.isMakeupClass && item.makeupClass) {
                                  const mc = item.makeupClass;
                                  return (
                                    <div
                                      key={`makeup-${mc.id}-${idx}`}
                                      onClick={() => handleOpenSessionModal(item)}
                                      className="p-1.5 rounded-lg border border-purple-400 bg-purple-50/95 ring-2 ring-purple-300 shadow-sm transition cursor-pointer hover:shadow-md space-y-1 relative overflow-hidden"
                                    >
                                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-purple-600" />
                                      <div className="flex items-center justify-between gap-1 pl-1">
                                        <span className="text-[9.5px] font-bold font-mono px-1 py-0.2 rounded shadow-xs flex items-center gap-0.5 truncate bg-purple-600 text-white">
                                          <Clock className="w-2.5 h-2.5 shrink-0" />
                                          {mc.startTime}-{mc.endTime}
                                        </span>
                                        <span className="text-[8.5px] font-bold bg-purple-200 text-purple-950 px-1 py-0.2 rounded border border-purple-300 shrink-0">
                                          ⚡ LỚP BÙ
                                        </span>
                                      </div>

                                      <div className="font-bold text-[11px] leading-tight text-purple-950 truncate pl-1" title={mc.title}>
                                        {mc.title}
                                      </div>

                                      <div className="space-y-0.5 text-[9.5px] text-purple-900 pt-0.5 border-t border-purple-200 pl-1">
                                        <div className="flex items-center gap-1 truncate">
                                          <GraduationCap className="w-3 h-3 text-purple-700 shrink-0" />
                                          <span className="truncate font-semibold">{mc.teacherOrAssistantName} ({mc.roleInCharge === "TEACHER" ? "GV" : "TA"})</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[9px] text-purple-800">
                                          <span className="truncate">{mc.classroomName}</span>
                                          <span className="font-bold shrink-0">{mc.students.length} HS</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                const theme = item.classItem ? (themeMap.get(item.classItem.id) || CLASS_THEMES[0]) : CLASS_THEMES[0];
                                return (
                                  <div
                                    key={`${item.classItem?.id || idx}-${idx}`}
                                    onClick={() => handleOpenSessionModal(item)}
                                    className={`p-1.5 rounded-lg border transition cursor-pointer hover:shadow-md space-y-1 relative overflow-hidden ${
                                      item.isSubstituted
                                        ? "bg-amber-50/95 border-amber-400 ring-2 ring-amber-300 shadow-sm"
                                        : `${theme.weeklyBg} ${theme.weeklyBorder} hover:opacity-95 shadow-2xs`
                                    }`}
                                  >
                                    {/* Dải màu accent bên trái */}
                                    <div
                                      className={`absolute left-0 top-0 bottom-0 w-1 ${
                                        item.isSubstituted ? "bg-amber-500" : theme.dot
                                      }`}
                                    />

                                    {/* Header: Giờ học & Mã lớp */}
                                    <div className="flex items-center justify-between gap-1 pl-1">
                                      <span
                                        className={`text-[9.5px] font-bold font-mono px-1 py-0.2 rounded shadow-xs flex items-center gap-0.5 truncate ${
                                          item.isSubstituted
                                            ? "bg-amber-500 text-slate-950 font-bold"
                                            : theme.weeklyTimeBg
                                        }`}
                                      >
                                        <Clock className="w-2.5 h-2.5 shrink-0" />
                                        {item.schedule.startTime}-{item.schedule.endTime}
                                      </span>
                                    </div>

                                    {/* Tên lớp */}
                                    <div
                                      className={`font-bold text-[11px] leading-tight truncate pl-1 ${
                                        item.isSubstituted ? "text-amber-950" : theme.weeklyHeader
                                      }`}
                                      title={item.classItem?.name}
                                    >
                                      {item.classItem?.name}
                                    </div>

                                    {/* Nhãn dạy thay nếu có */}
                                    {item.isSubstituted && (
                                      <div className="bg-amber-500 text-slate-950 font-bold px-1.5 py-0.2 rounded text-[8.5px] flex items-center gap-1 shadow-xs ml-1">
                                        <AlertTriangle className="w-2.5 h-2.5 text-slate-950 shrink-0" /> DẠY THAY
                                      </div>
                                    )}

                                    {/* Giáo viên & Trợ giảng */}
                                    <div className="space-y-0.5 text-[9.5px] text-slate-700 pt-0.5 border-t border-slate-200/60 pl-1">
                                      <div className="flex items-center gap-1 truncate" title={item.isSubstituted && item.substitution?.subTeacherName ? `${item.substitution.subTeacherName} (Dạy thay)` : item.classItem?.teacherName}>
                                        <GraduationCap className="w-3 h-3 text-amber-600 shrink-0" />
                                        <span className="truncate">
                                          {item.isSubstituted && item.substitution?.subTeacherName ? (
                                            <span className="text-amber-900 font-bold">
                                              {item.substitution.subTeacherName}*
                                            </span>
                                          ) : (
                                            <span className="font-semibold text-slate-800">
                                              {item.schedule?.teacherName || item.classItem?.teacherName}
                                            </span>
                                          )}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1 truncate" title={item.isSubstituted && item.substitution?.subAssistantName ? `${item.substitution.subAssistantName} (Trực thay)` : (item.schedule?.assistantName || item.classItem?.assistantName)}>
                                        <UserCheck className="w-3 h-3 text-blue-600 shrink-0" />
                                        <span className="truncate">
                                          {item.isSubstituted && item.substitution?.subAssistantName ? (
                                            <span className="text-blue-900 font-bold">
                                              {item.substitution.subAssistantName}*
                                            </span>
                                          ) : (
                                            <span className="font-semibold text-slate-800">
                                              {item.schedule?.assistantName || item.classItem?.assistantName}
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Phòng học & Sĩ số */}
                                    <div className="flex items-center justify-between text-[9px] text-slate-600 pt-0.5 border-t border-slate-200/60 pl-1">
                                      <span className="font-medium truncate flex items-center gap-0.5" title={item.schedule.classroom || item.classItem?.classroom}>
                                        <DoorOpen className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                        <span className="truncate">{item.schedule.classroom || item.classItem?.classroom}</span>
                                      </span>
                                      <span className="font-semibold text-emerald-800 bg-white/90 px-1 py-0.2 rounded border border-emerald-200 shrink-0">
                                        {item.classItem?.currentStudents} HS
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
        )
      )}

      {/* ============================================================== */}
      {/* VIEW 2: THỜI KHÓA BIỂU THEO THÁNG (MONTHLY VIEW) */}
      {/* ============================================================== */}
      {viewMode === "MONTHLY" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-amber-500" />
              {isAdmin
                ? `Lịch Vận Hành Tháng ${currentMonth + 1}/${currentYear}`
                : `Các Ngày Có Lịch Dạy Tháng ${currentMonth + 1}/${currentYear}`}
            </span>
          </div>

          {!isAdmin ? (
            (() => {
              const dayNames = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
              const teachingDays = Array.from({ length: daysInMonth }, (_, i) => {
                const date = new Date(currentYear, currentMonth, i + 1);
                return { dayNum: i + 1, date, sessions: getSessionsForDate(date) };
              }).filter((d) => d.sessions.length > 0);

              if (teachingDays.length === 0) {
                return (
                  <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                    Tháng {currentMonth + 1}/{currentYear} bạn không có ca đứng lớp hoặc dạy thay nào được phân công.
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                  {teachingDays.map(({ dayNum, date, sessions }) => {
                    const isToday = formatDateISO(date) === realTodayStr;
                    return (
                      <div
                        key={`staff-day-${dayNum}`}
                        className={`p-3 rounded-xl border space-y-2 transition ${
                          isToday
                            ? "bg-amber-50/60 border-amber-400 ring-1 ring-amber-300"
                            : "bg-slate-50/40 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-slate-200/70 pb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold text-xs ${isToday ? "text-amber-900" : "text-slate-900"}`}>
                              {dayNames[date.getDay()]}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                              {String(dayNum).padStart(2, "0")}/{String(currentMonth + 1).padStart(2, "0")}
                            </span>
                            {isToday && (
                              <span className="text-[9px] font-bold bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded">
                                Hôm nay
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                            {sessions.length} ca
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {sessions.map((s, idx) => {
                            if (s.isMakeupClass && s.makeupClass) {
                              const mc = s.makeupClass;
                              return (
                                <div
                                  key={`m-mc-${mc.id}-${idx}`}
                                  onClick={() => handleOpenSessionModal(s)}
                                  className="p-2 rounded-lg text-xs font-bold cursor-pointer transition bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-between gap-2"
                                >
                                  <span className="truncate">
                                    ⚡ BÙ • {mc.startTime}-{mc.endTime} • {mc.title}
                                  </span>
                                  <span className="text-[10px] bg-purple-800 px-1.5 py-0.5 rounded shrink-0">
                                    {(mc.students || []).length} HS
                                  </span>
                                </div>
                              );
                            }

                            const theme = s.classItem ? (themeMap.get(s.classItem.id) || CLASS_THEMES[0]) : CLASS_THEMES[0];
                            return (
                              <div
                                key={idx}
                                onClick={() => handleOpenSessionModal(s)}
                                className={`p-2 rounded-lg text-xs cursor-pointer transition border ${
                                  s.isSubstituted
                                    ? "bg-amber-100 border-amber-400 text-amber-950"
                                    : `${theme.weeklyBg} ${theme.weeklyBorder} text-slate-900`
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 font-bold">
                                  <span className="truncate">{s.classItem?.name}</span>
                                  <span className="font-mono text-[11px] shrink-0">
                                    {s.schedule.startTime}-{s.schedule.endTime}
                                  </span>
                                </div>
                                <div className="text-[10.5px] text-slate-600 flex items-center justify-between mt-0.5">
                                  <span className="truncate">{s.schedule.classroom || s.classItem?.classroom}</span>
                                  {s.isSubstituted && (
                                    <span className="text-[9px] font-bold bg-amber-500 text-slate-950 px-1.5 rounded">
                                      Dạy thay
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          ) : (
            /* Admin Full Center Month Grid */
            <div className="overflow-x-auto scrollbar-thin">
              <div className="grid grid-cols-7 gap-1 text-center text-xs min-w-[700px] sm:min-w-full">
              {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((dayName) => (
                <div key={dayName} className="font-bold text-slate-500 py-2 bg-slate-50 rounded-lg">
                  {dayName}
                </div>
              ))}

              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[110px] p-1 bg-slate-50/40 rounded-lg border border-transparent" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const date = new Date(currentYear, currentMonth, dayNum);
                const sessions = getSessionsForDate(date);
                const isToday = formatDateISO(date) === realTodayStr;

                return (
                  <div
                    key={`day-${dayNum}`}
                    className={`min-h-[115px] p-1.5 rounded-xl border text-left flex flex-col justify-between transition ${
                      isToday ? "bg-amber-50/50 border-amber-400 ring-1 ring-amber-300" : "bg-white border-slate-100 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isToday ? "text-amber-800" : "text-slate-800"}`}>
                        {dayNum}
                      </span>
                      {sessions.length > 0 && (
                        <span className="text-[9px] font-bold text-slate-400">
                          {sessions.length} ca
                        </span>
                      )}
                    </div>

                    {/* Pills for sessions - Direct click opens Session Detail! */}
                    <div className="space-y-1 my-1 flex-1">
                      {sessions.map((s, idx) => {
                        if (s.isMakeupClass && s.makeupClass) {
                          const mc = s.makeupClass;
                          return (
                            <div
                              key={`m-mc-${mc.id}-${idx}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenSessionModal(s);
                              }}
                              className="text-[9.5px] px-1.5 py-1 rounded-md truncate font-bold cursor-pointer transition shadow-2xs hover:scale-[1.03] active:scale-95 flex items-center justify-between gap-1 bg-purple-600 hover:bg-purple-700 text-white border border-purple-500 ring-1 ring-purple-300"
                              title={`Xem chi tiết lớp học bù: ${mc.title} (${mc.startTime} - ${mc.endTime})`}
                            >
                              <span className="truncate flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-300 shrink-0" />
                                <span>{mc.startTime}</span>
                                <span className="opacity-75">•</span>
                                <span className="font-mono text-amber-200">⚡ BÙ</span>
                              </span>
                              <span className="text-[8px] bg-purple-800 text-purple-100 font-semibold px-1 rounded shrink-0">
                                {(mc.students || []).length} HS
                              </span>
                            </div>
                          );
                        }

                        const theme = s.classItem ? (themeMap.get(s.classItem.id) || CLASS_THEMES[0]) : CLASS_THEMES[0];
                        return (
                          <div
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenSessionModal(s);
                            }}
                            className={`text-[9.5px] px-1.5 py-1 rounded-md truncate font-bold cursor-pointer transition shadow-2xs hover:scale-[1.03] active:scale-95 flex items-center justify-between gap-1 ${
                              s.isSubstituted
                                ? "bg-amber-400 text-slate-950 font-bold border border-amber-500 ring-1 ring-amber-300"
                                : theme.monthlyPillBg
                            }`}
                            title={`Xem chi tiết ca học: ${s.classItem?.name} (${s.schedule.startTime} - ${s.schedule.endTime})`}
                          >
                            <span className="truncate flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                              <span>{s.schedule.startTime}</span>
                              <span className="opacity-75">•</span>
                              <span className="truncate">{s.classItem?.name}</span>
                            </span>
                            {s.isSubstituted && (
                              <span className="text-[8px] bg-slate-950 text-amber-300 font-bold px-1 rounded shadow-xs shrink-0">
                                Dạy thay
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="text-[8px] text-slate-300 text-right">
                      Shiny English
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL TRUY CẬP TRỰC TIẾP THÔNG TIN BUỔI HỌC (SESSION DETAIL MODAL) */}
      {/* ============================================================== */}
      {activeSession && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {activeSession.isMakeupClass && activeSession.makeupClass ? (
              // MAKEUP CLASS MODAL
              <>
                <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-300 flex items-center gap-1 w-fit">
                      <Sparkles className="w-3 h-3 text-purple-600" /> Lớp Học Bù Trong Tháng
                    </span>
                    <h3 className="font-bold text-base text-purple-950 mt-1">{activeSession.makeupClass.title}</h3>
                    <p className="text-xs text-slate-500">
                      {activeSession.makeupClass.targetClassName ? `Dành riêng cho: ${activeSession.makeupClass.targetClassName}` : "Ghép liên lớp (Toàn trung tâm)"}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveSession(null)}
                    className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 bg-purple-50/60 rounded-xl border border-purple-200 space-y-1">
                    <span className="text-purple-700 text-[11px] block font-medium">Thời gian học bù:</span>
                    <div className="font-bold text-purple-950 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-purple-600" />
                      {activeSession.makeupClass.startTime} - {activeSession.makeupClass.endTime}
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      {activeSession.schedule.dayLabel}, ngày {activeSession.date.getDate()}/{activeSession.date.getMonth() + 1}/{activeSession.date.getFullYear()} ({activeSession.makeupClass.durationHours}h)
                    </div>
                  </div>

                  <div className="p-2.5 bg-purple-50/60 rounded-xl border border-purple-200 space-y-1">
                    <span className="text-purple-700 text-[11px] block font-medium">Phòng học & Sĩ số:</span>
                    <div className="font-bold text-purple-950 flex items-center gap-1.5">
                      <DoorOpen className="w-3.5 h-3.5 text-purple-600" />
                      {activeSession.makeupClass.classroomName}
                    </div>
                    <div className="text-purple-800 font-semibold text-[11px]">
                      {activeSession.makeupClass.students.length} học sinh đăng ký
                    </div>
                  </div>

                  <div className="col-span-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-slate-500 text-[11px] block font-medium">Nhân sự phụ trách:</span>
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-purple-600" />
                        <span>{activeSession.makeupClass.teacherOrAssistantName}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                          {activeSession.makeupClass.roleInCharge === "TEACHER" ? "Giáo viên chính" : "Trợ giảng"}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeSession.makeupClass.isSalaryRecorded ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-amber-100 text-amber-800"}`}>
                        {activeSession.makeupClass.isSalaryRecorded ? "✓ Đã tính lương" : "Chưa tính lương"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-purple-50/40 rounded-xl border border-purple-200 space-y-1 text-xs">
                  <div className="font-bold text-purple-900">Trọng tâm ôn tập buổi bù:</div>
                  <div className="text-slate-700 text-xs">{activeSession.makeupClass.focusContent}</div>
                </div>

                <div className="space-y-2">
                  <div className="font-bold text-xs text-slate-800 flex items-center justify-between">
                    <span>Danh sách học sinh học bù ({activeSession.makeupClass.students.length})</span>
                  </div>
                  {activeSession.makeupClass.students.length === 0 ? (
                    <div className="text-xs text-slate-400 italic py-2 text-center bg-slate-50 rounded-lg">
                      Chưa có học sinh nào được add vào ca bù này.
                    </div>
                  ) : (
                    <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-slate-100 border border-slate-200 rounded-lg p-2">
                      {activeSession.makeupClass.students.map((st, i) => (
                        <div key={st.studentId + i} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-slate-900">{st.studentName}</div>
                            <div className="text-[10.5px] text-slate-500">{st.originalClassName} • Vắng ngày {st.absentDateStr}</div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            st.attendanceStatus === "ATTENDED"
                              ? "bg-emerald-100 text-emerald-800"
                              : st.attendanceStatus === "ABSENT"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            {st.attendanceStatus === "ATTENDED" ? "Có mặt" : st.attendanceStatus === "ABSENT" ? "Vắng bù" : "Đã đăng ký"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                  <button
                    onClick={() => setActiveSession(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-medium text-xs hover:bg-slate-200 transition"
                  >
                    Đóng
                  </button>
                </div>
              </>
            ) : activeSession.classItem ? (
              // REGULAR CLASS DETAIL
              <>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">{activeSession.classItem.name}</h3>
                    <p className="text-xs text-slate-500">{activeSession.classItem.courseName}</p>
                  </div>
                  <button
                    onClick={() => setActiveSession(null)}
                    className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Substitution Highlight Banner */}
                {activeSession.isSubstituted && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-1 text-amber-950">
                    <div className="font-bold flex items-center gap-1.5 text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-600" /> CA HỌC ĐANG CÓ NHÂN SỰ DẠY THAY
                    </div>
                    {activeSession.substitution?.subTeacherName && (
                      <div>• Giáo viên dạy thay: <span className="font-bold text-amber-900">{activeSession.substitution.subTeacherName}</span></div>
                    )}
                    {activeSession.substitution?.subAssistantName && (
                      <div>• Trợ giảng trực thay: <span className="font-bold text-blue-900">{activeSession.substitution.subAssistantName}</span></div>
                    )}
                    <div className="text-slate-600 italic text-[11px]">
                      Lý do: {activeSession.substitution?.reason}
                    </div>
                  </div>
                )}

                {/* Session Info Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-slate-400 text-[11px] block">Thời gian ca học:</span>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      {activeSession.schedule.startTime} - {activeSession.schedule.endTime}
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      {activeSession.schedule.dayLabel}, ngày {activeSession.date.getDate()}/{activeSession.date.getMonth() + 1}/{activeSession.date.getFullYear()}
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-slate-400 text-[11px] block">Phòng học:</span>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <DoorOpen className="w-3.5 h-3.5 text-amber-500" />
                      {activeSession.schedule.classroom || activeSession.classItem.classroom}
                    </div>
                    <div className="text-emerald-700 font-semibold text-[11px]">
                      Sĩ số: {activeSession.classItem.currentStudents} học sinh
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-slate-400 text-[11px] block">Giáo viên phụ trách:</span>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-amber-500" />
                      {activeSession.effectiveTeacherName}
                    </div>
                    {activeSession.isSubstituted && (
                      <span className="text-[10px] text-slate-400 block">
                        (Gốc: {activeSession.schedule?.teacherName || activeSession.classItem.teacherName})
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-slate-400 text-[11px] block">Trợ giảng phụ trách:</span>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                      {activeSession.effectiveAssistantName}
                    </div>
                    {activeSession.isSubstituted && (
                      <span className="text-[10px] text-slate-400 block">
                        (Gốc: {activeSession.schedule?.assistantName || activeSession.classItem.assistantName})
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons inside Session Modal */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  {isAdmin && activeSession.isSubstituted ? (
                    <button
                      type="button"
                      onClick={handleCancelSubstitute}
                      className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition"
                    >
                      Hủy Phân Công Dạy Thay
                    </button>
                  ) : !isAdmin && activeSession.isSubstituted ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-900 font-medium bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                      <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Phân công dạy thay do Admin thiết lập (Chỉ xem)</span>
                    </div>
                  ) : <div />}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveSession(null)}
                      className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-medium text-xs hover:bg-slate-200 transition"
                    >
                      Đóng
                    </button>
                    {isAdmin ? (
                      <button
                        onClick={handleOpenSubstituteDialog}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold text-xs shadow hover:opacity-95 transition flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {activeSession.isSubstituted ? "Đổi Người Dạy Thay Khác" : "Phân Công Dạy Thay"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-MODAL PHÂN CÔNG DẠY THAY CÓ CHECK TRÙNG LỊCH */}
      {/* ============================================================== */}
      {isAdmin && isSubModalOpen && activeSession && activeSession.classItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-amber-500" /> Phân Công Dạy Thay Cho Ca Học
                </h3>
                <p className="text-xs text-slate-500">
                  {activeSession.classItem.name} • {activeSession.schedule.startTime} - {activeSession.schedule.endTime}
                </p>
              </div>
              <button
                onClick={() => setIsSubModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conflict Alert Banner */}
            {subConflictError && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-xs text-red-900 space-y-1">
                <div className="font-bold flex items-center gap-1 text-red-700">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> TRÙNG LỊCH:
                </div>
                <div>{subConflictError}</div>
              </div>
            )}

            <form onSubmit={handleSaveSubstitute} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Chọn Giáo Viên Dạy Thay Cho Ca Này
                </label>
                <select
                  value={subTeacherId}
                  onChange={(e) => {
                    setSubConflictError(null);
                    setSubTeacherId(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="">-- Giữ nguyên ({activeSession.schedule?.teacherName || activeSession.classItem.teacherName}) --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.specialty})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Chọn Trợ Giảng Trực Thay Cho Ca Này
                </label>
                <select
                  value={subAssistantId}
                  onChange={(e) => {
                    setSubConflictError(null);
                    setSubAssistantId(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="">-- Giữ nguyên ({activeSession.schedule?.assistantName || activeSession.classItem.assistantName}) --</option>
                  {assistants.map((ta) => (
                    <option key={ta.id} value={ta.id}>
                      {ta.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Lý do xin nghỉ / phân công dạy thay *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="VD: Giáo viên bận việc đột xuất, công tác chuyên môn..."
                  value={subReason}
                  onChange={(e) => setSubReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold shadow hover:opacity-95 transition"
                >
                  Xác Nhận Phân Công
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
