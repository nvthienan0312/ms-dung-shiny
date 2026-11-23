import { StaffItem, ClassItem } from "../src/data/centerData";
import { UserAccount } from "../src/types/auth";
import { normalizePhoneNumber } from "../src/utils/authHelper";

console.log("=== KIỂM THỬ TÍNH NĂNG BÀN GIAO LỚP GIỮA CÁC NHÂN SỰ ===");

// 1. Tạo mock data
let mockStaff: StaffItem[] = [
  {
    id: "staff-gv-01",
    fullName: "Cô Lê Thị Mai",
    email: "mai.le@center.edu.vn",
    phone: "0912 345 678",
    role: "TEACHER",
    specialty: "IELTS & Ngữ pháp",
    hourlyRate: 250000,
    avatarUrl: "",
    status: "ACTIVE",
    activeClassesCount: 2,
  },
  {
    id: "staff-gv-02",
    fullName: "Thầy Trần Văn Nam",
    email: "nam.tran@center.edu.vn",
    phone: "0987 654 321",
    role: "TEACHER",
    specialty: "Giao tiếp & Phát âm",
    hourlyRate: 250000,
    avatarUrl: "",
    status: "ACTIVE",
    activeClassesCount: 1,
  },
  {
    id: "staff-ta-01",
    fullName: "Bạn Nguyễn Thảo",
    email: "thao.nguyen@center.edu.vn",
    phone: "0901 112 233",
    role: "ASSISTANT",
    specialty: "Trợ giảng",
    hourlyRate: 80000,
    avatarUrl: "",
    status: "ACTIVE",
    activeClassesCount: 2,
  },
  {
    id: "staff-ta-02",
    fullName: "Bạn Phạm Tuấn",
    email: "tuan.pham@center.edu.vn",
    phone: "0902 334 455",
    role: "ASSISTANT",
    specialty: "Trợ giảng",
    hourlyRate: 80000,
    avatarUrl: "",
    status: "ACTIVE",
    activeClassesCount: 1,
  },
];

let mockClasses: any[] = [
  {
    id: "class-01",
    name: "Lớp Starter A",
    code: "ST-01",
    courseId: "course-1",
    teacherId: "staff-gv-01",
    assistantId: "staff-ta-01",
    room: "P101",
    status: "ACTIVE",
    currentStudents: 12,
    maxStudents: 15,
    schedules: [
      { id: "sch-1", dayOfWeek: 2, dayLabel: "Thứ 2", startTime: "18:00", endTime: "19:30", teacherId: "staff-gv-01", assistantId: "staff-ta-01" },
      { id: "sch-2", dayOfWeek: 4, dayLabel: "Thứ 4", startTime: "18:00", endTime: "19:30", teacherId: "staff-gv-01", assistantId: "staff-ta-01" },
    ],
  },
  {
    id: "class-02",
    name: "Lớp Movers B",
    code: "MV-02",
    courseId: "course-2",
    teacherId: "staff-gv-01",
    assistantId: "staff-ta-01",
    room: "P102",
    status: "ACTIVE",
    currentStudents: 10,
    maxStudents: 15,
    schedules: [
      { id: "sch-3", dayOfWeek: 3, dayLabel: "Thứ 3", startTime: "19:30", endTime: "21:00", teacherId: "staff-gv-01", assistantId: "staff-ta-01" },
    ],
  },
  {
    id: "class-03",
    name: "Lớp Flyers C",
    code: "FL-03",
    courseId: "course-3",
    teacherId: "staff-gv-02",
    assistantId: "staff-ta-02",
    room: "P103",
    status: "ACTIVE",
    currentStudents: 8,
    maxStudents: 15,
    schedules: [
      { id: "sch-4", dayOfWeek: 6, dayLabel: "Thứ 7", startTime: "18:00", endTime: "19:30", teacherId: "staff-gv-02", assistantId: "staff-ta-02" },
    ],
  },
];

let mockUserAccounts: any[] = [
  {
    id: "acc-gv-01",
    phone: "0912 345 678",
    name: "Cô Lê Thị Mai",
    role: "TEACHER",
    password: "123",
    staffId: "staff-gv-01",
    isLoginAllowed: true,
  },
  {
    id: "acc-gv-02",
    phone: "0987 654 321",
    name: "Thầy Trần Văn Nam",
    role: "TEACHER",
    password: "123",
    staffId: "staff-gv-02",
    isLoginAllowed: true,
  },
];

// Hàm logic transferStaffClasses
function transferStaffClasses(
  fromStaffId: string,
  toStaffId: string,
  classIds: string[],
  options?: { lockFromStaffLogin?: boolean }
) {
  const fromStaff = mockStaff.find((s) => s.id === fromStaffId);
  const toStaff = mockStaff.find((s) => s.id === toStaffId);

  if (!fromStaff) {
    return { success: false, message: "Không tìm thấy thông tin nhân sự bàn giao." };
  }
  if (!toStaff) {
    return { success: false, message: "Không tìm thấy thông tin nhân sự tiếp nhận bàn giao." };
  }
  if (fromStaff.id === toStaff.id) {
    return { success: false, message: "Nhân sự tiếp nhận phải khác nhân sự bàn giao." };
  }
  if (fromStaff.role !== toStaff.role) {
    return {
      success: false,
      message: `Chỉ có thể bàn giao giữa 2 nhân sự cùng vai trò (cùng là ${fromStaff.role === "TEACHER" ? "Giáo viên" : "Trợ giảng"}).`,
    };
  }
  if (!classIds || classIds.length === 0) {
    return { success: false, message: "Vui lòng chọn ít nhất 1 lớp học để bàn giao." };
  }

  const role = fromStaff.role;

  // Cập nhật các lớp học
  mockClasses = mockClasses.map((c) => {
    if (!classIds.includes(c.id)) return c;

    let updatedClass = { ...c };
    if (role === "TEACHER") {
      if (updatedClass.teacherId === fromStaffId) {
        updatedClass.teacherId = toStaffId;
      }
      if (updatedClass.schedules && updatedClass.schedules.length > 0) {
        updatedClass.schedules = updatedClass.schedules.map((sch: any) =>
          sch.teacherId === fromStaffId ? { ...sch, teacherId: toStaffId } : sch
        );
      }
    } else if (role === "ASSISTANT") {
      if (updatedClass.assistantId === fromStaffId) {
        updatedClass.assistantId = toStaffId;
      }
      if (updatedClass.schedules && updatedClass.schedules.length > 0) {
        updatedClass.schedules = updatedClass.schedules.map((sch: any) =>
          sch.assistantId === fromStaffId ? { ...sch, assistantId: toStaffId } : sch
        );
      }
    }

    return updatedClass;
  });

  // Khóa quyền đăng nhập nếu được yêu cầu
  if (options?.lockFromStaffLogin) {
    mockUserAccounts = mockUserAccounts.map((acc) => {
      const matchStaff =
        acc.staffId === fromStaffId ||
        (acc.role === fromStaff.role && normalizePhoneNumber(acc.phone) === normalizePhoneNumber(fromStaff.phone));
      if (matchStaff) {
        return { ...acc, isLoginAllowed: false };
      }
      return acc;
    });
  }

  const roleName = role === "TEACHER" ? "Giáo viên" : "Trợ giảng";
  const lockNote = options?.lockFromStaffLogin ? " và đã khóa quyền đăng nhập của nhân sự bàn giao" : "";
  return {
    success: true,
    message: `Đã bàn giao thành công ${classIds.length} lớp từ ${roleName} ${fromStaff.fullName} sang ${toStaff.fullName}${lockNote}!`,
  };
}

// Bắt đầu kiểm tra
let passCount = 0;
let totalCount = 0;

function assert(condition: boolean, title: string) {
  totalCount++;
  if (condition) {
    console.log(`  [PASS] ${title}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${title}`);
  }
}

// Test 1: Bàn giao 2 lớp từ Cô Mai (GV) sang Thầy Nam (GV) và khóa tài khoản Cô Mai
console.log("\n1. Test bàn giao Giáo viên & Khóa tài khoản nhân sự nghỉ việc:");
const res1 = transferStaffClasses("staff-gv-01", "staff-gv-02", ["class-01", "class-02"], {
  lockFromStaffLogin: true,
});
assert(res1.success === true, "Kết quả trả về thành công");
assert(mockClasses.find((c) => c.id === "class-01")?.teacherId === "staff-gv-02", "Class 1 teacherId đã đổi thành Thầy Nam");
assert(mockClasses.find((c) => c.id === "class-02")?.teacherId === "staff-gv-02", "Class 2 teacherId đã đổi thành Thầy Nam");
assert(
  mockClasses.find((c) => c.id === "class-01")?.schedules.every((s: any) => s.teacherId === "staff-gv-02") === true,
  "Tất cả ca học trong tuần của Class 1 đã cập nhật giáo viên sang Thầy Nam"
);
assert(
  mockUserAccounts.find((a) => a.staffId === "staff-gv-01")?.isLoginAllowed === false,
  "Tài khoản đăng nhập của Cô Mai đã tự động bị khóa (isLoginAllowed = false)"
);

// Test 2: Bàn giao Trợ giảng từ Bạn Thảo sang Bạn Tuấn
console.log("\n2. Test bàn giao Trợ giảng:");
const res2 = transferStaffClasses("staff-ta-01", "staff-ta-02", ["class-01"]);
assert(res2.success === true, "Bàn giao trợ giảng thành công");
assert(mockClasses.find((c) => c.id === "class-01")?.assistantId === "staff-ta-02", "Class 1 assistantId đã đổi thành Bạn Tuấn");
assert(mockClasses.find((c) => c.id === "class-02")?.assistantId === "staff-ta-01", "Class 2 không được chọn thì giữ nguyên Bạn Thảo");

// Test 3: Chặn bàn giao cọc cạch khác vai trò (Giáo viên bàn giao cho Trợ giảng)
console.log("\n3. Test chặn phân quyền sai vai trò:");
const res3 = transferStaffClasses("staff-gv-02", "staff-ta-02", ["class-01"]);
assert(res3.success === false, "Chặn thành công không cho bàn giao giữa 2 vai trò khác nhau");

// Test 4: Chặn bàn giao khi chưa chọn lớp nào
console.log("\n4. Test kiểm tra rỗng:");
const res4 = transferStaffClasses("staff-gv-02", "staff-gv-01", []);
assert(res4.success === false, "Chặn thành công khi mảng lớp học rỗng");

console.log(`\n=> KẾT QUẢ: Đã pass ${passCount}/${totalCount} bài kiểm tra logic bàn giao lớp!`);
if (passCount !== totalCount) {
  process.exit(1);
}
