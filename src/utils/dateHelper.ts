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
export const getDayOfWeekLabel = (dateStr: string): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const jsDay = d.getDay();
  if (jsDay === 0) return "Chủ Nhật";
  return `Thứ ${jsDay + 1}`;
};

/**
 * Lấy số thứ tự Thứ trong tuần (2: Thứ 2 ... 8: Chủ Nhật)
 */
export const getDayOfWeekNumber = (dateStr: string): number => {
  if (!dateStr) return 2;
  const d = new Date(dateStr);
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
