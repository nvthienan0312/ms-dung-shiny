export type UserRole = "ADMIN" | "TEACHER" | "ASSISTANT" | "PARENT";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  title?: string;
  phone?: string;
}

export interface UserAccount {
  id: string;
  phone: string; // Số điện thoại chuẩn dùng để đăng nhập
  password?: string; // Mật khẩu (Admin: "123" hoặc mk mới; GV/TA: "123456a@"; PH: rỗng / không mật khẩu)
  role: UserRole;
  name: string;
  staffId?: string; // Liên kết StaffItem
  studentId?: string; // Liên kết StudentItem
  isLoginAllowed: boolean; // Admin phân quyền: true = cho phép đăng nhập, false = khóa / chưa cấp quyền
  createdAt: string;
  lastLoginAt?: string;
  avatarUrl?: string;
}

export const ADMIN_DEFAULT_PHONE = "0964645174";
export const ADMIN_DEFAULT_PASSWORD = "123";
export const STAFF_DEFAULT_PASSWORD = "123456a@";

export const MOCK_USERS: Record<UserRole, CurrentUser> = {
  ADMIN: {
    id: "user-admin-1",
    name: "Ms. Dung (Chủ trung tâm)",
    email: "dung.shiny@center.edu.vn",
    role: "ADMIN",
    title: "Giám đốc Trung tâm / Quản trị viên",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=DungShiny",
    phone: "0964645174",
  },
  TEACHER: {
    id: "user-teacher-default",
    name: "Giáo viên",
    email: "teacher@center.edu.vn",
    role: "TEACHER",
    title: "Giáo viên Tiếng Anh",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Teacher",
    phone: "",
  },
  ASSISTANT: {
    id: "user-ta-default",
    name: "Trợ giảng",
    email: "assistant@center.edu.vn",
    role: "ASSISTANT",
    title: "Trợ giảng Tiếng Anh",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Assistant",
    phone: "",
  },
  PARENT: {
    id: "user-parent-default",
    name: "Phụ huynh",
    email: "parent@center.edu.vn",
    role: "PARENT",
    title: "Phụ huynh Học sinh",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Parent",
    phone: "",
  },
};
