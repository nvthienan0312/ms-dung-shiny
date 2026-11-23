import { UserRole } from "@/types/auth";

/**
 * Chuẩn hóa số điện thoại để so sánh chính xác:
 * Loại bỏ khoảng trắng, dấu chấm, dấu gạch nối, dấu ngoặc
 * Chuyển đổi +84 thành 0
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[\s\.\-\(\)\+]/g, "").trim();
  if (cleaned.startsWith("84")) {
    cleaned = "0" + cleaned.slice(2);
  }
  return cleaned;
}

/**
 * Định dạng số điện thoại đẹp để hiển thị: 0901 234 567
 */
export function formatDisplayPhone(phone: string): string {
  const norm = normalizePhoneNumber(phone);
  if (norm.length === 10) {
    return `${norm.slice(0, 4)} ${norm.slice(4, 7)} ${norm.slice(7)}`;
  }
  return phone;
}

/**
 * Trả về tên hiển thị tiếng Việt của vai trò
 */
export function getRoleName(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "Quản Trị Viên (Admin)";
    case "TEACHER":
      return "Giáo Viên";
    case "ASSISTANT":
      return "Trợ Giảng (TA)";
    case "PARENT":
      return "Phụ Huynh";
    default:
      return role;
  }
}

/**
 * Trả về mã màu đại diện cho vai trò
 */
export function getRoleColorBadge(role: UserRole): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  switch (role) {
    case "ADMIN":
      return {
        bg: "bg-amber-100",
        text: "text-amber-900",
        border: "border-amber-300",
        label: "Quản Trị Viên",
      };
    case "TEACHER":
      return {
        bg: "bg-emerald-100",
        text: "text-emerald-900",
        border: "border-emerald-300",
        label: "Giáo Viên",
      };
    case "ASSISTANT":
      return {
        bg: "bg-blue-100",
        text: "text-blue-900",
        border: "border-blue-300",
        label: "Trợ Giảng",
      };
    case "PARENT":
      return {
        bg: "bg-purple-100",
        text: "text-purple-900",
        border: "border-purple-300",
        label: "Phụ Huynh",
      };
  }
}
