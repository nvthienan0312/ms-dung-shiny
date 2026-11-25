import { 
  AttendanceRecord, 
  StudentItem, 
  ClassItem, 
  MakeupClass, 
  ExpiredMakeupRecord,
  MakeupStudentEntry 
} from "@/data/centerData";

export interface StudentAbsentSessionDetail {
  id: string; // Attendance id or unique key
  dateStr: string; // YYYY-MM-DD
  classId: string;
  className: string;
  note: string;
  status: "UNSCHEDULED" | "SCHEDULED" | "COMPLETED" | "EXPIRED";
  makeupClassId?: string;
  makeupClassTitle?: string;
  makeupDateStr?: string;
  makeupTime?: string;
  exchangeNote?: string;
  notifiedAt?: string;
}

export interface MonthlyAbsentStudentInfo {
  studentId: string;
  studentName: string;
  studentCode: string;
  classId: string;
  className: string;
  parentName: string;
  parentPhone: string;
  absentSessions: StudentAbsentSessionDetail[];
  totalAbsentCount: number;
  scheduledCount: number;
  completedCount: number;
  unscheduledCount: number;
  expiredCount: number;
}

export interface MonthlyMakeupSummary {
  monthStr: string;
  totalAbsentSessions: number;
  scheduledSessions: number;
  completedSessions: number;
  unscheduledSessions: number;
  expiredSessions: number;
  totalAbsentStudentsCount: number;
  activeMakeupClassesCount: number;
}

/**
 * Trích xuất tiền tố "YYYY-MM" từ chuỗi tháng (vd: "Tháng 11/2026" -> "2026-11")
 */
export function extractYearMonthPrefix(monthStr: string): string {
  const match = monthStr.match(/(\d{1,2})\/(\d{4})/);
  if (match) {
    const month = match[1].padStart(2, "0");
    const year = match[2];
    return `${year}-${month}`;
  }
  return "2026-11";
}

/**
 * Kiểm tra xem ngày dateStr (YYYY-MM-DD) có thuộc tháng monthStr không
 */
export function isDateInMonth(dateStr: string, monthStr: string): boolean {
  const prefix = extractYearMonthPrefix(monthStr);
  return dateStr.startsWith(prefix);
}

/**
 * Thống kê toàn diện tình hình vắng mặt và quyền lợi học bù của học sinh trong tháng
 */
export function getMonthlyAbsentStatistics(
  monthStr: string,
  attendance: AttendanceRecord[],
  students: StudentItem[],
  classes: ClassItem[],
  makeupClasses: MakeupClass[],
  expiredRecords: ExpiredMakeupRecord[]
): {
  studentsList: MonthlyAbsentStudentInfo[];
  summary: MonthlyMakeupSummary;
} {
  const prefix = extractYearMonthPrefix(monthStr);

  // 1. Lọc tất cả các bản ghi điểm danh vắng (ABSENT) trong tháng đó
  const monthlyAbsentAttendance = attendance.filter(
    (att) => att.status === "ABSENT" && att.dateStr.startsWith(prefix)
  );

  // 2. Lấy các lớp học bù của tháng đó
  const currentMonthMakeupClasses = makeupClasses.filter((mc) => mc.monthStr === monthStr);

  // 3. Lấy các bản ghi hết hạn của tháng đó
  const currentMonthExpiredRecords = expiredRecords.filter((exp) => exp.monthStr === monthStr);

  // Map theo studentId
  const studentMap = new Map<string, StudentAbsentSessionDetail[]>();

  monthlyAbsentAttendance.forEach((att) => {
    const list = studentMap.get(att.studentId) || [];
    
    // Tìm xem buổi vắng này đã được xếp vào lớp học bù nào chưa
    let sessionStatus: "UNSCHEDULED" | "SCHEDULED" | "COMPLETED" | "EXPIRED" = "UNSCHEDULED";
    let matchedMakeupClass: MakeupClass | undefined;
    let studentEntryInMakeup: MakeupStudentEntry | undefined;

    for (const mc of currentMonthMakeupClasses) {
      const foundEntry = mc.students.find(
        (st) => st.studentId === att.studentId && st.absentDateStr === att.dateStr
      );
      if (foundEntry) {
        matchedMakeupClass = mc;
        studentEntryInMakeup = foundEntry;
        if (foundEntry.attendanceStatus === "ATTENDED" || (mc.status === "COMPLETED" && foundEntry.attendanceStatus !== "ABSENT")) {
          sessionStatus = "COMPLETED";
        } else if (foundEntry.attendanceStatus === "ABSENT") {
          // Quy tắc vàng: Vắng vào ngày học bù -> KHÔNG cộng dồn vào số buổi vắng, và số ngày học bù trong tháng vẫn giữ nguyên
          sessionStatus = "UNSCHEDULED";
        } else if (mc.status === "SCHEDULED") {
          sessionStatus = "SCHEDULED";
        }
        break;
      }
    }

    // Kiểm tra xem buổi vắng này đã bị hết hạn / reset quyền lợi chưa
    const isExpired = currentMonthExpiredRecords.some(
      (exp) => exp.studentId === att.studentId && exp.absentDateStr === att.dateStr
    );
    if (isExpired && sessionStatus === "UNSCHEDULED") {
      sessionStatus = "EXPIRED";
    }

    const cls = classes.find((c) => c.id === att.classId);

    list.push({
      id: att.id,
      dateStr: att.dateStr,
      classId: att.classId,
      className: cls ? cls.name : "Lớp học",
      note: att.note || "Nghỉ học có phép",
      status: sessionStatus,
      makeupClassId: matchedMakeupClass?.id,
      makeupClassTitle: matchedMakeupClass?.title,
      makeupDateStr: matchedMakeupClass?.dateStr,
      makeupTime: matchedMakeupClass ? `${matchedMakeupClass.startTime} - ${matchedMakeupClass.endTime}` : undefined,
      exchangeNote: studentEntryInMakeup?.exchangeNote,
      notifiedAt: studentEntryInMakeup?.notifiedAt,
    });

    studentMap.set(att.studentId, list);
  });

  // Gom thành danh sách học sinh
  const studentsList: MonthlyAbsentStudentInfo[] = [];

  studentMap.forEach((sessions, stuId) => {
    const stu = students.find((s) => s.id === stuId);
    if (!stu) return;

    const cls = classes.find((c) => c.id === stu.classId);
    const scheduledCount = sessions.filter((s) => s.status === "SCHEDULED").length;
    const completedCount = sessions.filter((s) => s.status === "COMPLETED").length;
    const expiredCount = sessions.filter((s) => s.status === "EXPIRED").length;
    const unscheduledCount = sessions.filter((s) => s.status === "UNSCHEDULED").length;

    studentsList.push({
      studentId: stu.id,
      studentName: stu.fullName,
      studentCode: stu.studentCode,
      classId: stu.classId || "",
      className: cls ? cls.name : "Lớp học",
      parentName: stu.parentName,
      parentPhone: stu.parentPhone,
      absentSessions: sessions.sort((a, b) => a.dateStr.localeCompare(b.dateStr)),
      totalAbsentCount: sessions.length,
      scheduledCount,
      completedCount,
      unscheduledCount,
      expiredCount,
    });
  });

  // Sắp xếp: Học sinh có nhiều buổi chưa xếp bù nhất lên đầu
  studentsList.sort((a, b) => b.unscheduledCount - a.unscheduledCount || b.totalAbsentCount - a.totalAbsentCount);

  // Tổng hợp KPIs
  let totalAbsentSessions = 0;
  let scheduledSessions = 0;
  let completedSessions = 0;
  let unscheduledSessions = 0;
  let expiredSessions = 0;

  studentsList.forEach((stu) => {
    totalAbsentSessions += stu.totalAbsentCount;
    scheduledSessions += stu.scheduledCount;
    completedSessions += stu.completedCount;
    unscheduledSessions += stu.unscheduledCount;
    expiredSessions += stu.expiredCount;
  });

  const summary: MonthlyMakeupSummary = {
    monthStr,
    totalAbsentSessions,
    scheduledSessions,
    completedSessions,
    unscheduledSessions,
    expiredSessions,
    totalAbsentStudentsCount: studentsList.length,
    activeMakeupClassesCount: currentMonthMakeupClasses.filter((mc) => mc.status !== "CANCELLED").length,
  };

  return { studentsList, summary };
}

/**
 * Sinh tin nhắn thông báo lớp học bù gửi tới phụ huynh (qua App Sổ liên lạc / Zalo / SMS)
 */
export function generateMakeupNotificationMessage(
  studentName: string,
  parentName: string,
  makeupClass: MakeupClass,
  absentDateStr?: string
): string {
  // Format ngày
  const [year, month, day] = makeupClass.dateStr.split("-");
  const formattedDate = `${day}/${month}/${year}`;

  let absentInfo = "";
  if (absentDateStr) {
    const [, aM, aD] = absentDateStr.split("-");
    absentInfo = `\n- Bù cho buổi con vắng ngày: ${aD}/${aM}/${year}`;
  }

  return `[MS. DUNG SHINY CENTER - THÔNG BÁO LỊCH HỌC BÙ TRONG THÁNG]
Kính gửi Phụ huynh ${parentName || "Học sinh"},
Trung tâm Ms. Dung Shiny xin thông báo lịch lớp học bù trong ${makeupClass.monthStr} dành cho bé ${studentName}:${absentInfo}
- Lớp học bù: ${makeupClass.title}
- Thời gian: ${makeupClass.startTime} - ${makeupClass.endTime}, ngày ${formattedDate}
- Phòng học: ${makeupClass.classroomName}
- Giáo viên/Trợ giảng phụ trách: ${makeupClass.teacherOrAssistantName}
- Nội dung trọng tâm: ${makeupClass.focusContent}

* Quy định trung tâm: Buổi học bù chỉ diễn ra trong tháng và sẽ được chốt quyền lợi khi sang tháng mới. Kính mong Phụ huynh nhắc con đi học đúng giờ và mang theo đầy đủ sách vở, bút.
Hotline hỗ trợ: 0912 345 678.
Trân trọng cảm ơn Quý Phụ huynh!`;
}

/**
 * Sinh tin nhắn khảo sát lịch rảnh của học sinh để xếp học bù (Admin có thể tự soạn tùy chỉnh)
 */
export function generateMakeupSurveyMessage(
  studentName: string,
  parentName: string,
  absentCount: number,
  absentDates: string[],
  monthStr: string,
  className: string,
  customTemplate?: string
): string {
  const datesText = absentDates.length > 0 ? absentDates.join(", ") : "trong tháng";
  if (customTemplate && customTemplate.trim()) {
    return customTemplate
      .replaceAll("{studentName}", studentName)
      .replaceAll("{parentName}", parentName || "Phụ huynh")
      .replaceAll("{month}", monthStr)
      .replaceAll("{monthStr}", monthStr)
      .replaceAll("{className}", className)
      .replaceAll("{absentCount}", String(absentCount))
      .replaceAll("{absentDates}", datesText);
  }

  return `[MS. DUNG SHINY CENTER - KHẢO SÁT LỊCH RẢNH HỌC BÙ ${monthStr.toUpperCase()}]
Kính gửi Quý Phụ huynh bé ${studentName},
Trong ${monthStr}, bé ${studentName} (${className}) có ${absentCount} buổi nghỉ học (ngày: ${datesText}).
Theo quy chuẩn của trung tâm Ms. Dung Shiny, học sinh nghỉ học có quyền lợi được học bù trong tháng để củng cố bài học trước khi sang tháng mới.
Để trung tâm sắp xếp lịch học bù phù hợp nhất cho con, kính nhờ Quý Phụ huynh phản hồi lại các khung giờ con có thể tham gia:
1. Các buổi tối trong tuần: Khung 17:30 - 19:00 hoặc 19:00 - 20:30
2. Cuối tuần: Khung Sáng / Chiều Thứ Bảy hoặc Chủ Nhật
Quý Phụ huynh vui lòng nhắn lại tin nhắn này hoặc liên hệ Hotline: 0912 345 678 để trung tâm lên lịch bù cho bé.
Trân trọng cảm ơn Quý Phụ huynh!`;
}

/**
 * Sinh tin nhắn báo cáo kết quả buổi học bù cho phụ huynh (do Trợ giảng / GV gửi)
 */
export function generateMakeupReportMessage(
  studentName: string,
  parentName: string,
  makeupClass: MakeupClass
): string {
  const [year, month, day] = makeupClass.dateStr.split("-");
  const formattedDate = `${day}/${month}/${year}`;

  return `[MS. DUNG SHINY CENTER - BÁO CÁO KẾT QUẢ BUỔI HỌC BÙ]
Kính gửi Phụ huynh bé ${studentName},
Trợ giảng/Giáo viên phụ trách xin gửi tóm tắt nội dung buổi học bù ngày ${formattedDate} (${makeupClass.startTime} - ${makeupClass.endTime}):
- Lớp học bù: ${makeupClass.title}
- Nội dung đã ôn tập: ${makeupClass.lessonContent || makeupClass.focusContent}
${makeupClass.homework ? `- Bài tập về nhà / Dặn dò: ${makeupClass.homework}\n` : ""}${makeupClass.assistantFeedback ? `- Nhận xét của Trợ giảng: ${makeupClass.assistantFeedback}\n` : ""}
Kính mong Quý Phụ huynh tiếp tục đồng hành và nhắc nhở con ôn tập! Hotline: 0912 345 678.`;
}
