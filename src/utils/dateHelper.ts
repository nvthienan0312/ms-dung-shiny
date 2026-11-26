/**
 * dateHelper.ts - Tiện ích quản lý ngày giờ thực tế chuẩn cho hệ thống Ms. Dung Shiny
 */

/**
 * Lấy chuỗi ngày hôm nay theo giờ địa phương (YYYY-MM-DD)
 * Đảm bảo hệ thống luôn tracking ngày thực tế
 */
export const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Định dạng ngày YYYY-MM-DD sang DD/MM/YYYY
 */
export const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

/**
 * Lấy nhãn Thứ trong tuần theo chuẩn Việt Nam (2: Thứ 2 ... 8: Chủ Nhật)
 */
export const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const match = dateStr.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(dateStr);
};

export const getDayOfWeekLabel = (dateStr: string): string => {
  if (!dateStr) return "";
  const d = parseLocalDate(dateStr);
  const jsDay = d.getDay();
  if (jsDay === 0) return "Chủ Nhật";
  return `Thứ ${jsDay + 1}`;
};

/**
 * Lấy số thứ tự Thứ trong tuần (2: Thứ 2 ... 8: Chủ Nhật)
 */
export const getDayOfWeekNumber = (dateStr: string): number => {
  if (!dateStr) return 2;
  const d = parseLocalDate(dateStr);
  const jsDay = d.getDay();
  return jsDay === 0 ? 8 : jsDay + 1;
};

/**
 * Lấy tháng hiện tại (Tháng MM/YYYY)
 */
export const getCurrentBillingMonth = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  return `Tháng ${month}/${year}`;
};

/**
 * Trả về ngày cộng thêm n ngày theo định dạng YYYY-MM-DD (giờ địa phương)
 */
export const addDaysToDateStr = (dateStr: string, days: number): string => {
  const d = parseLocalDate(dateStr || getTodayDateString());
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * Hạn đóng học phí mặc định ngày 10 của kỳ học phí ("10/MM/YYYY")
 */
export const getDefaultTuitionDueDate = (billingMonth: string = getCurrentBillingMonth()): string => {
  const parsed = parseMonthYear(billingMonth);
  if (!parsed) {
    const now = new Date();
    return `10/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
  }
  return `10/${String(parsed.month).padStart(2, "0")}/${parsed.year}`;
};

/**
 * Phân tích chuỗi "Tháng 11/2026" hoặc "11/2026" thành { month, year }
 */
export const parseMonthYear = (monthStr: string): { month: number; year: number } | null => {
  if (!monthStr) return null;
  const match = monthStr.match(/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  const month = parseInt(match[1], 10);
  const year = parseInt(match[2], 10);
  if (Number.isNaN(month) || Number.isNaN(year) || month < 1 || month > 12) return null;
  return { month, year };
};

/**
 * Format tháng năm chuẩn "Tháng MM/YYYY"
 */
export const formatBillingMonth = (month: number, year: number): string => {
  return `Tháng ${String(month).padStart(2, "0")}/${year}`;
};

/**
 * Trả về đúng 2 tháng gần nhất cuốn chiếu cho Bảng lương (VD: tháng 11 -> [Tháng 10/2026, Tháng 11/2026];
 * sang tháng 12 -> [Tháng 11/2026, Tháng 12/2026]; sang tháng 1 -> [Tháng 12/YYYY-1, Tháng 01/YYYY])
 */
export const getRollingTwoSalaryMonths = (refDate: Date = new Date()): [string, string] => {
  const curMonth = refDate.getMonth() + 1;
  const curYear = refDate.getFullYear();
  const prevMonth = curMonth === 1 ? 12 : curMonth - 1;
  const prevYear = curMonth === 1 ? curYear - 1 : curYear;
  return [formatBillingMonth(prevMonth, prevYear), formatBillingMonth(curMonth, curYear)];
};

/**
 * Kiểm tra chuỗi tháng có thuộc cửa sổ 2 tháng lương gần nhất không
 */
export const isWithinRollingTwoMonths = (monthStr: string, refDate: Date = new Date()): boolean => {
  const parsed = parseMonthYear(monthStr);
  if (!parsed) return false;
  const rolling = getRollingTwoSalaryMonths(refDate).map(parseMonthYear);
  return rolling.some((r) => r && r.month === parsed.month && r.year === parsed.year);
};

/**
 * Danh sách kỳ học phí quanh tháng hiện tại (Tháng trước, Hiện tại, Tháng tới)
 */
export const getBillingMonthOptions = (refDate: Date = new Date()): { value: string; label: string }[] => {
  const curMonth = refDate.getMonth() + 1;
  const curYear = refDate.getFullYear();
  const prevMonth = curMonth === 1 ? 12 : curMonth - 1;
  const prevYear = curMonth === 1 ? curYear - 1 : curYear;
  const nextMonth = curMonth === 12 ? 1 : curMonth + 1;
  const nextYear = curMonth === 12 ? curYear + 1 : curYear;
  return [
    { value: formatBillingMonth(curMonth, curYear), label: `${formatBillingMonth(curMonth, curYear)} (Hiện tại - Thu đầu tháng)` },
    { value: formatBillingMonth(nextMonth, nextYear), label: `${formatBillingMonth(nextMonth, nextYear)} (Kỳ tiếp theo)` },
    { value: formatBillingMonth(prevMonth, prevYear), label: `${formatBillingMonth(prevMonth, prevYear)} (Tháng trước)` },
  ];
};

/**
 * Lấy thời gian hiện tại theo định dạng HH:mm (24 giờ)
 */
export const getCurrentTimeHHmm = (): string => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

/**
 * Kiểm tra xem một ngày YYYY-MM-DD có nằm trong quá khứ so với hôm nay không
 */
export const isPastDate = (dateStr: string): boolean => {
  if (!dateStr) return false;
  return dateStr < getTodayDateString();
};

/**
 * Kiểm tra xem thời điểm (ngày + giờ) đã qua so với thời điểm hiện tại chưa
 * @param dateStr "YYYY-MM-DD"
 * @param timeStr "HH:mm" (tuỳ chọn, ví dụ: "18:00")
 */
export const isPastDateTime = (dateStr: string, timeStr?: string): boolean => {
  if (!dateStr) return false;
  const today = getTodayDateString();
  if (dateStr < today) return true;
  if (dateStr > today) return false;

  // Cùng ngày hôm nay -> kiểm tra giờ nếu có
  if (timeStr) {
    const currentHHmm = getCurrentTimeHHmm();
    return timeStr <= currentHHmm;
  }
  return false;
};

/**
 * Kiểm tra xem lớp học bù đã kết thúc / diễn ra trong quá khứ hay chưa
 */
export const isMakeupClassPast = (mc: {
  dateStr: string;
  endTime?: string;
  status?: string;
}): boolean => {
  if (mc.status === "COMPLETED" || mc.status === "CANCELLED") return true;
  return isPastDateTime(mc.dateStr, mc.endTime);
};
