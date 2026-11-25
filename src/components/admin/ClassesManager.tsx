"use client";

import { useState, useMemo } from "react";
import { useCenter } from "@/context/CenterContext";
import { ScheduleSlot, ClassItem, CLASS_THEMES, buildClassThemeMap } from "@/data/centerData";
import { validateClassSchedules } from "@/utils/conflictChecker";
import { 
  Plus, 
  Search, 
  Users, 
  GraduationCap, 
  UserCheck, 
  Clock, 
  DoorOpen, 
  X,
  Trash2,
  CalendarDays,
  Coins,
  Edit3,
  AlertTriangle,
  Palette,
  QrCode,
  ExternalLink,
  Copy,
  CheckCircle2
} from "lucide-react";


const DAY_OPTIONS = [
  { value: 2, label: "Thứ 2" },
  { value: 3, label: "Thứ 3" },
  { value: 4, label: "Thứ 4" },
  { value: 5, label: "Thứ 5" },
  { value: 6, label: "Thứ 6" },
  { value: 7, label: "Thứ 7" },
  { value: 8, label: "Chủ Nhật" },
];

export default function ClassesManager() {
  const { classes, courses, staff, classrooms, students, makeupClasses, addClass, updateClass, deleteClass } = useCenter();
  const themeMap = useMemo(() => buildClassThemeMap(classes), [classes]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [viewingStudentsClass, setViewingStudentsClass] = useState<ClassItem | null>(null);
  const [isPerScheduleStaff, setIsPerScheduleStaff] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Class Form State
  const [formData, setFormData] = useState({
    name: "",
    courseId: courses[0]?.id || "",
    classroom: classrooms[0]?.name || "Phòng Shiny 201",
    teacherId: staff.find(s => s.role === "TEACHER")?.id || "",
    assistantId: staff.find(s => s.role === "ASSISTANT")?.id || "",
    feePerLesson: courses[0]?.standardFeePerLesson || 200000,
    colorTheme: "blue",
    zaloGroupUrl: "",
  });

  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([
    { id: "slot-1", dayOfWeek: 3, dayLabel: "Thứ 3", startTime: "19:00", endTime: "20:30" },
    { id: "slot-2", dayOfWeek: 5, dayLabel: "Thứ 5", startTime: "17:00", endTime: "18:30" },
  ]);

  const teachers = staff.filter(s => s.role === "TEACHER");
  const assistants = staff.filter(s => s.role === "ASSISTANT");

  const filteredClasses = classes.filter(cls => {
    const q = searchQuery.toLowerCase();
    return (
      cls.name.toLowerCase().includes(q) ||
      (cls.code || "").toLowerCase().includes(q) ||
      cls.teacherName.toLowerCase().includes(q) ||
      cls.assistantName.toLowerCase().includes(q) ||
      cls.classroom.toLowerCase().includes(q) ||
      cls.schedules.some((s) => (s.classroom || "").toLowerCase().includes(q))
    );
  });

  const handleOpenCreate = () => {
    setEditingClassId(null);
    setConflictError(null);
    setIsPerScheduleStaff(false);
    const usedColors = new Set(classes.map((c) => c.colorTheme));
    const unusedTheme = CLASS_THEMES.find((t) => !usedColors.has(t.id)) || CLASS_THEMES[classes.length % CLASS_THEMES.length];
    const defaultTeacherId = staff.find(s => s.role === "TEACHER")?.id || "";
    const defaultAssistantId = staff.find(s => s.role === "ASSISTANT")?.id || "";
    const defaultClassroom = classrooms[0]?.name || "Phòng Shiny 201";

    setFormData({
      name: "",
      courseId: courses[0]?.id || "",
      classroom: defaultClassroom,
      teacherId: defaultTeacherId,
      assistantId: defaultAssistantId,
      feePerLesson: courses[0]?.standardFeePerLesson || (courses[0]?.monthlyFee ? Math.round(courses[0].monthlyFee / 8) : 200000),
      colorTheme: unusedTheme.id,
      zaloGroupUrl: "",
    });
    setScheduleSlots([
      { 
        id: "slot-1", 
        dayOfWeek: 3, 
        dayLabel: "Thứ 3", 
        startTime: "19:00", 
        endTime: "20:30",
        teacherId: defaultTeacherId,
        assistantId: defaultAssistantId,
        classroom: defaultClassroom
      },
      { 
        id: "slot-2", 
        dayOfWeek: 5, 
        dayLabel: "Thứ 5", 
        startTime: "17:00", 
        endTime: "18:30",
        teacherId: defaultTeacherId,
        assistantId: defaultAssistantId,
        classroom: defaultClassroom
      },
    ]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cls: ClassItem) => {
    setEditingClassId(cls.id);
    setConflictError(null);
    const hasPerSchedule = cls.schedules.some(
      (s) => (s.teacherId && s.teacherId !== cls.teacherId) || (s.assistantId && s.assistantId !== cls.assistantId)
    );
    setIsPerScheduleStaff(hasPerSchedule);

    setFormData({
      name: cls.name,
      courseId: cls.courseId,
      classroom: cls.classroom,
      teacherId: cls.teacherId,
      assistantId: cls.assistantId,
      feePerLesson: cls.feePerLesson || (cls.monthlyFee ? Math.round(cls.monthlyFee / 8) : 200000),
      colorTheme: cls.colorTheme || "blue",
      zaloGroupUrl: cls.zaloGroupUrl || "",
    });
    setScheduleSlots(
      cls.schedules.length > 0 
        ? cls.schedules.map(s => ({
            ...s,
            teacherId: s.teacherId || cls.teacherId,
            assistantId: s.assistantId || cls.assistantId,
            classroom: s.classroom || cls.classroom,
          }))
        : [
            { 
              id: "slot-1", 
              dayOfWeek: 2, 
              dayLabel: "Thứ 2", 
              startTime: "18:00", 
              endTime: "19:30",
              teacherId: cls.teacherId,
              assistantId: cls.assistantId,
              classroom: cls.classroom
            }
          ]
    );
    setIsModalOpen(true);
  };

  const handleAddSlot = () => {
    const nextSlot: ScheduleSlot = {
      id: `slot-${Date.now()}`,
      dayOfWeek: 2,
      dayLabel: "Thứ 2",
      startTime: "18:00",
      endTime: "19:30",
      teacherId: formData.teacherId,
      teacherName: teachers.find(t => t.id === formData.teacherId)?.fullName,
      assistantId: formData.assistantId,
      assistantName: assistants.find(ta => ta.id === formData.assistantId)?.fullName,
      classroom: formData.classroom,
    };
    setScheduleSlots([...scheduleSlots, nextSlot]);
  };

  const handleRemoveSlot = (id: string) => {
    if (scheduleSlots.length <= 1) return;
    setScheduleSlots(scheduleSlots.filter(s => s.id !== id));
  };

  const handleUpdateSlot = (id: string, field: keyof ScheduleSlot, value: any) => {
    setScheduleSlots(scheduleSlots.map(s => {
      if (s.id !== id) return s;
      if (field === "dayOfWeek") {
        const option = DAY_OPTIONS.find(d => d.value === Number(value));
        return { ...s, dayOfWeek: Number(value), dayLabel: option ? option.label : "Thứ" };
      }
      return { ...s, [field]: value };
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    // KIỂM TRA TRÙNG MÀU LỚP HỌC TRÊN TKB
    const duplicateColorClass = classes.find(
      (c) => c.colorTheme === formData.colorTheme && c.id !== editingClassId
    );
    if (duplicateColorClass) {
      setConflictError(`Màu nhận diện này đã được sử dụng cho lớp "${duplicateColorClass.name}". Để Thời Khóa Biểu rõ ràng và không bị nhầm lẫn, mỗi lớp học bắt buộc phải có một màu sắc riêng biệt!`);
      return;
    }

    const selectedCourse = courses.find(c => c.id === formData.courseId);
    const selectedTeacher = staff.find(s => s.id === formData.teacherId);
    const selectedAssistant = staff.find(s => s.id === formData.assistantId);

    // Chuẩn hóa danh sách schedules theo chế độ phân công (luôn giữ phòng học riêng theo từng buổi)
    const normalizedSchedules: ScheduleSlot[] = scheduleSlots.map((slot) => {
      const slotClassroom = slot.classroom || formData.classroom || classrooms[0]?.name || "";
      if (!isPerScheduleStaff) {
        return {
          id: slot.id,
          dayOfWeek: slot.dayOfWeek,
          dayLabel: slot.dayLabel,
          startTime: slot.startTime,
          endTime: slot.endTime,
          teacherId: formData.teacherId,
          teacherName: selectedTeacher ? selectedTeacher.fullName : "Chưa phân công",
          assistantId: formData.assistantId,
          assistantName: selectedAssistant ? selectedAssistant.fullName : "Chưa phân công",
          classroom: slotClassroom,
        };
      }

      const slotTeacher = staff.find((s) => s.id === slot.teacherId) || selectedTeacher;
      const slotAssistant = staff.find((s) => s.id === slot.assistantId) || selectedAssistant;
      return {
        id: slot.id,
        dayOfWeek: slot.dayOfWeek,
        dayLabel: slot.dayLabel,
        startTime: slot.startTime,
        endTime: slot.endTime,
        teacherId: slotTeacher ? slotTeacher.id : formData.teacherId,
        teacherName: slotTeacher ? slotTeacher.fullName : "Chưa phân công",
        assistantId: slotAssistant ? slotAssistant.id : formData.assistantId,
        assistantName: slotAssistant ? slotAssistant.fullName : "Chưa phân công",
        classroom: slotClassroom,
      };
    });

    // KIỂM TRA XUNG ĐỘT TRÙNG LỊCH (GV, TA, PHÒNG HỌC & LỚP BÙ)
    const conflict = validateClassSchedules(
      classes,
      editingClassId,
      normalizedSchedules,
      formData.teacherId,
      formData.assistantId,
      formData.classroom,
      makeupClasses
    );

    if (conflict.hasConflict) {
      setConflictError(conflict.message || "Phát hiện trùng lịch! Vui lòng kiểm tra lại khung giờ hoặc phòng học.");
      return;
    }

    const feePerLesson = Math.max(0, Number(formData.feePerLesson) || 0);
    const defaultRoom = normalizedSchedules[0]?.classroom || formData.classroom || classrooms[0]?.name || "";

    const payload = {
      name: formData.name,
      courseId: formData.courseId,
      courseName: selectedCourse ? selectedCourse.name : "Khóa học chuẩn",
      classroom: defaultRoom,
      teacherId: formData.teacherId,
      teacherName: selectedTeacher ? selectedTeacher.fullName : "Chưa phân công",
      assistantId: formData.assistantId,
      assistantName: selectedAssistant ? selectedAssistant.fullName : "Chưa phân công",
      schedules: normalizedSchedules,
      feePerLesson,
      monthlyFee: feePerLesson * 8,
      colorTheme: formData.colorTheme,
      zaloGroupUrl: formData.zaloGroupUrl?.trim() || undefined,
    };

    if (editingClassId) {
      updateClass(editingClassId, payload);
    } else {
      addClass(payload);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Top action toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên lớp, giáo viên, phòng học..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-amber-500/10 transition"
        >
          <Plus className="w-4 h-4" /> Thêm Lớp Học Mới
        </button>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile Card View (< md) */}
      <div className="md:hidden space-y-2.5">
        {filteredClasses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-400 text-xs italic">
            Chưa có lớp học nào trong danh sách. Bấm &quot;+ Thêm Lớp Mới&quot; để tạo lớp học.
          </div>
        ) : (
          filteredClasses.map((cls) => {
            const theme = themeMap.get(cls.id) || CLASS_THEMES[0];
            const feePerLesson =
              cls.feePerLesson || (cls.monthlyFee ? Math.round(cls.monthlyFee / 8) : 200000);
            return (
              <div key={cls.id} className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${theme.dot} shrink-0`} />
                      <span className="font-bold text-sm text-slate-900">{cls.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{cls.courseName}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(cls)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-amber-100 rounded-lg transition flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" /> Sửa
                    </button>
                    {deleteConfirmId === cls.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            deleteClass(cls.id);
                            setDeleteConfirmId(null);
                          }}
                          className="px-2 py-1 bg-red-600 text-white rounded-lg text-[11px] font-semibold"
                        >
                          Xóa
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 bg-slate-200 text-slate-700 rounded-lg text-[11px]"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(cls.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Xóa lớp học"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {cls.schedules.map((sch) => (
                    <span key={sch.id} className="inline-flex items-center gap-1 text-[11px] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
                      <strong className="text-slate-700">{sch.dayLabel}</strong>
                      <span className="font-mono text-slate-600">{sch.startTime}-{sch.endTime}</span>
                      <span className="text-amber-700 font-medium">({sch.classroom || cls.classroom})</span>
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block">Giáo viên / TA:</span>
                    <span className="font-semibold text-slate-800">{cls.teacherName} / {cls.assistantName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block">Học phí / buổi:</span>
                    <span className="font-bold text-amber-600 font-mono">{feePerLesson.toLocaleString("vi-VN")} đ</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <button
                    onClick={() => setViewingStudentsClass(cls)}
                    className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 text-[11px]"
                  >
                    <Users className="w-3 h-3 text-emerald-600" />
                    <span>{cls.currentStudents} HS</span>
                  </button>
                  {cls.zaloGroupUrl ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(cls.zaloGroupUrl || "");
                          setToastMessage(`📋 Đã sao chép link Nhóm Zalo lớp ${cls.name}!`);
                          setTimeout(() => setToastMessage(null), 3000);
                        }}
                        className="px-2 py-1 text-[11px] font-semibold bg-blue-50 text-blue-700 rounded-lg border border-blue-200 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Link Zalo
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cls)}
                      className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 font-semibold"
                    >
                      + Cài link Zalo
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View (>= md) Fit 100% Scale */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10.5px]">
              <tr>
                <th className="py-3 px-3">Lớp Học</th>
                <th className="py-3 px-2.5">Chương Trình</th>
                <th className="py-3 px-2.5">Lịch Học</th>
                <th className="py-3 px-2.5">GV &amp; TA</th>
                <th className="py-3 px-2.5 whitespace-nowrap">Nhóm Zalo</th>
                <th className="py-3 px-2.5">Phòng Học</th>
                <th className="py-3 px-2 text-center whitespace-nowrap">Sĩ Số</th>
                <th className="py-3 px-2.5 whitespace-nowrap">HP / Buổi</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 text-xs italic">
                    Chưa có lớp học nào trong danh sách. Bấm &quot;+ Thêm Lớp Mới&quot; để tạo lớp học.
                  </td>
                </tr>
              ) : (
                filteredClasses.map((cls) => {
                const theme = themeMap.get(cls.id) || CLASS_THEMES[0];
                return (
                  <tr key={cls.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${theme.dot} shrink-0`} />
                        <div className="font-bold text-slate-900">{cls.name}</div>
                      </div>
                    </td>

                    <td className="py-2.5 px-2.5 text-slate-600 font-medium">
                      {cls.courseName}
                    </td>

                    <td className="py-2.5 px-2.5">
                      <div className="space-y-1">
                        {cls.schedules.map((sch) => (
                          <div key={sch.id} className="flex items-center gap-1 text-[11px] whitespace-nowrap">
                            <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                              {sch.dayLabel}
                            </span>
                            <span className="font-mono text-slate-600">
                              {sch.startTime}-{sch.endTime}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="py-2.5 px-2.5">
                      {cls.schedules.some((s) => (s.teacherId && s.teacherId !== cls.teacherId) || (s.assistantId && s.assistantId !== cls.assistantId)) ? (
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-100/80 border border-amber-200 px-1.5 py-0.5 rounded-md inline-block">
                            ⚡ Theo buổi
                          </span>
                          {cls.schedules.map((sch) => {
                            const slotTeacher = sch.teacherName || cls.teacherName;
                            const slotAssistant = sch.assistantName || cls.assistantName;
                            return (
                              <div key={sch.id} className="text-[10.5px] bg-slate-50 p-1 rounded-lg border border-slate-100">
                                <span className="font-bold text-slate-800">{sch.dayLabel}:</span>
                                <div className="flex items-center gap-1 text-slate-700 truncate max-w-[130px]" title={`GV: ${slotTeacher}`}>
                                  <GraduationCap className="w-3 h-3 text-amber-500 shrink-0" />
                                  <span className="font-medium truncate">{slotTeacher}</span>
                                </div>
                                <div className="flex items-center gap-1 text-slate-600 text-[10px] truncate max-w-[130px]" title={`TA: ${slotAssistant}`}>
                                  <UserCheck className="w-3 h-3 text-blue-500 shrink-0" />
                                  <span className="truncate">{slotAssistant}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-slate-900 font-semibold">
                            <GraduationCap className="w-3 h-3 text-amber-500 shrink-0" />
                            <span className="truncate max-w-[130px]">{cls.teacherName}</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-600 text-[11px]">
                            <UserCheck className="w-3 h-3 text-blue-500 shrink-0" />
                            <span className="truncate max-w-[130px]">{cls.assistantName}</span>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Nhóm Zalo Lớp */}
                    <td className="py-2.5 px-2.5 whitespace-nowrap">
                      {cls.zaloGroupUrl ? (
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[11px] text-blue-900 font-semibold truncate max-w-[105px]" title={cls.zaloGroupUrl}>
                            {cls.zaloGroupUrl.replace(/^https?:\/\//, "")}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(cls.zaloGroupUrl || "");
                              setToastMessage(`📋 Đã sao chép link Nhóm Zalo lớp ${cls.name}!`);
                              setTimeout(() => setToastMessage(null), 3000);
                            }}
                            className="p-1 rounded-md hover:bg-blue-100 text-slate-400 hover:text-blue-700 transition"
                            title="Sao chép link nhóm Zalo"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => window.open(cls.zaloGroupUrl, "_blank", "noopener,noreferrer")}
                            className="p-1 rounded-md hover:bg-blue-100 text-slate-400 hover:text-blue-700 transition"
                            title="Mở Nhóm Zalo trên trình duyệt"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(cls)}
                          className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200 transition font-medium"
                          title="Bấm để cài đặt link nhóm Zalo cho lớp này"
                        >
                          <span>⚠️ Chưa có</span>
                        </button>
                      )}
                    </td>

                    <td className="py-2.5 px-2.5">
                      {(() => {
                        const distinctRooms = Array.from(
                          new Set(cls.schedules.map((s) => s.classroom || cls.classroom))
                        );
                        if (distinctRooms.length > 1) {
                          return (
                            <div className="space-y-0.5">
                              {cls.schedules.map((sch) => (
                                <div key={sch.id} className="text-[10.5px] flex items-center gap-1 whitespace-nowrap">
                                  <span className="font-bold text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                                    {sch.dayLabel}:
                                  </span>
                                  <span className="font-medium text-slate-800 inline-flex items-center gap-0.5">
                                    <DoorOpen className="w-3 h-3 text-amber-500 shrink-0" />
                                    {sch.classroom || cls.classroom}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return (
                          <span className="font-medium text-slate-800 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200 inline-flex items-center gap-1 whitespace-nowrap text-[11px]">
                            <DoorOpen className="w-3 h-3 text-amber-500 shrink-0" />
                            {distinctRooms[0] || cls.classroom}
                          </span>
                        );
                      })()}
                    </td>

                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <button
                        onClick={() => setViewingStudentsClass(cls)}
                        title="Bấm để xem danh sách học sinh thuộc lớp này"
                        className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200 text-[11px] transition cursor-pointer"
                      >
                        <Users className="w-3 h-3 text-emerald-600" />
                        <span>{cls.currentStudents}</span>
                      </button>
                    </td>

                    <td className="py-2.5 px-2.5 whitespace-nowrap">
                      <span className="font-bold text-amber-600 font-mono text-[11.5px]">
                        {(cls.feePerLesson || (cls.monthlyFee ? Math.round(cls.monthlyFee / 8) : 200000)).toLocaleString("vi-VN")} đ
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(cls)}
                          className="px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-amber-100 hover:text-amber-800 rounded-lg transition flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" /> Sửa
                        </button>

                        {deleteConfirmId === cls.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                deleteClass(cls.id);
                                setDeleteConfirmId(null);
                              }}
                              className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-semibold"
                            >
                              Xóa
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[11px]"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(cls.id)}
                            title="Xóa lớp học"
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thêm / Chỉnh Sửa Lớp Học Có Kiểm Tra Xung Đột */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {editingClassId ? "Chỉnh Sửa Thông Tin Lớp Học" : "Thêm Lớp Học Mới"}
                </h3>
                <p className="text-xs text-slate-500">Tự động kiểm tra trùng giờ Giáo viên, Trợ giảng và Phòng học</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conflict Alert Banner */}
            {conflictError && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-xs text-red-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-red-700">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> CẢNH BÁO TRÙNG LỊCH:
                </div>
                <div>{conflictError}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tên lớp học *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Shiny Star 02 (Kids)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Chương trình đào tạo *</label>
                  <select
                    value={formData.courseId}
                    onChange={(e) => {
                      const cId = e.target.value;
                      const course = courses.find(c => c.id === cId);
                      setFormData({ 
                        ...formData, 
                        courseId: cId,
                        feePerLesson: course
                          ? (course.standardFeePerLesson || (course.monthlyFee ? Math.round(course.monthlyFee / 8) : 200000))
                          : formData.feePerLesson
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                  >
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name} ({(course.standardFeePerLesson || 200000).toLocaleString()} đ / buổi)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Màu sắc nhận diện trên TKB (Không trùng lớp khác) *
                  </label>
                  <select
                    value={formData.colorTheme}
                    onChange={(e) => {
                      setConflictError(null);
                      setFormData({ ...formData, colorTheme: e.target.value });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                  >
                    {CLASS_THEMES.map((theme) => {
                      const isTaken = classes.some((c) => c.colorTheme === theme.id && c.id !== editingClassId);
                      return (
                        <option key={theme.id} value={theme.id} disabled={isTaken}>
                          {theme.name} {isTaken ? "(❌ Đã có lớp dùng - Trùng màu)" : "✓ Khả dụng"}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Mỗi lớp học sở hữu 1 màu sắc riêng biệt giúp TKB không bao giờ trùng màu.
                  </p>
                </div>
              </div>

              {/* Dynamic Schedules */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="font-bold text-slate-900 block flex items-center gap-1.5 text-xs">
                    <CalendarDays className="w-4 h-4 text-amber-500" /> Thời Khóa Biểu Hàng Tuần (Lịch học từng buổi)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddSlot}
                    className="text-[11px] font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1 self-start sm:self-auto transition"
                  >
                    <Plus className="w-3 h-3" /> Thêm buổi học
                  </button>
                </div>

                {/* Checkbox tùy chọn phân công riêng từng buổi */}
                <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200 shadow-2xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-amber-900">
                    <input
                      type="checkbox"
                      checked={isPerScheduleStaff}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsPerScheduleStaff(checked);
                        if (checked) {
                          setScheduleSlots((slots) =>
                            slots.map((s) => ({
                              ...s,
                              teacherId: s.teacherId || formData.teacherId,
                              assistantId: s.assistantId || formData.assistantId,
                              classroom: s.classroom || formData.classroom,
                            }))
                          );
                        }
                      }}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                    />
                    <span>⚡ Phân công Giáo viên & Trợ giảng riêng theo từng buổi học</span>
                  </label>
                  {isPerScheduleStaff ? (
                    <p className="text-[11px] text-amber-700 mt-1 pl-6">
                      ✓ Đã bật chế độ phân công riêng. Mỗi buổi (Thứ 3, Thứ 5...) bạn có thể chỉ định GV và Trợ giảng mặc định riêng bên dưới.
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-500 mt-0.5 pl-6">
                      Mặc định: Tất cả các buổi trong tuần cùng 1 Giáo viên & 1 Trợ giảng. Bật nếu muốn Thứ 3 cô A, Thứ 5 cô B.
                    </p>
                  )}
                </div>

                <div className="space-y-2.5">
                  {scheduleSlots.map((slot) => (
                    <div key={slot.id} className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <select
                          value={slot.dayOfWeek}
                          onChange={(e) => handleUpdateSlot(slot.id, "dayOfWeek", e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-800 bg-slate-50 text-xs shrink-0"
                        >
                          {DAY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                          <span className="text-[11px] text-slate-400 font-medium">Từ:</span>
                          <input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) => handleUpdateSlot(slot.id, "startTime", e.target.value)}
                            className="px-2 py-1 rounded border border-slate-200 text-xs font-mono"
                          />
                          <span className="text-[11px] text-slate-400 font-medium">Đến:</span>
                          <input
                            type="time"
                            value={slot.endTime}
                            onChange={(e) => handleUpdateSlot(slot.id, "endTime", e.target.value)}
                            className="px-2 py-1 rounded border border-slate-200 text-xs font-mono"
                          />
                        </div>

                        {scheduleSlots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSlot(slot.id)}
                            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition shrink-0"
                            title="Xóa buổi này"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Chọn phòng học riêng cho buổi học này (Ví dụ: Thứ 2 Tầng 3, Thứ 4 Tầng 5) */}
                      <div className="flex items-center gap-2 pt-1.5 border-t border-slate-100">
                        <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 shrink-0">
                          <DoorOpen className="w-3.5 h-3.5 text-amber-500" /> Phòng học ({slot.dayLabel}):
                        </label>
                        <select
                          value={slot.classroom || formData.classroom}
                          onChange={(e) => {
                            setConflictError(null);
                            handleUpdateSlot(slot.id, "classroom", e.target.value);
                          }}
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800"
                        >
                          {classrooms.length === 0 && (
                            <option value={slot.classroom || formData.classroom || ""}>
                              {slot.classroom || formData.classroom || "Chưa có phòng học (hãy tạo ở tab Phòng học)"}
                            </option>
                          )}
                          {classrooms.map((cr) => (
                            <option key={cr.id} value={cr.name}>
                              {cr.name} (Sức chứa: {cr.capacity})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Phân công riêng GV & TA cho buổi này nếu bật isPerScheduleStaff */}
                      {isPerScheduleStaff && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 block mb-1 flex items-center gap-1">
                              <GraduationCap className="w-3 h-3 text-amber-500" /> GV {slot.dayLabel} *
                            </label>
                            <select
                              value={slot.teacherId || formData.teacherId}
                              onChange={(e) => {
                                setConflictError(null);
                                handleUpdateSlot(slot.id, "teacherId", e.target.value);
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                            >
                              {teachers.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.fullName}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 block mb-1 flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-blue-500" /> Trợ giảng (TA) {slot.dayLabel} *
                            </label>
                            <select
                              value={slot.assistantId || formData.assistantId}
                              onChange={(e) => {
                                setConflictError(null);
                                handleUpdateSlot(slot.id, "assistantId", e.target.value);
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                            >
                              {assistants.map((ta) => (
                                <option key={ta.id} value={ta.id}>
                                  {ta.fullName}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    {isPerScheduleStaff ? "Giáo viên chủ nhiệm (Chính) *" : "Giáo viên phụ trách *"}
                  </label>
                  <select
                    value={formData.teacherId}
                    onChange={(e) => {
                      setConflictError(null);
                      setFormData({ ...formData, teacherId: e.target.value });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName}
                      </option>
                    ))}
                  </select>
                  {isPerScheduleStaff && (
                    <p className="text-[10px] text-slate-400 mt-1">Làm GV chính đại diện của lớp học</p>
                  )}
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    {isPerScheduleStaff ? "Trợ giảng chính (TA) *" : "Trợ giảng hỗ trợ (TA) *"}
                  </label>
                  <select
                    value={formData.assistantId}
                    onChange={(e) => {
                      setConflictError(null);
                      setFormData({ ...formData, assistantId: e.target.value });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                  >
                    {assistants.map((ta) => (
                      <option key={ta.id} value={ta.id}>
                        {ta.fullName}
                      </option>
                    ))}
                  </select>
                  {isPerScheduleStaff && (
                    <p className="text-[10px] text-slate-400 mt-1">Làm TA chính hỗ trợ quản lý học sinh</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phòng học mặc định *</label>
                  <select
                    value={formData.classroom}
                    onChange={(e) => {
                      const nextRoom = e.target.value;
                      setConflictError(null);
                      setFormData({ ...formData, classroom: nextRoom });
                      setScheduleSlots((slots) =>
                        slots.map((s) =>
                          !s.classroom || s.classroom === formData.classroom
                            ? { ...s, classroom: nextRoom }
                            : s
                        )
                      );
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white"
                  >
                    {classrooms.length === 0 && (
                      <option value="">-- Chưa có phòng học --</option>
                    )}
                    {classrooms.map((cr) => (
                      <option key={cr.id} value={cr.name}>
                        {cr.name} (Sức chứa: {cr.capacity})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Có thể đổi phòng riêng từng thứ ở danh sách buổi học phía trên.
                  </p>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Học phí 1 buổi (VNĐ / Buổi) *</label>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    value={formData.feePerLesson}
                    onChange={(e) => setFormData({ ...formData, feePerLesson: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Cài đặt Link Nhóm Zalo Lớp (Admin quản lý độc quyền) */}
              <div className="p-3.5 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/70 to-indigo-50/40 space-y-2">
                <label className="font-semibold text-slate-700 block text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-blue-900 font-bold">
                    <span>💬</span> Link Nhóm Zalo Lớp Học (Zalo Group URL)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                    Admin Quản Lý Độc Quyền
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={formData.zaloGroupUrl}
                    onChange={(e) => setFormData({ ...formData, zaloGroupUrl: e.target.value })}
                    placeholder="https://zalo.me/g/shinystar01"
                    className="w-full pl-3 pr-24 py-2 rounded-xl border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white text-xs font-mono"
                  />
                  {formData.zaloGroupUrl && (
                    <button
                      type="button"
                      onClick={() => window.open(formData.zaloGroupUrl, "_blank", "noopener,noreferrer")}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                      title="Mở thử link nhóm Zalo"
                    >
                      <span>Mở Thử</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  💡 Hướng dẫn: Admin mở ứng dụng Zalo &rarr; Vào Nhóm lớp &rarr; Cài đặt nhóm &rarr; Bấm <strong>&quot;Link tham gia nhóm&quot;</strong> và dán vào đây. Giáo viên sẽ sử dụng link này để gửi bài học &amp; BTVN chung.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold shadow hover:opacity-95 transition"
                >
                  {editingClassId ? "Lưu Thay Đổi" : "Xác Nhận Tạo Lớp"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xem Danh Sách Học Sinh Thuộc Lớp */}
      {viewingStudentsClass && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-slate-900">
                    Danh Sách Học Sinh: {viewingStudentsClass.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Phòng: {Array.from(new Set(viewingStudentsClass.schedules.map((s) => s.classroom || viewingStudentsClass.classroom))).join(" / ") || viewingStudentsClass.classroom} • GV: {viewingStudentsClass.teacherName} • TA: {viewingStudentsClass.assistantName}
                </p>
              </div>
              <button
                onClick={() => setViewingStudentsClass(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Students list */}
            {(() => {
              const enrolledStudents = students.filter((s) => s.classId === viewingStudentsClass.id);
              if (enrolledStudents.length === 0) {
                return (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <Users className="w-10 h-10 mx-auto text-slate-300" />
                    <div className="text-sm font-semibold text-slate-600">Lớp học hiện chưa có học sinh nào</div>
                    <p className="text-xs text-slate-400">
                      Bạn có thể chuyển sang tab &quot;Học viên&quot; để xếp học sinh vào lớp học này.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      Tổng số học viên đang theo học: <strong className="text-emerald-700 font-bold">{enrolledStudents.length} học sinh</strong>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Học phí: {(viewingStudentsClass.feePerLesson || (viewingStudentsClass.monthlyFee ? Math.round(viewingStudentsClass.monthlyFee / 8) : 200000)).toLocaleString("vi-VN")} đ / buổi
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">Mã HV</th>
                          <th className="py-2.5 px-3">Họ và Tên</th>
                          <th className="py-2.5 px-3">Ngày sinh</th>
                          <th className="py-2.5 px-3">Phụ huynh & SĐT</th>
                          <th className="py-2.5 px-3 text-right">Học Phí Tháng Này</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {enrolledStudents.map((stu) => (
                          <tr key={stu.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono font-bold text-amber-700">
                              {stu.studentCode}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {stu.fullName}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {stu.dob} ({stu.gender})
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-medium text-slate-900">{stu.parentName}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{stu.parentPhone}</div>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className={`font-bold px-2 py-0.5 rounded border text-[11px] ${
                                stu.tuitionStatus === "PAID"
                                  ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                  : "text-rose-700 bg-rose-50 border-rose-200"
                              }`}>
                                {stu.tuitionStatus === "PAID" ? "✓ Đã đóng T11" : "Chưa đóng T11"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingStudentsClass(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
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
