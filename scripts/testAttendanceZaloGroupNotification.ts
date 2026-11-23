import { generateAttendanceGroupReportZaloMessage } from "../src/utils/zaloHelper";
import { DEFAULT_ZALO_MASTER_TEMPLATES } from "../src/data/centerData";

console.log("===============================================================================");
console.log("🚀 KIỂM THỬ TỰ ĐỘNG: TÍNH NĂNG GỬI BÁO CÁO ĐIỂM DANH VÀO NHÓM ZALO LỚP");
console.log("===============================================================================\n");

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ [PASS] ${testName}`);
    if (detail) console.log(`   ${detail}`);
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    if (detail) console.error(`   ${detail}`);
  }
}

// 1. Kiểm tra trường hợp có học sinh vắng
const msgWithAbsent = generateAttendanceGroupReportZaloMessage({
  className: "STARTERS 01",
  classCode: "ST01",
  dateStr: "2026-11-23",
  startTime: "17:30",
  endTime: "19:00",
  classroomName: "Phòng Shiny 101",
  teacherName: "Cô Sarah Johnson",
  assistantName: "Thầy Minh Đức",
  totalStudents: 15,
  presentCount: 13,
  absentStudents: [
    { name: "Trần Minh Quân", code: "ST01-01", note: "Bị sốt nhẹ" },
    { name: "Lê Bảo Ngọc", code: "ST01-05", note: "Về quê cùng gia đình" },
  ],
});

assert(
  msgWithAbsent.includes("STARTERS 01") && msgWithAbsent.includes("ST01"),
  "1. Thông tin Lớp học chính xác",
  "Nội dung chứa tên lớp 'STARTERS 01' và mã lớp 'ST01'"
);

assert(
  msgWithAbsent.includes("23/11/2026"),
  "2. Thông tin Ngày học chính xác",
  "Nội dung chứa ngày học định dạng tiếng Việt: 23/11/2026"
);

assert(
  msgWithAbsent.includes("17:30 - 19:00"),
  "3. Thông tin Ca học chính xác",
  "Nội dung chứa khung giờ ca học: 17:30 - 19:00"
);

assert(
  msgWithAbsent.includes("13 / 15 học sinh") && msgWithAbsent.includes("87%"),
  "4. Số lượng học sinh đi đủ (có mặt) chính xác",
  "Nội dung thể hiện 13 / 15 học sinh (87%)"
);

assert(
  msgWithAbsent.includes("Vắng mặt: 2 học sinh") &&
  msgWithAbsent.includes("Trần Minh Quân (Lý do: Bị sốt nhẹ)") &&
  msgWithAbsent.includes("Lê Bảo Ngọc (Lý do: Về quê cùng gia đình)"),
  "5. Danh sách học sinh vắng kèm họ tên đầy đủ",
  "Liệt kê tên 2 học sinh vắng: Trần Minh Quân và Lê Bảo Ngọc kèm lý do"
);

// 2. Kiểm tra trường hợp đi đủ 100% (không có học sinh vắng)
const msgFullAttendance = generateAttendanceGroupReportZaloMessage({
  className: "MOVERS 02",
  classCode: "MV02",
  dateStr: "2026-11-24",
  startTime: "19:15",
  endTime: "20:45",
  classroomName: "Phòng Shiny 102",
  teacherName: "Thầy David",
  assistantName: "Cô Lan Anh",
  totalStudents: 14,
  presentCount: 14,
  absentStudents: [],
});

assert(
  msgFullAttendance.includes("14 / 14 học sinh (100%)") &&
  msgFullAttendance.includes("Không có học sinh vắng") &&
  msgFullAttendance.includes("100% các con đi học đầy đủ"),
  "6. Xử lý chuẩn xác khi lớp đi học đầy đủ 100%",
  "Báo cáo hiển thị chúc mừng cả lớp đi đủ 100%, không liệt kê vắng"
);

// 3. Kiểm tra mẫu tin nhắn Master Template hệ thống
assert(
  typeof DEFAULT_ZALO_MASTER_TEMPLATES.attendanceGroupReport === "string" &&
  DEFAULT_ZALO_MASTER_TEMPLATES.attendanceGroupReport.includes("{className}") &&
  DEFAULT_ZALO_MASTER_TEMPLATES.attendanceGroupReport.includes("{timeSlot}") &&
  DEFAULT_ZALO_MASTER_TEMPLATES.attendanceGroupReport.includes("{presentCount}") &&
  DEFAULT_ZALO_MASTER_TEMPLATES.attendanceGroupReport.includes("{absentListSection}"),
  "7. Đăng ký Zalo Master Template cho Quản Trị Viên thành công",
  "Cấu hình mẫu tin nhắn tập trung toàn hệ thống đã có 'attendanceGroupReport'"
);

console.log("\n-------------------------------------------------------------------------------");
console.log(`🎉 KẾT QUẢ: ${passedTests}/${totalTests} BÀI KIỂM THỬ ĐẠT CHUẨN!`);
console.log("===============================================================================");

if (passedTests !== totalTests) {
  process.exit(1);
}
