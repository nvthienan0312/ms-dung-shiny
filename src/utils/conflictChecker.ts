import { ClassItem, ScheduleSlot, SessionSubstitution, MakeupClass } from "@/data/centerData";

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function isTimeOverlapping(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);
  return aStart < bEnd && aEnd > bStart;
}

export function getDayOfWeekFromDateStr(dateStr: string): number {
  if (!dateStr) return 2;
  const match = dateStr.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const d = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(dateStr);
  const jsDay = d.getDay();
  return jsDay === 0 ? 8 : jsDay + 1; // 2: Thứ 2, ..., 8: Chủ Nhật
}

export interface ConflictResult {
  hasConflict: boolean;
  type?: "TEACHER" | "ASSISTANT" | "CLASSROOM" | "INTERNAL";
  message?: string;
  conflictingClassName?: string;
}

/**
 * Kiểm tra xem khi xếp thời khóa biểu cho lớp học, có bị trùng lịch:
 * 1. Trùng nội bộ giữa các ca học trong cùng một lớp
 * 2. Giáo viên dạy 2 lớp cùng giờ
 * 3. Trợ giảng trực 2 lớp cùng giờ
 * 4. Phòng học bị xếp 2 lớp cùng giờ
 * 5. Trùng với các Lớp học bù (MakeupClass) đã lên lịch trong tuần/tháng
 */
export function validateClassSchedules(
  classes: ClassItem[] = [],
  currentClassId: string | null, // null nếu đang tạo mới
  schedules: ScheduleSlot[] = [],
  teacherId: string,
  assistantId: string,
  classroom: string,
  makeupClasses: MakeupClass[] = []
): ConflictResult {
  const safeSchedules = schedules || [];
  const safeClasses = classes || [];

  // 1. Kiểm tra trùng lịch NỘI BỘ giữa các ca của chính lớp này
  for (let i = 0; i < safeSchedules.length; i++) {
    for (let j = i + 1; j < safeSchedules.length; j++) {
      const slotA = safeSchedules[i];
      const slotB = safeSchedules[j];
      if (slotA && slotB && slotA.dayOfWeek === slotB.dayOfWeek) {
        if (isTimeOverlapping(slotA.startTime, slotA.endTime, slotB.startTime, slotB.endTime)) {
          return {
            hasConflict: true,
            type: "INTERNAL",
            message: `Trùng giờ nội bộ: Lớp này có 2 ca học bị trùng giờ nhau vào ${slotA.dayLabel} (${slotA.startTime}-${slotA.endTime} và ${slotB.startTime}-${slotB.endTime})!`,
          };
        }
      }
    }
  }

  // 2. Kiểm tra trùng với các lớp chính khóa khác
  for (const newSlot of safeSchedules) {
    if (!newSlot) continue;
    const slotTeacherId = newSlot.teacherId || teacherId;
    const slotAssistantId = newSlot.assistantId || assistantId;
    const slotClassroom = newSlot.classroom || classroom;

    for (const otherClass of safeClasses) {
      if (!otherClass || (currentClassId && otherClass.id === currentClassId)) continue;

      for (const otherSlot of (otherClass.schedules || [])) {
        if (!otherSlot) continue;
        if (newSlot.dayOfWeek === otherSlot.dayOfWeek) {
          if (isTimeOverlapping(newSlot.startTime, newSlot.endTime, otherSlot.startTime, otherSlot.endTime)) {
            const otherTeacherId = otherSlot.teacherId || otherClass.teacherId;
            const otherTeacherName = otherSlot.teacherName || otherClass.teacherName;
            const otherAssistantId = otherSlot.assistantId || otherClass.assistantId;
            const otherAssistantName = otherSlot.assistantName || otherClass.assistantName;
            const otherClassroom = otherSlot.classroom || otherClass.classroom;

            // Check Teacher conflict
            if (slotTeacherId && otherTeacherId === slotTeacherId) {
              return {
                hasConflict: true,
                type: "TEACHER",
                conflictingClassName: otherClass.name,
                message: `Trùng lịch Giáo viên: ${otherTeacherName || "Giáo viên"} đã có ca dạy lúc ${otherSlot.startTime} - ${otherSlot.endTime} tại lớp "${otherClass.name}" (${newSlot.dayLabel})!`,
              };
            }

            // Check Assistant conflict
            if (slotAssistantId && otherAssistantId === slotAssistantId) {
              return {
                hasConflict: true,
                type: "ASSISTANT",
                conflictingClassName: otherClass.name,
                message: `Trùng lịch Trợ giảng: ${otherAssistantName || "Trợ giảng"} đã có ca trực lúc ${otherSlot.startTime} - ${otherSlot.endTime} tại lớp "${otherClass.name}" (${newSlot.dayLabel})!`,
              };
            }

            // Check Classroom conflict
            if (slotClassroom && otherClassroom && otherClassroom.trim().toLowerCase() === slotClassroom.trim().toLowerCase()) {
              return {
                hasConflict: true,
                type: "CLASSROOM",
                conflictingClassName: otherClass.name,
                message: `Trùng Phòng học: "${slotClassroom}" đã được xếp cho lớp "${otherClass.name}" lúc ${otherSlot.startTime} - ${otherSlot.endTime} (${newSlot.dayLabel})!`,
              };
            }
          }
        }
      }
    }

    // 3. Kiểm tra trùng với Lớp học bù đã có lịch
    if (makeupClasses && makeupClasses.length > 0) {
      for (const mc of makeupClasses) {
        if (!mc || mc.status === "CANCELLED" || !mc.dateStr) continue;
        const mcDayOfWeek = getDayOfWeekFromDateStr(mc.dateStr);
        if (newSlot.dayOfWeek === mcDayOfWeek) {
          if (isTimeOverlapping(newSlot.startTime, newSlot.endTime, mc.startTime, mc.endTime)) {
            // Check Room conflict with Makeup class
            if (slotClassroom && mc.classroomName && mc.classroomName.trim().toLowerCase() === slotClassroom.trim().toLowerCase()) {
              return {
                hasConflict: true,
                type: "CLASSROOM",
                conflictingClassName: mc.title,
                message: `Trùng Phòng học: Phòng "${slotClassroom}" đã được xếp cho [Lớp học bù] "${mc.title}" (${mc.dateStr}) lúc ${mc.startTime} - ${mc.endTime}!`,
              };
            }

            // Check Teacher/Assistant conflict with Makeup class
            if (mc.roleInCharge === "TEACHER" && slotTeacherId && mc.teacherOrAssistantId === slotTeacherId) {
              return {
                hasConflict: true,
                type: "TEACHER",
                conflictingClassName: mc.title,
                message: `Trùng lịch Giáo viên: Đã có lịch đứng lớp ca bù "${mc.title}" (${mc.dateStr}) lúc ${mc.startTime} - ${mc.endTime}!`,
              };
            }
            if (mc.roleInCharge === "ASSISTANT" && slotAssistantId && mc.teacherOrAssistantId === slotAssistantId) {
              return {
                hasConflict: true,
                type: "ASSISTANT",
                conflictingClassName: mc.title,
                message: `Trùng ca trực Trợ giảng: Đã có lịch trực ca bù "${mc.title}" (${mc.dateStr}) lúc ${mc.startTime} - ${mc.endTime}!`,
              };
            }
          }
        }
      }
    }
  }

  return { hasConflict: false };
}

/**
 * Kiểm tra xung đột khi tạo/sửa Lớp Học Bù (Makeup Class):
 * - Không trùng Phòng học với lớp chính khóa và lớp bù khác
 * - Không trùng Giáo viên / Trợ giảng với lớp chính khóa và lớp bù khác
 */
export function validateMakeupClassConflict(
  classes: ClassItem[],
  makeupClasses: MakeupClass[],
  currentMakeupId: string | null,
  dateStr: string,
  startTime: string,
  endTime: string,
  classroomName: string,
  teacherOrAssistantId: string,
  roleInCharge: "TEACHER" | "ASSISTANT"
): ConflictResult {
  const dayOfWeek = getDayOfWeekFromDateStr(dateStr);

  // 1. Kiểm tra xung đột với các Lớp chính khóa diễn ra vào thứ này
  for (const cls of classes) {
    for (const sch of cls.schedules) {
      if (sch.dayOfWeek === dayOfWeek && isTimeOverlapping(startTime, endTime, sch.startTime, sch.endTime)) {
        const schRoom = sch.classroom || cls.classroom;
        const schTeacherId = sch.teacherId || cls.teacherId;
        const schAssistantId = sch.assistantId || cls.assistantId;

        // Trùng phòng
        if (classroomName && schRoom && classroomName.trim().toLowerCase() === schRoom.trim().toLowerCase()) {
          return {
            hasConflict: true,
            type: "CLASSROOM",
            conflictingClassName: cls.name,
            message: `Trùng Phòng học: Phòng "${classroomName}" lúc ${sch.startTime} - ${sch.endTime} đã có lớp chính khóa "${cls.name}" đang học!`,
          };
        }

        // Trùng nhân sự phụ trách
        if (roleInCharge === "TEACHER" && teacherOrAssistantId === schTeacherId) {
          return {
            hasConflict: true,
            type: "TEACHER",
            conflictingClassName: cls.name,
            message: `Trùng lịch Giáo viên: Giáo viên phụ trách đang có ca dạy chính khóa tại lớp "${cls.name}" lúc ${sch.startTime} - ${sch.endTime}!`,
          };
        }
        if (roleInCharge === "ASSISTANT" && teacherOrAssistantId === schAssistantId) {
          return {
            hasConflict: true,
            type: "ASSISTANT",
            conflictingClassName: cls.name,
            message: `Trùng ca trực Trợ giảng: Trợ giảng phụ trách đang có ca trực chính khóa tại lớp "${cls.name}" lúc ${sch.startTime} - ${sch.endTime}!`,
          };
        }
      }
    }
  }

  // 2. Kiểm tra xung đột với các Lớp học bù khác cùng ngày
  for (const mc of makeupClasses) {
    if (currentMakeupId && mc.id === currentMakeupId) continue;
    if (mc.status === "CANCELLED") continue;

    if (mc.dateStr === dateStr && isTimeOverlapping(startTime, endTime, mc.startTime, mc.endTime)) {
      // Trùng phòng
      if (classroomName && mc.classroomName && classroomName.trim().toLowerCase() === mc.classroomName.trim().toLowerCase()) {
        return {
          hasConflict: true,
          type: "CLASSROOM",
          conflictingClassName: mc.title,
          message: `Trùng Phòng học: Phòng "${classroomName}" đã được xếp cho ca học bù "${mc.title}" lúc ${mc.startTime} - ${mc.endTime}!`,
        };
      }

      // Trùng nhân sự
      if (teacherOrAssistantId && mc.teacherOrAssistantId === teacherOrAssistantId) {
        return {
          hasConflict: true,
          type: "TEACHER",
          conflictingClassName: mc.title,
          message: `Trùng người phụ trách: Nhân sự này đã được phân công đứng lớp ca học bù "${mc.title}" lúc ${mc.startTime} - ${mc.endTime}!`,
        };
      }
    }
  }

  return { hasConflict: false };
}

/**
 * Kiểm tra xem khi phân công Giáo viên hoặc Trợ giảng dạy thay:
 * Người được chọn có đang bận đứng lớp khác trong ca học đó hay không.
 */
export function validateSubstituteConflict(
  classes: ClassItem[],
  substitutions: SessionSubstitution[],
  staffId: string,
  staffName: string,
  dateStr: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  excludeClassId: string
): ConflictResult {
  // 1. Kiểm tra lịch dạy chính thức của nhân sự đó vào thứ này
  for (const cls of (classes || [])) {
    if (!cls || cls.id === excludeClassId) continue;

    for (const sch of (cls.schedules || [])) {
      if (sch.dayOfWeek === dayOfWeek && isTimeOverlapping(startTime, endTime, sch.startTime, sch.endTime)) {
        const assignedTeacherId = sch.teacherId || cls.teacherId;
        const assignedAssistantId = sch.assistantId || cls.assistantId;
        if (assignedTeacherId === staffId) {
          return {
            hasConflict: true,
            type: "TEACHER",
            conflictingClassName: cls.name,
            message: `Trùng lịch: ${staffName} đã có lịch dạy chính thức tại lớp "${cls.name}" lúc ${sch.startTime} - ${sch.endTime}!`,
          };
        }
        if (assignedAssistantId === staffId) {
          return {
            hasConflict: true,
            type: "ASSISTANT",
            conflictingClassName: cls.name,
            message: `Trùng ca trực: ${staffName} đã có ca trực chính thức tại lớp "${cls.name}" lúc ${sch.startTime} - ${sch.endTime}!`,
          };
        }
      }
    }
  }

  // 2. Kiểm tra xem nhân sự đó đã nhận dạy thay lớp khác trong cùng ngày & giờ đó chưa
  for (const sub of substitutions) {
    if (sub.dateStr === dateStr && sub.classId !== excludeClassId) {
      const otherClass = classes.find((c) => c.id === sub.classId);
      if (otherClass) {
        const otherSlot = otherClass.schedules.find((s) => s.dayOfWeek === dayOfWeek);
        if (otherSlot && isTimeOverlapping(startTime, endTime, otherSlot.startTime, otherSlot.endTime)) {
          if (sub.subTeacherId === staffId || sub.subAssistantId === staffId) {
            return {
              hasConflict: true,
              type: "TEACHER",
              conflictingClassName: otherClass.name,
              message: `Trùng lịch dạy thay: ${staffName} đã được phân công dạy thay tại lớp "${otherClass.name}" vào ca này!`,
            };
          }
        }
      }
    }
  }

  return { hasConflict: false };
}

export interface TimetableConflictItem {
  id: string;
  dayOfWeek: number;
  dayLabel: string;
  timeRange: string;
  type: "CLASSROOM" | "TEACHER" | "ASSISTANT";
  description: string;
  classNames: string[];
}

/**
 * Kiểm tra xung đột thời khóa biểu tổng quát (Audit Engine):
 * Quét toàn bộ classes & makeupClasses để phát hiện bất kỳ cặp lớp nào trùng phòng hoặc trùng GV/TA cùng giờ
 */
export function detectAllTimetableConflicts(
  classes: ClassItem[],
  makeupClasses: MakeupClass[] = []
): TimetableConflictItem[] {
  const conflicts: TimetableConflictItem[] = [];

  // Gom tất cả các ca học theo thứ trong tuần (dayOfWeek: 2..8)
  for (let dow = 2; dow <= 8; dow++) {
    const slotsInDay: {
      source: "REGULAR" | "MAKEUP";
      sourceId: string;
      className: string;
      startTime: string;
      endTime: string;
      classroom: string;
      teacherName: string;
      assistantName: string;
    }[] = [];

    // Ca chính khóa
    (classes || []).forEach((cls) => {
      if (!cls) return;
      (cls.schedules || []).forEach((sch) => {
        if (!sch) return;
        if (sch.dayOfWeek === dow) {
          slotsInDay.push({
            source: "REGULAR",
            sourceId: `${cls.id}-${sch.id}`,
            className: cls.name,
            startTime: sch.startTime,
            endTime: sch.endTime,
            classroom: sch.classroom || cls.classroom || "Chưa xếp phòng",
            teacherName: sch.teacherName || cls.teacherName || "",
            assistantName: sch.assistantName || cls.assistantName || "",
          });
        }
      });
    });

    // So sánh từng cặp trong ngày
    for (let i = 0; i < slotsInDay.length; i++) {
      for (let j = i + 1; j < slotsInDay.length; j++) {
        const a = slotsInDay[i];
        const b = slotsInDay[j];

        if (isTimeOverlapping(a.startTime, a.endTime, b.startTime, b.endTime)) {
          // Trùng phòng
          if (
            a.classroom &&
            b.classroom &&
            a.classroom !== "Chưa xếp phòng" &&
            a.classroom.trim().toLowerCase() === b.classroom.trim().toLowerCase()
          ) {
            conflicts.push({
              id: `cf-room-${dow}-${a.sourceId}-${b.sourceId}`,
              dayOfWeek: dow,
              dayLabel: dow === 8 ? "Chủ Nhật" : `Thứ ${dow}`,
              timeRange: `${a.startTime} - ${a.endTime} & ${b.startTime} - ${b.endTime}`,
              type: "CLASSROOM",
              description: `Trùng phòng học "${a.classroom}" giữa lớp "${a.className}" và "${b.className}"!`,
              classNames: [a.className, b.className],
            });
          }

          // Trùng GV
          if (a.teacherName && b.teacherName && a.teacherName === b.teacherName) {
            conflicts.push({
              id: `cf-t-${dow}-${a.sourceId}-${b.sourceId}`,
              dayOfWeek: dow,
              dayLabel: dow === 8 ? "Chủ Nhật" : `Thứ ${dow}`,
              timeRange: `${a.startTime} - ${a.endTime} & ${b.startTime} - ${b.endTime}`,
              type: "TEACHER",
              description: `Trùng lịch Giáo viên "${a.teacherName}" cùng dạy lúc ${a.startTime}-${a.endTime} tại lớp "${a.className}" và "${b.className}"!`,
              classNames: [a.className, b.className],
            });
          }

          // Trùng TA
          if (a.assistantName && b.assistantName && a.assistantName === b.assistantName) {
            conflicts.push({
              id: `cf-ta-${dow}-${a.sourceId}-${b.sourceId}`,
              dayOfWeek: dow,
              dayLabel: dow === 8 ? "Chủ Nhật" : `Thứ ${dow}`,
              timeRange: `${a.startTime} - ${a.endTime} & ${b.startTime} - ${b.endTime}`,
              type: "ASSISTANT",
              description: `Trùng ca trực Trợ giảng "${a.assistantName}" cùng trực lúc ${a.startTime}-${a.endTime} tại lớp "${a.className}" và "${b.className}"!`,
              classNames: [a.className, b.className],
            });
          }
        }
      }
    }
  }

  return conflicts;
}
