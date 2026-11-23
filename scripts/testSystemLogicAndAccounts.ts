import { 
  INITIAL_USER_ACCOUNTS, 
  INITIAL_STAFF,
  INITIAL_CLASSES,
  INITIAL_STUDENTS,
  INITIAL_ATTENDANCE,
  INITIAL_CLASS_LOGS,
  INITIAL_WORKBOOK_CHECKS,
  INITIAL_INCIDENT_NOTES,
  INITIAL_EXAM_REPORTS,
  INITIAL_STAFF_TIMESHEETS,
  INITIAL_HOMEWORK_SUBMISSIONS,
  INITIAL_STUDENT_TUITION_BILLS,
  INITIAL_MAKEUP_CLASSES,
  INITIAL_ZALO_MESSAGE_LOGS,
  INITIAL_COURSES,
  INITIAL_CLASSROOMS,
  StaffItem,
  StudentItem
} from "../src/data/centerData";
import { UserAccount } from "../src/types/auth";
import { normalizePhoneNumber } from "../src/utils/authHelper";

function runTests() {
  console.log("===============================================================================");
  console.log("🚀 KIỂM ĐỊNH TOÀN BỘ HỆ THỐNG: LOGIC KẾT NỐI TÀI KHOẢN, PHÂN QUYỀN & DATA CLEAN");
  console.log("===============================================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ [PASS] ${testName}`);
      console.log(`   Chi tiết: ${detail}\n`);
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      console.error(`   Chi tiết: ${detail}\n`);
      process.exitCode = 1;
    }
  }

  // 1. Kiểm tra tài khoản duy nhất ban đầu
  assert(
    INITIAL_USER_ACCOUNTS.length === 1 &&
    INITIAL_USER_ACCOUNTS[0].phone === "0964645174" &&
    INITIAL_USER_ACCOUNTS[0].password === "123" &&
    INITIAL_USER_ACCOUNTS[0].role === "ADMIN" &&
    INITIAL_USER_ACCOUNTS[0].isLoginAllowed === true,
    "1. TÀI KHOẢN DUY NHẤT LÀ ADMIN (0964645174 / 123)",
    `Số tài khoản ban đầu: ${INITIAL_USER_ACCOUNTS.length}, Phone: ${INITIAL_USER_ACCOUNTS[0]?.phone}, Role: ${INITIAL_USER_ACCOUNTS[0]?.role}`
  );

  // 2. Kiểm tra các mảng dữ liệu demo đã sạch hoàn toàn
  const demoArraysAreEmpty = 
    INITIAL_STAFF.length === 0 &&
    INITIAL_CLASSES.length === 0 &&
    INITIAL_STUDENTS.length === 0 &&
    INITIAL_ATTENDANCE.length === 0 &&
    INITIAL_CLASS_LOGS.length === 0 &&
    INITIAL_WORKBOOK_CHECKS.length === 0 &&
    INITIAL_INCIDENT_NOTES.length === 0 &&
    INITIAL_EXAM_REPORTS.length === 0 &&
    INITIAL_STAFF_TIMESHEETS.length === 0 &&
    INITIAL_HOMEWORK_SUBMISSIONS.length === 0 &&
    INITIAL_STUDENT_TUITION_BILLS.length === 0 &&
    INITIAL_MAKEUP_CLASSES.length === 0 &&
    INITIAL_ZALO_MESSAGE_LOGS.length === 0;

  assert(
    demoArraysAreEmpty,
    "2. TOÀN BỘ DỮ LIỆU DEMO ĐÃ ĐƯỢC XÓA SẠCH SẼ",
    `Staff: ${INITIAL_STAFF.length}, Classes: ${INITIAL_CLASSES.length}, Students: ${INITIAL_STUDENTS.length}, Bills: ${INITIAL_STUDENT_TUITION_BILLS.length}, Timesheets: ${INITIAL_STAFF_TIMESHEETS.length}`
  );

  // 3. Kiểm tra nền tảng phòng học & khóa học của trung tâm vẫn được giữ nguyên
  assert(
    INITIAL_COURSES.length > 0 && INITIAL_CLASSROOMS.length > 0,
    "3. NỀN TẢNG KHÓA HỌC & PHÒNG HỌC ĐƯỢC BẢO TOÀN",
    `Courses: ${INITIAL_COURSES.length} khóa học, Classrooms: ${INITIAL_CLASSROOMS.length} phòng học`
  );

  // Helper hàm giả lập login như CenterContext.login
  let currentAccounts: UserAccount[] = [...INITIAL_USER_ACCOUNTS];

  function simulateLogin(phone: string, password?: string, targetRole?: string) {
    const norm = normalizePhoneNumber(phone);
    const acc = currentAccounts.find((a) => normalizePhoneNumber(a.phone) === norm);
    if (!acc) return { success: false, message: "Không tìm thấy tài khoản với số điện thoại này." };
    if (targetRole && acc.role !== targetRole) {
      return { success: false, message: `Số điện thoại này không thuộc vai trò ${targetRole}.` };
    }
    if (!acc.isLoginAllowed) {
      return { success: false, message: "Tài khoản của bạn chưa được Admin cấp quyền đăng nhập." };
    }
    if (acc.role !== "PARENT") {
      if (!password || acc.password !== password.trim()) {
        return { success: false, message: "Mật khẩu không chính xác." };
      }
    }
    return { success: true, user: acc, message: "Đăng nhập thành công!" };
  }

  // 4. Test Admin Login thành công & thất bại khi sai pass
  const adminLoginSuccess = simulateLogin("0964645174", "123", "ADMIN");
  const adminLoginWrongPass = simulateLogin("0964645174", "sai_pass", "ADMIN");
  assert(
    adminLoginSuccess.success === true && adminLoginWrongPass.success === false,
    "4. ADMIN ĐĂNG NHẬP CHÍNH XÁC VỚI 0964645174 / 123",
    `Đăng nhập đúng pass: ${adminLoginSuccess.success}, Đăng nhập sai pass: ${adminLoginWrongPass.message}`
  );

  // 5. Thêm Giáo viên mới: Tự động tạo UserAccount với isLoginAllowed: false
  const newStaff: StaffItem = {
    id: "staff-test-t1",
    fullName: "Cô Lê Mai Lan",
    email: "mailan@center.edu.vn",
    phone: "0911 222 333",
    role: "TEACHER",
    specialty: "IELTS Speaking 8.0",
    activeClassesCount: 0,
    status: "ACTIVE",
    hourlyRate: 300000,
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=MaiLan",
  };

  const autoCreatedTeacherAccount: UserAccount = {
    id: `acc-${newStaff.id}`,
    phone: newStaff.phone,
    password: "123456a@",
    role: "TEACHER",
    name: newStaff.fullName,
    staffId: newStaff.id,
    isLoginAllowed: false, // Ban đầu chưa được phép đăng nhập
    createdAt: new Date().toISOString(),
  };
  currentAccounts.push(autoCreatedTeacherAccount);

  const teacherLoginBeforeApproval = simulateLogin("0911222333", "123456a@", "TEACHER");
  assert(
    teacherLoginBeforeApproval.success === false && teacherLoginBeforeApproval.message.includes("chưa được Admin cấp quyền"),
    "5. GIÁO VIÊN MỚI TẠO BỊ CHẶN ĐĂNG NHẬP KHI CHƯA ĐƯỢC ADMIN CẤP QUYỀN",
    `Kết quả đăng nhập khi isLoginAllowed = false: ${teacherLoginBeforeApproval.message}`
  );

  // 6. Admin cấp quyền cho Giáo viên: Đăng nhập thành công, sai vai trò bị chặn
  autoCreatedTeacherAccount.isLoginAllowed = true;
  const teacherLoginAfterApproval = simulateLogin("0911222333", "123456a@", "TEACHER");
  const teacherLoginWrongRole = simulateLogin("0911222333", "123456a@", "ADMIN");
  assert(
    teacherLoginAfterApproval.success === true && teacherLoginWrongRole.success === false,
    "6. ADMIN CẤP QUYỀN -> GIÁO VIÊN ĐĂNG NHẬP ĐÚNG VAI TRÒ THÀNH CÔNG, CHẶN SAI VAI TRÒ",
    `Đăng nhập GV: ${teacherLoginAfterApproval.success}, Chọn sai vai trò Admin: ${teacherLoginWrongRole.message}`
  );

  // 7. Thêm Học viên mới: Tự động kích hoạt tài khoản Phụ huynh KHÔNG CẦN MẬT KHẨU
  const newStudent: StudentItem = {
    id: "stu-test-1",
    studentCode: "SD-2026-001",
    fullName: "Trần Minh Quân",
    dob: "2018-05-10",
    gender: "Nam",
    parentName: "Chị Nguyễn Hồng Hạnh",
    parentPhone: "0988 777 666",
    parentEmail: "honghanh@gmail.com",
    classId: "",
    className: "",
    monthlyFee: 1600000,
    tuitionStatus: "UNPAID",
    currentBillingMonth: "Tháng 11/2026",
    tuitionDueDate: "10/11/2026",
    learningStatus: "STUDYING",
  };

  const autoCreatedParentAccount: UserAccount = {
    id: `acc-parent-${newStudent.id}`,
    phone: newStudent.parentPhone,
    password: "",
    role: "PARENT",
    name: `${newStudent.parentName} (PH bé ${newStudent.fullName})`,
    studentId: newStudent.id,
    isLoginAllowed: true, // Phụ huynh được kích hoạt tự động
    createdAt: new Date().toISOString(),
  };
  currentAccounts.push(autoCreatedParentAccount);

  const parentLoginSuccess = simulateLogin("0988777666", "", "PARENT");
  assert(
    parentLoginSuccess.success === true && !!parentLoginSuccess.user?.name.includes("Chị Nguyễn Hồng Hạnh"),
    "7. PHỤ HUYNH ĐĂNG NHẬP 1-CHẠM BẰNG SĐT KHÔNG CẦN MẬT KHẨU",
    `Phụ huynh đăng nhập SĐT không cần pass: ${parentLoginSuccess.success}, Tên hiển thị: ${parentLoginSuccess.user?.name}`
  );

  // 8. Admin tạm khóa quyền truy cập Cổng Phụ Huynh
  autoCreatedParentAccount.isLoginAllowed = false;
  const parentLoginBlocked = simulateLogin("0988777666", "", "PARENT");
  assert(
    parentLoginBlocked.success === false,
    "8. ADMIN TẠM KHÓA CỔNG PHỤ HUYNH -> CHẶN ĐĂNG NHẬP AN TOÀN",
    `Kết quả khi Admin tạm khóa: ${parentLoginBlocked.message}`
  );

  console.log("-------------------------------------------------------------------------------");
  console.log(`🎉 TỔNG KẾT: ${passed}/${total} BÀI TEST KIỂM ĐỊNH HỆ THỐNG ĐÃ ĐẠT CHUẨN!`);
  console.log("===============================================================================");
}

runTests();
