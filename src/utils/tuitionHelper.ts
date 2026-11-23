import { ScheduleSlot, StudentTuitionBill } from "@/data/centerData";

/**
 * Tính số buổi học thực tế trong một tháng dựa trên thời khóa biểu của lớp
 * @param billingMonth Chuỗi dạng "Tháng 11/2026" hoặc "11/2026"
 * @param schedules Danh sách các khung giờ học trong tuần (dayOfWeek: 2..8)
 */
export function calculateMonthLessons(
  billingMonth: string,
  schedules: ScheduleSlot[]
): {
  lessonCount: number;
  lessonDates: string[]; // Danh sách các ngày học dạng "DD/MM/YYYY"
  monthNum: number;
  yearNum: number;
} {
  const match = billingMonth.match(/(\d{1,2})\/(\d{4})/);
  if (!match) {
    return { lessonCount: 8, lessonDates: [], monthNum: 11, yearNum: 2026 };
  }

  const monthNum = parseInt(match[1], 10); // 1 - 12
  const yearNum = parseInt(match[2], 10);

  // Số ngày trong tháng (ngày 0 của tháng kế tiếp = ngày cuối tháng này)
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
  const scheduleDays = schedules.map((s) => s.dayOfWeek); // e.g. [3, 5] (Thứ 3, Thứ 5)

  const lessonDates: string[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(yearNum, monthNum - 1, day);
    const jsDay = d.getDay(); // 0: Sunday, 1: Monday, ..., 6: Saturday
    // Quy đổi sang hệ thống dayOfWeek của trung tâm:
    // Thứ 2: 2, Thứ 3: 3, Thứ 4: 4, Thứ 5: 5, Thứ 6: 6, Thứ 7: 7, Chủ Nhật: 8
    const appDayOfWeek = jsDay === 0 ? 8 : jsDay + 1;

    if (scheduleDays.includes(appDayOfWeek)) {
      const dd = day < 10 ? `0${day}` : `${day}`;
      const mm = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;
      lessonDates.push(`${dd}/${mm}/${yearNum}`);
    }
  }

  return {
    lessonCount: lessonDates.length,
    lessonDates,
    monthNum,
    yearNum,
  };
}

/**
 * Kiểm tra xem ngày hiện tại đã quá hạn nộp học phí hay chưa (Hạn chuẩn là ngày 10)
 */
export function isTuitionOverdue(dueDateStr: string): boolean {
  // dueDateStr format: "DD/MM/YYYY"
  const parts = dueDateStr.split("/");
  if (parts.length !== 3) return false;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  const dueDate = new Date(year, month, day, 23, 59, 59);
  return new Date() > dueDate;
}

/**
 * Định dạng tiền tệ VNĐ
 */
export function formatVND(amount: number): string {
  return amount.toLocaleString("vi-VN") + " đ";
}

/**
 * TÍNH TOÁN CÔNG NỢ & NỢ HỌC PHÍ NHIỀU THÁNG CỦA MỘT HỌC SINH
 */
export interface StudentDebtSummary {
  unpaidBills: StudentTuitionBill[];
  totalDebtAmount: number;
  debtMonthsCount: number;
  monthsList: string[]; // e.g. ["Tháng 10/2026", "Tháng 11/2026"]
  isMultiMonthDebt: boolean; // Nợ từ 2 tháng trở lên
  hasOverdue: boolean;
  severityLevel: "NORMAL" | "WARNING" | "CRITICAL"; // 1 tháng: NORMAL, 2 tháng: WARNING, >= 3 tháng: CRITICAL
}

export function getStudentDebtSummary(
  studentId: string,
  allBills: StudentTuitionBill[]
): StudentDebtSummary {
  // Lấy các hóa đơn chưa nộp (SENT, OVERDUE, hoặc DRAFT nếu đã đến kỳ)
  const unpaid = allBills.filter(
    (b) => b.studentId === studentId && (b.status === "SENT" || b.status === "OVERDUE" || b.status === "DRAFT")
  );

  const totalDebtAmount = unpaid.reduce((sum, b) => sum + b.finalAmount, 0);
  const debtMonthsCount = unpaid.length;
  const monthsList = unpaid.map((b) => b.billingMonth);
  const hasOverdue = unpaid.some((b) => b.status === "OVERDUE");

  let severityLevel: "NORMAL" | "WARNING" | "CRITICAL" = "NORMAL";
  if (debtMonthsCount >= 3) {
    severityLevel = "CRITICAL"; // Nợ 3 tháng trở lên: Báo động đỏ
  } else if (debtMonthsCount === 2) {
    severityLevel = "WARNING";  // Nợ 2 tháng: Cảnh báo vàng
  }

  return {
    unpaidBills: unpaid,
    totalDebtAmount,
    debtMonthsCount,
    monthsList,
    isMultiMonthDebt: debtMonthsCount >= 2,
    hasOverdue,
    severityLevel,
  };
}

/**
 * Sinh mẫu tin nhắn nhắc nhở học phí cá nhân hóa
 */
export function generateTuitionReminderMessage(
  templateType: "MONTH_START" | "DUE_APPROACHING" | "OVERDUE_SINGLE" | "MULTI_MONTH_DEBT",
  bill: StudentTuitionBill,
  debtSummary?: StudentDebtSummary
): string {
  const childName = bill.studentName;
  const parentName = bill.parentName;
  const month = bill.billingMonth;
  const amount = formatVND(bill.finalAmount);
  const lessons = bill.lessonCount;

  if (templateType === "MULTI_MONTH_DEBT" && debtSummary && debtSummary.isMultiMonthDebt) {
    const monthsStr = debtSummary.monthsList.join(", ");
    const totalAmountStr = formatVND(debtSummary.totalDebtAmount);
    return `[MS. DUNG SHINY] Kính gửi Phụ huynh ${parentName}! Trung tâm xin thông báo học phí của con ${childName} hiện đang còn tồn đọng ${debtSummary.debtMonthsCount} kỳ học (${monthsStr}) với tổng số tiền nợ là ${totalAmountStr}. Kính đề nghị Quý phụ huynh thanh toán sớm qua VietQR hoặc liên hệ Ban Quản lý để chốt lộ trình đóng học phí. Trân trọng cảm ơn Quý phụ huynh!`;
  }

  if (templateType === "OVERDUE_SINGLE") {
    return `[MS. DUNG SHINY] Kính gửi Phụ huynh ${parentName}! Học phí kỳ ${month} của bé ${childName} (${amount} - ${lessons} buổi) hiện đã quá hạn ngày 10. Kính mời Quý phụ huynh vui lòng thanh toán sớm qua mã VietQR trên Cổng Phụ Huynh để trung tâm quyết toán học phí của lớp. Xin cảm ơn!`;
  }

  if (templateType === "DUE_APPROACHING") {
    return `[MS. DUNG SHINY] Kính gửi Phụ huynh ${parentName}! Học phí kỳ ${month} của bé ${childName} là ${amount} (${lessons} buổi), hạn chót nộp vào ngày ${bill.dueDate}. Quý phụ huynh vui lòng quét mã VietQR để hoàn tất học phí cho con đúng hạn. Chúc con luôn học tập tốt!`;
  }

  // Mặc định: MONTH_START (Nhắc đầu tháng)
  return `[MS. DUNG SHINY] Kính gửi Phụ huynh ${parentName}! Trung tâm xin gửi thông báo học phí kỳ ${month} của bé ${childName}: ${lessons} buổi × ${formatVND(bill.feePerLesson)} = ${amount}. Hạn đóng định kỳ: 01 - 10 hàng tháng. Kính mời Quý phụ huynh mở Cổng Phụ Huynh để quét mã VietQR. Trân trọng cảm ơn!`;
}

